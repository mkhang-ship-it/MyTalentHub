"""NHÀ TRƯỜNG — KPI tổng quan, phân tích năng lực (bản đồ & xếp hạng), báo cáo, lớp & khối, cài đặt quản trị."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    AuthToken,
    Badge,
    ClassGroup,
    Evaluation,
    ROLE_SCHOOL,
    ROLE_STUDENT,
    ROLE_TEACHER,
    Skill,
    Student,
    StudentBadge,
    StudentSkill,
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
    token = _extract_token(authorization)
    row = db.query(AuthToken, User).join(User, User.id == AuthToken.user_id).filter(AuthToken.token == token).first()
    if not row:
        raise HTTPException(401, "Phiên đăng nhập không hợp lệ")
    _auth_token, user = row
    if user.role != ROLE_SCHOOL:
        raise HTTPException(403, "Chỉ nhà trường mới được truy cập")
    return user


def _pct_delta(curr: int, prev: int) -> str:
    if prev <= 0:
        return "mới trong tháng" if curr > 0 else "—"
    pct = round((curr - prev) / prev * 100)
    return f"+{pct}% so với tháng trước" if pct >= 0 else f"{pct}% so với tháng trước"


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    """KPI toàn trường (slide 24): học sinh hoạt động/tháng, tỷ lệ tham gia & hoàn thành."""
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
def talent_analysis(db: Session = Depends(get_db)):
    """Bản đồ năng khiếu + bảng xếp hạng khối (slide 25)."""
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
def analysis(db: Session = Depends(get_db)):
    """Alias for /talent-analysis — slide 25."""
    return talent_analysis(db)


@router.get("/reports")
def reports(
    type: str = "students",
    format: str = "json",
    db: Session = Depends(get_db),
):
    """
    Dữ liệu báo cáo (slide 26).
    type: students|activities|evaluations|badges
    format: json|csv
    """
    if type == "students":
        students = db.query(Student).order_by(Student.grade.asc(), Student.talent_score.desc()).all()
        rows = [
            {
                "id": s.id,
                "full_name": s.user.full_name,
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
def classes(db: Session = Depends(get_db)):
    """Tổng quan khối & lớp (slide 27): GVCN + top 5 lớp xuất sắc + tỷ lệ hoàn thành hoạt động."""
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

    teachers = db.query(Teacher).all()
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