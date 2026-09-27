"""NHÀ TRƯỜNG — KPI tổng quan, phân tích năng lực (bản đồ & xếp hạng), báo cáo, lớp & khối, cài đặt quản trị."""
import csv
import io
import json
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.pagination import MAX_LIMIT
from ..database import get_db
from ..schemas import StudentImportIn
from ..models import (
    Activity,
    ActivityRegistration,
    Badge,
    ClassGroup,
    Coach,
    Evaluation,
    FIELD_ACADEMIC,
    FIELD_ART,
    FIELD_BUSINESS,
    FIELD_CREATIVE,
    FIELD_SPORT,
    FIELD_TECH,
    ROLE_SCHOOL,
    ROLE_STUDENT,
    ROLE_TEACHER,
    Skill,
    Student,
    StudentBadge,
    StudentSkill,
    StudyGroup,
    StudyGroupMember,
    Teacher,
    TeacherClassAssignment,
    User,
)

router = APIRouter(prefix="/school", tags=["school"])


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    return authorization.removeprefix("Bearer ").strip()


def _require_school(authorization: str | None, db: Session) -> User:
    from ..security import resolve_token_user

    token = _extract_token(authorization)
    _auth_token, user = resolve_token_user(db, token)
    if user.role != ROLE_SCHOOL:
        raise HTTPException(403, "Chỉ nhà trường mới được truy cập")
    return user


@router.get("/audit-log")
def audit_log(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
    action: Optional[str] = Query(default=None, max_length=60),
    role: Optional[str] = Query(default=None, max_length=20),
    user_id: Optional[int] = Query(default=None, ge=1),
    since: Optional[str] = Query(default=None, max_length=25),
    until: Optional[str] = Query(default=None, max_length=25),
    limit: int = Query(default=50, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
):
    """Nhật ký thao tác nhạy cảm (slide vận hành).

    Chỉ nhà trường xem được: nhật ký chứa email và IP của người dùng, tức là
    dữ liệu nhạy cảm hơn cả bảng người dùng mà các cổng khác đang giới hạn.

    Lọc theo `action` (tiền tố, ví dụ `auth.` xem mọi sự kiện đăng nhập),
    `role`, `user_id`, và khoảng thời gian `since`/`until` theo ngày
    (định dạng YYYY-MM-DD, khoảng `until` bao trọn cả ngày đó).
    """
    from ..models import AuditLog

    _require_school(authorization, db)
    q = db.query(AuditLog)
    if action:
        # So khớp tiền tố để "auth." ra mọi sự kiện đăng nhập.
        q = q.filter(AuditLog.action.like(f"{action}%"))
    if role:
        q = q.filter(AuditLog.role == role)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if since:
        try:
            q = q.filter(AuditLog.created_at >= datetime.fromisoformat(since))
        except ValueError:
            raise HTTPException(422, "since phải có dạng YYYY-MM-DD")
    if until:
        try:
            d = datetime.fromisoformat(until)
        except ValueError:
            raise HTTPException(422, "until phải có dạng YYYY-MM-DD")
        # +1 ngày rồi dùng "<" để lấy trọn ngày `until`, không cắt mất các sự
        # kiện diễn ra sau 00:00.
        q = q.filter(AuditLog.created_at < d.replace(hour=0, minute=0) + timedelta(days=1))

    total = q.count()
    rows = (
        q.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset).limit(limit).all()
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "action": r.action,
                "user_id": r.user_id,
                "role": r.role,
                "target": (
                    f"{r.target_type}:{r.target_id}"
                    if r.target_type and r.target_id else None
                ),
                "detail": json.loads(r.detail) if r.detail else None,
                "ip": r.ip,
                "request_id": r.request_id,
            }
            for r in rows
        ],
    }


def _pct_delta(curr: int, prev: int) -> str:
    if prev <= 0:
        return "mới trong tháng" if curr > 0 else "—"
    pct = round((curr - prev) / prev * 100)
    return f"+{pct}% so với tháng trước" if pct >= 0 else f"{pct}% so với tháng trước"


@router.get("/overview")
def overview(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """KPI toàn trường (slide 24): học sinh hoạt động/tháng, tỷ lệ tham gia & hoàn thành."""
    _require_school(authorization, db)
    total_students = db.query(Student).count()
    total_hours = db.query(func.coalesce(func.sum(Student.experience_hours), 0)).scalar()
    active_regs = db.query(ActivityRegistration).filter(ActivityRegistration.status == "registered").count()
    checked_in = db.query(func.coalesce(func.sum(ActivityRegistration.hours), 0)).scalar()
    done = db.query(ActivityRegistration).filter(ActivityRegistration.hours >= 1).count()
    participation = round(active_regs / max(total_students, 1) * 100)
    completion = round(done / max(active_regs, 1) * 100) if active_regs else 0

    # phân bố theo lĩnh vực
    fields = (
        db.query(Activity.field, func.count(Activity.id))
        .group_by(Activity.field)
        .all()
    )
    # hoạt động trong tháng hiện tại (start_date "YYYY-MM-DD")
    this_month = datetime.now().strftime("%Y-%m")
    activities_this_month = (
        db.query(Activity).filter(Activity.start_date.like(f"{this_month}%")).count()
    )
    # xu hướng thật: tháng này vs tháng trước (đăng ký / hoàn thành / HS mới / giờ check-in)
    month_expr = func.strftime("%Y-%m", ActivityRegistration.registered_at)
    regs_by_month = {
        m: c
        for m, c in db.query(month_expr, func.count(ActivityRegistration.id))
        .group_by(month_expr)
        .all()
    }
    done_by_month = {
        m: c
        for m, c in db.query(month_expr, func.count(ActivityRegistration.id))
        .filter(ActivityRegistration.hours >= 1)
        .group_by(month_expr)
        .all()
    }
    prev_month = f"{this_month[:4]}-{int(this_month[5:7]) - 1:02d}" if this_month[5:7] != "01" else f"{int(this_month[:4]) - 1}-12"
    regs_delta = _pct_delta(regs_by_month.get(this_month, 0), regs_by_month.get(prev_month, 0))
    done_delta = _pct_delta(done_by_month.get(this_month, 0), done_by_month.get(prev_month, 0))

    # 6 tháng gần nhất: đăng ký (cam) vs hoàn thành (hồng) — slide 24
    monthly = []
    y, m = int(this_month[:4]), int(this_month[5:7])
    for _ in range(6):
        key = f"{y}-{m:02d}"
        monthly.append(
            {
                "month": f"T{m}",
                "key": key,
                "registrations": regs_by_month.get(key, 0),
                "completions": done_by_month.get(key, 0),
            }
        )
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    monthly.reverse()

    return {
        "total_students": total_students,
        "total_hours": float(total_hours),
        "active_registrations": active_regs,
        "participation_pct": participation,
        "completion_pct": completion,
        "activities_per_month": activities_this_month,
        "field_distribution": [{"field": f, "count": c} for f, c in fields],
        "monthly": monthly,
        "trends": {
            "students_delta": f"+{total_students} đang hoạt động",
            "hours_delta": f"{float(checked_in or 0):.0f}h đã ghi nhận",
            "participation_delta": regs_delta,
            "completion_delta": done_delta,
        },
    }


@router.get("/talent-analysis")
def talent_analysis(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Bản đồ năng khiếu + bảng xếp hạng khối (slide 25)."""
    _require_school(authorization, db)
    # điểm TB thật từng kỹ năng từ StudentSkill.level (thang 0-10 → /100)
    skills = db.query(Skill).filter(Skill.is_active.is_(True)).all()
    skill_map = []
    for sk in skills:
        avg = (
            db.query(func.avg(StudentSkill.level))
            .filter(StudentSkill.skill_id == sk.id)
            .scalar()
        )
        skill_map.append(
            {"name": sk.name, "code": sk.code, "avg_score": round((avg or 0) * 10, 1)}
        )

    # xếp hạng khối theo điểm + tổng giờ hoạt động
    grades = db.query(Student.grade).distinct().all()
    grade_rank = []
    for (g,) in grades:
        rows = db.query(Student).filter(Student.grade == g).all()
        avg = round(sum(s.talent_score for s in rows) / len(rows), 1) if rows else 0
        hours = round(sum(s.experience_hours for s in rows), 1)
        grade_rank.append({"grade": g, "avg_score": avg, "count": len(rows), "hours": hours})
    grade_rank.sort(key=lambda x: -x["avg_score"])

    top_students = (
        db.query(Student)
        .order_by(Student.talent_score.desc())
        .limit(10)
        .all()
    )
    return {
        "skill_map": skill_map,
        "grade_ranking": grade_rank,
        "top_students": [
            {"id": s.id, "full_name": s.user.full_name, "class_name": s.class_name, "grade": s.grade, "talent_score": s.talent_score, "hours": s.experience_hours}
            for s in top_students
        ],
    }


@router.get("/analysis")
def analysis(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Alias for /talent-analysis — slide 25."""
    return talent_analysis(authorization, db)


@router.get("/reports")
def reports(
    type: str = "students",
    format: str = "json",
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """
    Dữ liệu báo cáo (slide 26).
    type: students|activities|evaluations|badges
    format: json|csv
    """
    _require_school(authorization, db)
    if type == "students":
        students = db.query(Student).order_by(Student.grade.asc(), Student.talent_score.desc()).all()
        rows = [
            {
                "id": s.id,
                # Hồ sơ mồ côi (thiếu dòng users) không được làm sập cả báo cáo.
                "full_name": s.user.full_name if s.user else "—",
                "class_name": s.class_name,
                "grade": s.grade,
                "talent_score": s.talent_score,
                "experience_hours": s.experience_hours,
            }
            for s in students
        ]
        filename = "bao-cao-hoc-sinh"
    elif type == "activities":
        regs = (
            db.query(
                ActivityRegistration.id,
                ActivityRegistration.student_id,
                ActivityRegistration.activity_id,
                ActivityRegistration.role,
                ActivityRegistration.status,
                ActivityRegistration.hours,
                ActivityRegistration.registered_at,
                Student.class_name,
                Student.grade,
                User.full_name,
                Activity.title.label("activity_title"),
                Activity.field.label("activity_field"),
            )
            .join(Student, ActivityRegistration.student_id == Student.id)
            .join(User, Student.id == User.id)
            .join(Activity, ActivityRegistration.activity_id == Activity.id)
            .all()
        )
        rows = [
            {
                "id": r.id,
                "student_id": r.student_id,
                "full_name": r.full_name,
                "class_name": r.class_name,
                "grade": r.grade,
                "activity_id": r.activity_id,
                "activity_title": r.activity_title,
                "activity_field": r.activity_field,
                "role": r.role,
                "status": r.status,
                "hours": r.hours,
                "registered_at": r.registered_at.strftime("%Y-%m-%d %H:%M") if r.registered_at else "",
            }
            for r in regs
        ]
        filename = "bao-cao-hoat-dong"
    elif type == "evaluations":
        evals = (
            db.query(
                Evaluation.id,
                Evaluation.student_id,
                Evaluation.activity_id,
                Evaluation.chuyen_mon,
                Evaluation.sang_tao,
                Evaluation.lam_viec_nhom,
                Evaluation.ky_luat,
                Evaluation.comment,
                Evaluation.evaluated_at,
                Student.class_name,
                Student.grade,
                User.full_name,
                Activity.title.label("activity_title"),
            )
            .join(Student, Evaluation.student_id == Student.id)
            .join(User, Student.id == User.id)
            .join(Activity, Evaluation.activity_id == Activity.id)
            .all()
        )
        rows = [
            {
                "id": e.id,
                "student_id": e.student_id,
                "full_name": e.full_name,
                "class_name": e.class_name,
                "grade": e.grade,
                "activity_id": e.activity_id,
                "activity_title": e.activity_title,
                "chuyen_mon": e.chuyen_mon,
                "sang_tao": e.sang_tao,
                "lam_viec_nhom": e.lam_viec_nhom,
                "ky_luat": e.ky_luat,
                "total": round(e.chuyen_mon + e.sang_tao + e.lam_viec_nhom + e.ky_luat, 1),
                "comment": e.comment or "",
                "evaluated_at": e.evaluated_at.strftime("%Y-%m-%d %H:%M") if e.evaluated_at else "",
            }
            for e in evals
        ]
        filename = "bao-cao-diem-danh-gia"
    elif type == "badges":
        badges = (
            db.query(
                StudentBadge.id,
                StudentBadge.student_id,
                StudentBadge.badge_id,
                StudentBadge.earned_at,
                Student.class_name,
                Student.grade,
                User.full_name,
                Badge.code.label("badge_code"),
                Badge.name.label("badge_name"),
                Badge.min_hours.label("badge_min_hours"),
            )
            .join(Student, StudentBadge.student_id == Student.id)
            .join(User, Student.id == User.id)
            .join(Badge, StudentBadge.badge_id == Badge.id)
            .all()
        )
        rows = [
            {
                "id": sb.id,
                "student_id": sb.student_id,
                "full_name": sb.full_name,
                "class_name": sb.class_name,
                "grade": sb.grade,
                "badge_id": sb.badge_id,
                "badge_code": sb.badge_code,
                "badge_name": sb.badge_name,
                "badge_min_hours": sb.badge_min_hours,
                "earned_at": sb.earned_at.strftime("%Y-%m-%d %H:%M") if sb.earned_at else "",
            }
            for sb in badges
        ]
        filename = "bao-cao-huy-hieu"
    else:
        rows = []
        filename = "bao-cao"

    if format == "csv":
        from fastapi.responses import StreamingResponse
        import io

        if not rows:
            return StreamingResponse(io.StringIO("\ufeff"), media_type="text/csv")

        header = list(rows[0].keys())
        lines = [",".join(header)]
        for row in rows:
            lines.append(",".join(str(row.get(h, "")) for h in header))
        csv_content = "\ufeff" + "\n".join(lines)
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
        )

    return rows


@router.get("/classes")
def classes(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Tổng quan khối & lớp (slide 27): GVCN + top 5 lớp xuất sắc + tỷ lệ hoàn thành hoạt động."""
    _require_school(authorization, db)
    rows = (
        db.query(Student.class_name, Student.grade, func.count(Student.id), func.avg(Student.talent_score), func.sum(Student.experience_hours))
        .group_by(Student.class_name, Student.grade)
        .all()
    )
    # GVCN thật từ ClassGroup.homeroom_teacher_id
    homerooms: dict[tuple[str, int], str] = {}
    for cg in db.query(ClassGroup).all():
        name = "—"
        if cg.homeroom_teacher_id:
            t = db.query(Teacher).filter(Teacher.id == cg.homeroom_teacher_id).first()
            if t and t.user:
                name = t.user.full_name
        homerooms[(cg.name, cg.grade)] = name

    # Tỷ lệ hoàn thành hoạt động theo lớp
    completion = (
        db.query(
            Student.class_name,
            Student.grade,
            func.count(ActivityRegistration.id).label("total_regs"),
            func.count(ActivityRegistration.id).filter(ActivityRegistration.hours > 0).label("completed_regs"),
        )
        .join(ActivityRegistration, ActivityRegistration.student_id == Student.id)
        .group_by(Student.class_name, Student.grade)
        .all()
    )
    completion_map = {
        (name, grade): (round(completed / total * 100) if total else 0)
        for name, grade, total, completed in completion
    }

    class_list = [
        {
            "name": name,
            "grade": grade,
            "count": cnt,
            "avg_score": round(avg or 0, 1),
            "total_hours": float(hours or 0),
            "homeroom": homerooms.get((name, grade), "—"),
            "completion_rate": completion_map.get((name, grade), 0),
        }
        for name, grade, cnt, avg, hours in rows
    ]
    top_classes = sorted(class_list, key=lambda c: -c["avg_score"])[:5]
    return {
        "grades": sorted({g for _, g, *_ in rows}),
        "classes": class_list,
        "top_classes": top_classes,
    }


# =========================== ENDPOINTS MỚI — CÀI ĐẶT NHÀ TRƯỜNG ===========================

@router.get("/teachers")
def list_teachers(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách giáo viên: id, full_name, subject, is_homeroom (suy ra từ phân công thực tế)."""
    _require_school(authorization, db)
    # Nguồn chân lý duy nhất: ClassGroup.homeroom_teacher_id + TeacherClassAssignment
    assigned_teacher_ids = {
        r[0] for r in db.query(ClassGroup.homeroom_teacher_id)
        .filter(ClassGroup.homeroom_teacher_id.isnot(None)).all()
    }
    # Cũng check TeacherClassAssignment để chắc chắn
    assigned_from_tca = {
        r[0] for r in db.query(TeacherClassAssignment.teacher_id).distinct().all()
    }
    all_assigned_ids = assigned_teacher_ids | assigned_from_tca

    # Chỉ liệt kê GIÁO VIÊN thật. Tài khoản huấn luyện viên có dòng `teachers` ẩn
    # để khớp FK Activity/Evaluation, nên phải lọc theo User.role.
    teachers = (
        db.query(Teacher)
        .join(User, User.id == Teacher.id)
        .filter(User.role == ROLE_TEACHER)
        .all()
    )
    return [
        {
            "id": t.id,
            "full_name": t.user.full_name if t.user else "—",
            "subject": t.subject,
            "is_homeroom": t.id in all_assigned_ids,
        }
        for t in teachers
    ]


@router.get("/class-groups")
def list_class_groups(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách lớp học (ClassGroup thật): id, name, grade, homeroom_teacher_id, homeroom_teacher_name, student_count."""
    _require_school(authorization, db)
    class_groups = db.query(ClassGroup).all()
    result = []
    for cg in class_groups:
        student_count = db.query(Student).filter(Student.class_name == cg.name, Student.grade == cg.grade).count()
        homeroom_name = "—"
        if cg.homeroom_teacher_id:
            t = db.query(Teacher).filter(Teacher.id == cg.homeroom_teacher_id).first()
            if t and t.user:
                homeroom_name = t.user.full_name
        result.append(
            {
                "id": cg.id,
                "name": cg.name,
                "grade": cg.grade,
                "homeroom_teacher_id": cg.homeroom_teacher_id,
                "homeroom_teacher_name": homeroom_name,
                "student_count": student_count,
            }
        )
    return result


@router.post("/class-groups")
def create_class_group(
    payload: dict,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Tạo lớp học mới: {name, grade, homeroom_teacher_id?}. Trùng tên → 409. GV không tồn tại → 400."""
    _require_school(authorization, db)
    name = (payload.get("name") or "").strip()
    grade = payload.get("grade")
    homeroom_teacher_id = payload.get("homeroom_teacher_id")

    if not name:
        raise HTTPException(400, "Tên lớp không được để trống")
    if grade is None:
        raise HTTPException(400, "Khối không được để trống")
    if not isinstance(grade, int) or grade < 1 or grade > 12:
        raise HTTPException(400, "Khối phải là số nguyên từ 1 đến 12")

    # Validate homeroom_teacher_id nếu có
    if homeroom_teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == homeroom_teacher_id).first()
        if not teacher:
            raise HTTPException(400, "Giáo viên chủ nhiệm không tồn tại")

    # Check trùng tên lớp (unique theo name)
    existing = db.query(ClassGroup).filter(ClassGroup.name == name).first()
    if existing:
        raise HTTPException(409, f"Lớp '{name}' đã tồn tại")

    cg = ClassGroup(name=name, grade=grade, homeroom_teacher_id=homeroom_teacher_id)
    db.add(cg)
    db.flush()

    # Tạo TeacherClassAssignment nếu có GVCN
    if homeroom_teacher_id:
        tca = TeacherClassAssignment(teacher_id=homeroom_teacher_id, class_group_id=cg.id)
        db.add(tca)

    db.commit()
    return {"id": cg.id, "name": cg.name, "grade": cg.grade, "homeroom_teacher_id": cg.homeroom_teacher_id}


@router.put("/class-groups/{class_id}")
def update_class_group(
    class_id: int,
    payload: dict,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Cập nhật lớp: {name?, grade?, homeroom_teacher_id?}.
    - Đổi tên/khối → đồng bộ mọi Student có class_name == tên cũ (set class_name + grade mới)
    - Đổi GVCN → cập nhật ClassGroup.homeroom_teacher_id + tạo/cập nhật TeacherClassAssignment
    - homeroom_teacher_id không tồn tại → 400
    """
    _require_school(authorization, db)

    cg = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
    if not cg:
        raise HTTPException(404, "Lớp không tồn tại")

    old_name = cg.name
    old_grade = cg.grade
    new_name = (payload.get("name") or "").strip() if "name" in payload else old_name
    new_grade = payload.get("grade") if "grade" in payload else old_grade
    new_homeroom_teacher_id = payload.get("homeroom_teacher_id") if "homeroom_teacher_id" in payload else cg.homeroom_teacher_id

    if not new_name:
        raise HTTPException(400, "Tên lớp không được để trống")
    if new_grade is not None and (not isinstance(new_grade, int) or new_grade < 1 or new_grade > 12):
        raise HTTPException(400, "Khối phải là số nguyên từ 1 đến 12")

    # Validate homeroom_teacher_id nếu có (không None)
    if new_homeroom_teacher_id is not None:
        teacher = db.query(Teacher).filter(Teacher.id == new_homeroom_teacher_id).first()
        if not teacher:
            raise HTTPException(400, "Giáo viên chủ nhiệm không tồn tại")

    # Check trùng tên (nếu đổi tên)
    if new_name != old_name:
        existing = db.query(ClassGroup).filter(ClassGroup.name == new_name).first()
        if existing:
            raise HTTPException(409, f"Lớp '{new_name}' đã tồn tại")

    # Đồng bộ Student nếu đổi tên hoặc khối
    if new_name != old_name or new_grade != old_grade:
        students = db.query(Student).filter(Student.class_name == old_name, Student.grade == old_grade).all()
        for s in students:
            s.class_name = new_name
            s.grade = new_grade

    # Cập nhật ClassGroup
    cg.name = new_name
    cg.grade = new_grade
    cg.homeroom_teacher_id = new_homeroom_teacher_id

    # Cập nhật TeacherClassAssignment
    # Xoá assignment cũ của lớp này
    db.query(TeacherClassAssignment).filter(TeacherClassAssignment.class_group_id == cg.id).delete()
    # Tạo mới nếu có GVCN
    if new_homeroom_teacher_id:
        tca = TeacherClassAssignment(teacher_id=new_homeroom_teacher_id, class_group_id=cg.id)
        db.add(tca)

    db.commit()
    return {"id": cg.id, "name": cg.name, "grade": cg.grade, "homeroom_teacher_id": cg.homeroom_teacher_id}


@router.delete("/class-groups/{class_id}")
def delete_class_group(
    class_id: int,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Xoá lớp: còn học sinh → 409; không còn → xoá lớp + TeacherClassAssignment liên quan."""
    _require_school(authorization, db)

    cg = db.query(ClassGroup).filter(ClassGroup.id == class_id).first()
    if not cg:
        raise HTTPException(404, "Lớp không tồn tại")

    # Kiểm tra còn học sinh không
    student_count = db.query(Student).filter(Student.class_name == cg.name, Student.grade == cg.grade).count()
    if student_count > 0:
        raise HTTPException(409, f"Lớp còn {student_count} học sinh, không thể xoá")

    # Xoá TeacherClassAssignment liên quan
    db.query(TeacherClassAssignment).filter(TeacherClassAssignment.class_group_id == cg.id).delete()

    # Xoá ClassGroup
    db.delete(cg)
    db.commit()
    return {"ok": True}


# =========================== STUDY GROUPS (G3 — GỘP NHÓM) ===========================

@router.get("/coaches")
def list_coaches(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách huấn luyện viên cho dropdown: id, full_name, specialty, group_count."""
    _require_school(authorization, db)
    coaches = db.query(Coach).join(User, Coach.id == User.id).all()
    result = []
    for c in coaches:
        group_count = db.query(StudyGroup).filter(StudyGroup.coach_id == c.id).count()
        result.append(
            {
                "id": c.id,
                "full_name": c.user.full_name if c.user else "—",
                "specialty": c.specialty,
                "group_count": group_count,
            }
        )
    return result


def _compute_group_stats(db: Session, sg: StudyGroup) -> dict:
    """Tính chỉ số gộp cho một nhóm học tập."""
    members = db.query(StudyGroupMember).filter(StudyGroupMember.group_id == sg.id).all()
    student_ids = [m.student_id for m in members]
    member_count = len(student_ids)
    
    if member_count == 0:
        return {
            "id": sg.id,
            "name": sg.name,
            "field": sg.field,
            "grade": sg.grade,
            "coach_id": sg.coach_id,
            "coach_name": None,
            "member_count": 0,
            "avg_talent_score": 0,
            "total_hours": 0,
            "avg_experience_hours": 0,
            "class_names": [],
        }
    
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    
    talent_scores = [s.talent_score for s in students if s.talent_score is not None]
    avg_talent_score = round(sum(talent_scores) / len(talent_scores), 1) if talent_scores else 0
    
    total_hours = round(sum(s.experience_hours for s in students), 1)
    avg_experience_hours = round(total_hours / member_count, 1)
    
    class_names = sorted(set(s.class_name for s in students if s.class_name))
    
    coach_name = None
    if sg.coach_id:
        coach = db.query(Coach).join(User, Coach.id == User.id).filter(Coach.id == sg.coach_id).first()
        if coach and coach.user:
            coach_name = coach.user.full_name
    
    return {
        "id": sg.id,
        "name": sg.name,
        "field": sg.field,
        "grade": sg.grade,
        "coach_id": sg.coach_id,
        "coach_name": coach_name,
        "member_count": member_count,
        "avg_talent_score": avg_talent_score,
        "total_hours": total_hours,
        "avg_experience_hours": avg_experience_hours,
        "class_names": class_names,
        "member_ids": student_ids,
    }


@router.get("/study-groups")
def list_study_groups(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách nhóm học tập kèm chỉ số gộp."""
    _require_school(authorization, db)
    groups = db.query(StudyGroup).order_by(StudyGroup.name).all()
    return [_compute_group_stats(db, sg) for sg in groups]


@router.post("/study-groups")
def create_study_group(
    payload: dict,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Tạo nhóm học tập: {name, field?, grade?, coach_id?}.
    Tên rỗng → 400. Tên trùng → 409. field sai → 400. grade ngoài 1-12 → 400. coach_id không tồn tại → 400.
    """
    _require_school(authorization, db)
    name = (payload.get("name") or "").strip()
    field = payload.get("field")
    grade = payload.get("grade")
    coach_id = payload.get("coach_id")

    if not name:
        raise HTTPException(400, "Tên nhóm không được để trống")
    
    # Validate field
    valid_fields = [FIELD_ART, FIELD_SPORT, FIELD_BUSINESS, FIELD_TECH, FIELD_ACADEMIC, FIELD_CREATIVE]
    if field is not None and field not in valid_fields:
        raise HTTPException(400, "Lĩnh vực không hợp lệ")
    
    # Validate grade
    if grade is not None and (not isinstance(grade, int) or grade < 1 or grade > 12):
        raise HTTPException(400, "Khối phải là số nguyên từ 1 đến 12")
    
    # Validate coach_id
    if coach_id is not None:
        coach = db.query(Coach).filter(Coach.id == coach_id).first()
        if not coach:
            raise HTTPException(400, "Huấn luyện viên không tồn tại")
    
    # Check trùng tên
    existing = db.query(StudyGroup).filter(StudyGroup.name == name).first()
    if existing:
        raise HTTPException(409, f"Nhóm '{name}' đã tồn tại")
    
    sg = StudyGroup(name=name, field=field, grade=grade, coach_id=coach_id)
    db.add(sg)
    db.commit()
    
    return _compute_group_stats(db, sg)


@router.put("/study-groups/{group_id}")
def update_study_group(
    group_id: int,
    payload: dict,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Cập nhật nhóm học tập: {name?, field?, grade?, coach_id?}.
    Quy tắc validate như POST. Trùng tên với nhóm khác → 409. Không tồn tại → 404.
    """
    _require_school(authorization, db)
    
    sg = db.query(StudyGroup).filter(StudyGroup.id == group_id).first()
    if not sg:
        raise HTTPException(404, "Nhóm học tập không tồn tại")
    
    new_name = (payload.get("name") or "").strip() if "name" in payload else sg.name
    new_field = payload.get("field") if "field" in payload else sg.field
    new_grade = payload.get("grade") if "grade" in payload else sg.grade
    new_coach_id = payload.get("coach_id") if "coach_id" in payload else sg.coach_id
    
    if not new_name:
        raise HTTPException(400, "Tên nhóm không được để trống")
    
    valid_fields = [FIELD_ART, FIELD_SPORT, FIELD_BUSINESS, FIELD_TECH, FIELD_ACADEMIC, FIELD_CREATIVE]
    if new_field is not None and new_field not in valid_fields:
        raise HTTPException(400, "Lĩnh vực không hợp lệ")
    
    if new_grade is not None and (not isinstance(new_grade, int) or new_grade < 1 or new_grade > 12):
        raise HTTPException(400, "Khối phải là số nguyên từ 1 đến 12")
    
    if new_coach_id is not None:
        coach = db.query(Coach).filter(Coach.id == new_coach_id).first()
        if not coach:
            raise HTTPException(400, "Huấn luyện viên không tồn tại")
    
    if new_name != sg.name:
        existing = db.query(StudyGroup).filter(StudyGroup.name == new_name).first()
        if existing:
            raise HTTPException(409, f"Nhóm '{new_name}' đã tồn tại")
    
    sg.name = new_name
    sg.field = new_field
    sg.grade = new_grade
    sg.coach_id = new_coach_id
    
    db.commit()
    return _compute_group_stats(db, sg)


@router.delete("/study-groups/{group_id}")
def delete_study_group(
    group_id: int,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Xoá nhóm học tập + xoá study_group_members của nhóm. Không tồn tại → 404."""
    _require_school(authorization, db)
    
    sg = db.query(StudyGroup).filter(StudyGroup.id == group_id).first()
    if not sg:
        raise HTTPException(404, "Nhóm học tập không tồn tại")
    
    # Xoá members liên quan
    db.query(StudyGroupMember).filter(StudyGroupMember.group_id == sg.id).delete()
    
    # Xoá group
    db.delete(sg)
    db.commit()
    return {"ok": True}


@router.put("/study-groups/{group_id}/members")
def update_study_group_members(
    group_id: int,
    payload: dict,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Gán danh sách học sinh cho nhóm: {student_ids: [1,2,3]} → thay toàn bộ thành viên.
    student_id không tồn tại → 400. Trả về số thành viên mới.
    """
    _require_school(authorization, db)
    
    sg = db.query(StudyGroup).filter(StudyGroup.id == group_id).first()
    if not sg:
        raise HTTPException(404, "Nhóm học tập không tồn tại")
    
    student_ids = payload.get("student_ids")
    if not isinstance(student_ids, list):
        raise HTTPException(400, "student_ids phải là mảng")
    
    # Validate all student_ids exist
    if student_ids:
        existing_students = db.query(Student.id).filter(Student.id.in_(student_ids)).all()
        existing_ids = {s[0] for s in existing_students}
        invalid_ids = set(student_ids) - existing_ids
        if invalid_ids:
            raise HTTPException(400, f"Học sinh không tồn tại: {sorted(invalid_ids)}")
    
    # Xoá members cũ
    db.query(StudyGroupMember).filter(StudyGroupMember.group_id == sg.id).delete()
    
    # Thêm members mới
    for sid in student_ids:
        db.add(StudyGroupMember(group_id=sg.id, student_id=sid))
    
    db.commit()
    
    member_count = len(student_ids)
    return {"member_count": member_count, "student_ids": student_ids}


# ==================== G5 — NHẬP DỮ LIỆU HỌC SINH TỪ CSV ====================
IMPORT_MAX_ROWS = 200        # tối đa 200 dòng dữ liệu (chưa tính dòng tiêu đề)
IMPORT_MAX_BYTES = 256 * 1024  # tối đa 256 KB
IMPORT_REQUIRED_COLS = ("email", "full_name")
IMPORT_OPTIONAL_COLS = ("class_name", "grade", "talent_score", "experience_hours", "interests", "bio")
_IMPORT_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Mật khẩu mặc định cho tài khoản học sinh sinh ra từ CSV.
_IMPORT_DEFAULT_PASSWORD = "demo123"


def _import_password_hash(password: str) -> str:
    """Hash cho tài khoản học sinh sinh ra từ CSV — dùng chung `security.hash_password`.

    (Lô 3 viết lại sha256 tại chỗ để tránh phụ thuộc vòng; nay dùng module dùng
    chung nên import trực tiếp — tài khoản CSV mới nhận hash PBKDF2.)
    """
    from ..security import hash_password

    return hash_password(password)


def _parse_import_csv(content: str) -> tuple[list[str] | None, list[tuple[int, dict[str, str]]]]:
    """Đọc CSV dạng text → (header, [(số_dòng_thực_tế, {cột: giá_thị})]).

    Số dòng đếm theo dòng vật lý trong file (dòng tiêu đề = 1) để báo lỗi đúng dòng.
    """
    reader = csv.reader(io.StringIO(content.lstrip("\ufeff")))
    header: list[str] | None = None
    rows: list[tuple[int, dict[str, str]]] = []
    for raw in reader:
        line = reader.line_num
        if header is None:
            if not any(cell.strip() for cell in raw):
                continue  # bỏ dòng trắng phía trên dòng tiêu đề
            header = [cell.strip().lower().lstrip("\ufeff") for cell in raw]
            continue
        if not any(cell.strip() for cell in raw):
            continue  # bỏ dòng trống giữa file
        row = {
            h: (raw[i].strip() if i < len(raw) else "")
            for i, h in enumerate(header)
            if h
        }
        rows.append((line, row))
    return header, rows


def _validate_import_row(line: int, row: dict[str, str], seen_emails: dict[str, int]) -> tuple[list[dict], str | None, str, dict]:
    """Validate 1 dòng dữ liệu. Trả (errors, email, full_name, values đã parse)."""
    errors: list[dict] = []

    def err(message: str) -> None:
        errors.append({"line": line, "message": message})

    email = (row.get("email") or "").strip().lower()
    full_name = (row.get("full_name") or "").strip()

    if not email:
        err("Thiếu email (cột email không được để trống)")
    elif not _IMPORT_EMAIL_RE.match(email):
        err(f"Email không hợp lệ: {email}")
    elif email in seen_emails:
        err(f"Email trùng với dòng {seen_emails[email]} trong file")

    if not full_name:
        err("Thiếu họ tên (cột full_name không được để trống)")

    values: dict = {}

    grade_raw = (row.get("grade") or "").strip()
    if grade_raw:
        try:
            grade = int(grade_raw)
        except ValueError:
            err(f"Khối không hợp lệ: {grade_raw} (phải là số nguyên 1-12)")
        else:
            if 1 <= grade <= 12:
                values["grade"] = grade
            else:
                err(f"Khối không hợp lệ: {grade_raw} (phải là số nguyên 1-12)")

    talent_raw = (row.get("talent_score") or "").strip()
    if talent_raw:
        try:
            talent = float(talent_raw)
        except ValueError:
            err(f"Điểm năng lực không hợp lệ: {talent_raw} (phải là số từ 0 đến 100)")
        else:
            if 0 <= talent <= 100:
                values["talent_score"] = round(talent, 1)
            else:
                err(f"Điểm năng lực ngoài phạm vi 0-100: {talent_raw}")

    hours_raw = (row.get("experience_hours") or "").strip()
    if hours_raw:
        try:
            hours = float(hours_raw)
        except ValueError:
            err(f"Số giờ trải nghiệm không hợp lệ: {hours_raw} (phải là số >= 0)")
        else:
            if hours >= 0:
                values["experience_hours"] = round(hours, 1)
            else:
                err(f"Số giờ trải nghiệm không được âm: {hours_raw}")

    class_name = (row.get("class_name") or "").strip()
    if class_name:
        values["class_name"] = class_name
    interests = (row.get("interests") or "").strip()
    if interests:
        values["interests"] = interests
    bio = (row.get("bio") or "").strip()
    if bio:
        values["bio"] = bio

    return errors, email, full_name, values


@router.post("/import/students")
def import_students(
    payload: StudentImportIn,
    dry_run: bool = False,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
):
    """Nhập học sinh từ CSV dạng text (G5 — chuyển đổi số, slide 33).

    - Bắt buộc token + role school.
    - `dry_run=true` → chỉ kiểm tra, trả lỗi từng dòng, KHÔNG ghi DB.
    - `dry_run=false` → ghi trong MỘT transaction (atomic): nếu có bất kỳ lỗi
      dòng nào thì không ghi gì cả (created=updated=0, skipped=tổng dòng).
    - Chống trùng theo email: email đã tồn tại → cập nhật hồ sơ (không tạo trùng);
      email mới → tạo User(role=student) + Student. Email trùng NGAY TRONG FILE → lỗi.
    - Trả về: {total, created, updated, skipped, errors: [{line, message}]}.
    """
    _require_school(authorization, db)

    content = payload.content or ""
    if not content.strip():
        raise HTTPException(400, "Nội dung CSV trống — vui lòng dán dữ liệu hoặc tải file mẫu")
    if len(content.encode("utf-8")) > IMPORT_MAX_BYTES:
        raise HTTPException(400, f"File quá lớn (tối đa {IMPORT_MAX_BYTES // 1024} KB)")

    header, rows = _parse_import_csv(content)
    if not header:
        raise HTTPException(400, "Thiếu dòng tiêu đề (header) trong file CSV")
    missing = [c for c in IMPORT_REQUIRED_COLS if c not in header]
    if missing:
        raise HTTPException(400, f"Thiếu cột bắt buộc: {', '.join(missing)}")
    if len(rows) > IMPORT_MAX_ROWS:
        raise HTTPException(400, f"File tối đa {IMPORT_MAX_ROWS} dòng dữ liệu (đang có {len(rows)} dòng)")

    # ---- validate từng dòng (không đụng DB) ----
    errors: list[dict] = []
    seen_emails: dict[str, int] = {}
    plan: list[dict] = []

    all_emails = [
        (row.get("email") or "").strip().lower()
        for _line, row in rows
        if (row.get("email") or "").strip()
    ]
    existing_users: dict[str, User] = {}
    if all_emails:
        existing_users = {
            u.email: u
            for u in db.query(User).filter(User.email.in_(list(set(all_emails)))).all()
        }

    for line, row in rows:
        row_errors, email, full_name, values = _validate_import_row(line, row, seen_emails)
        # Ghi nhận email hợp lệ đầu tiên để phát hiện trùng ngay trong file
        if email and _IMPORT_EMAIL_RE.match(email) and email not in seen_emails:
            seen_emails[email] = line

        user = existing_users.get(email) if email else None
        if user is not None and user.role != ROLE_STUDENT:
            row_errors.append({
                "line": line,
                "message": f"Email đã tồn tại với vai trò khác ({user.role}), không thể cập nhật thành học sinh",
            })
            user = None

        if not row_errors:
            plan.append({
                "line": line,
                "email": email,
                "full_name": full_name,
                "values": values,
                "user": user,
            })

        errors.extend(row_errors)

    will_create = sum(1 for p in plan if p["user"] is None)
    will_update = len(plan) - will_create
    invalid = len(rows) - len(plan)

    # ---- dry-run: chỉ trả kết quả, không ghi DB ----
    if dry_run:
        return {
            "total": len(rows),
            "created": will_create,
            "updated": will_update,
            "skipped": invalid,
            "errors": errors,
        }

    # ---- có lỗi → không ghi gì (atomic) ----
    if errors:
        return {
            "total": len(rows),
            "created": 0,
            "updated": 0,
            "skipped": len(rows),
            "errors": errors,
        }

    # ---- ghi thật: một transaction duy nhất ----
    created = 0
    updated = 0
    try:
        for item in plan:
            values = item["values"]
            if item["user"] is None:
                user = User(
                    role=ROLE_STUDENT,
                    full_name=item["full_name"],
                    email=item["email"],
                    password_hash=_import_password_hash(_IMPORT_DEFAULT_PASSWORD),
                )
                db.add(user)
                db.flush()
                db.add(Student(
                    id=user.id,
                    class_name=values.get("class_name", ""),
                    grade=values.get("grade", 0),
                    talent_score=values.get("talent_score", 0.0),
                    experience_hours=values.get("experience_hours", 0.0),
                    interests=values.get("interests"),
                    bio=values.get("bio"),
                ))
                created += 1
            else:
                user = item["user"]
                user.full_name = item["full_name"]
                student = db.query(Student).filter(Student.id == user.id).first()
                if student is None:
                    student = Student(
                        id=user.id,
                        class_name=values.get("class_name", ""),
                        grade=values.get("grade", 0),
                        talent_score=values.get("talent_score", 0.0),
                        experience_hours=values.get("experience_hours", 0.0),
                        interests=values.get("interests"),
                        bio=values.get("bio"),
                    )
                    db.add(student)
                else:
                    for field, value in values.items():
                        setattr(student, field, value)
                updated += 1
        db.commit()
    except Exception as exc:  # noqa: BLE001 — rollback rồi báo lỗi tiếng Việt
        db.rollback()
        raise HTTPException(500, "Nhập dữ liệu thất bại — toàn bộ thay đổi đã được hoàn tác") from exc

    return {
        "total": len(rows),
        "created": created,
        "updated": updated,
        "skipped": len(rows) - created - updated,
        "errors": [],
    }


@router.get("/import/template")
def import_template(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """File CSV mẫu (1 dòng tiêu đề + 2 dòng ví dụ) để người dùng tải về."""
    _require_school(authorization, db)
    from fastapi.responses import StreamingResponse

    csv_text = (
        "\ufeffemail,full_name,class_name,grade,talent_score,experience_hours,interests,bio\n"
        "hs.mau1@ftalenthub.edu.vn,Nguyễn Văn An,10A1,10,75.5,20,\"IoT, Lập trình, Drone\",\"Học sinh tích cực, thích chế tạo\"\n"
        "hs.mau2@ftalenthub.edu.vn,Trần Thị Bích,11B2,11,82,15,\"Hội họa, Âm nhạc\",\"Thích nghệ thuật và sáng tạo\"\n"
    )
    return StreamingResponse(
        io.StringIO(csv_text),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="mau-nhap-hoc-sinh.csv"'},
    )