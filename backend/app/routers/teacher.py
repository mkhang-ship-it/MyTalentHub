"""GIÁO VIÊN — tổng quan, sân chơi (CRUD), chấm điểm rubric 40/20/20/20, học viên, quản lý lớp."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from ..core.pagination import paginate
from ..core.pagination import MAX_LIMIT
from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    ClassGroup,
    Evaluation,
    ROLE_COACH,
    ROLE_TEACHER,
    Student,
    StudentBadge,
    Teacher,
    TeacherClassAssignment,
    User,
)
from ..schemas import (
    ActivityIn,
    ActivityOut,
    ActivityStatusUpdate,
    ActivityUpdate,
    ClassIn,
    ClassOut,
    ClassStudentOut,
    EvaluationIn,
    EvaluationOut,
    TeacherMeOut,
)

router = APIRouter(prefix="/teacher", tags=["teacher"])


def _extract_token(authorization: str | None) -> str:
    """Lấy token từ header Authorization. Không có header → 401 'Thiếu token'."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    return authorization.removeprefix("Bearer ").strip()


def _auth_user_from_token(token: str, db: Session) -> User:
    """Tra token trong DB qua helper dùng chung `security.resolve_token_user`.

    - Token không tồn tại / đã bị xoá → 401 "Phiên đăng nhập không hợp lệ"
    - Token quá hạn (expires_at) → 401 "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
    """
    from ..security import resolve_token_user

    _auth_token, user = resolve_token_user(db, token)
    return user


def _load_teacher_of(user: User, db: Session) -> Teacher:
    teacher = (
        db.query(Teacher)
        .options(selectinload(Teacher.user))
        .filter(Teacher.id == user.id)
        .first()
    )
    if not teacher:
        raise HTTPException(403, "Tài khoản chưa được liên kết với hồ sơ giáo viên")
    return teacher


def _resolve_current_teacher(authorization: str | None, db: Session) -> Teacher:
    """Lấy giáo viên/HLV ĐANG ĐĂNG NHẬP từ token — bắt buộc, KHÔNG fallback.

    Hợp đồng phân quyền (lô 3) + hạn token (lô 4):
    - Thiếu header Authorization → 401 "Thiếu token"
    - Token không tồn tại → 401 "Phiên đăng nhập không hợp lệ"
    - Token quá hạn → 401 "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
    (kiểm tra bằng helper dùng chung `security.resolve_token_user`)
    - Token hợp lệ nhưng sai vai trò → 403 (nêu rõ vai trò được phép: giáo viên hoặc huấn luyện viên)
    - Token hợp lệ, đúng vai trò → trả về Teacher
    """
    user = _auth_user_from_token(_extract_token(authorization), db)
    if user.role not in (ROLE_TEACHER, ROLE_COACH):
        raise HTTPException(
            403,
            "Chức năng này yêu cầu vai trò giáo viên hoặc huấn luyện viên, tài khoản của bạn không đủ quyền",
        )
    return _load_teacher_of(user, db)


def _get_teacher_from_token(authorization: str | None, db: Session) -> Teacher:
    """Lấy giáo viên từ Authorization header (bắt buộc token + role teacher hoặc coach)."""
    return _resolve_current_teacher(authorization, db)


def _get_teacher_from_token_teacher_only(authorization: str | None, db: Session) -> Teacher:
    """Lấy giáo viên từ Authorization header (chỉ role teacher, KHÔNG nhận coach)."""
    user = _auth_user_from_token(_extract_token(authorization), db)
    if user.role != ROLE_TEACHER:
        raise HTTPException(403, "Chức năng này yêu cầu vai trò giáo viên, tài khoản của bạn không đủ quyền")
    return _load_teacher_of(user, db)


def _grade_range(level: str) -> tuple[int, ...]:
    """Trả về tuple các khối hợp lệ theo cấp học."""
    lvl = (level or "THPT").upper()
    if lvl == "THCS":
        return (6, 7, 8, 9)
    if lvl == "THPT":
        return (10, 11, 12)
    if lvl == "CDDH":
        return (1, 2, 3, 4, 5, 6, 7, 8)
    return (10, 11, 12)  # mặc định THPT


def _validate_grade_for_teacher(teacher: Teacher, grade: int) -> None:
    """Kiểm tra khối có nằm trong phạm vi cấp học của giáo viên."""
    level = (teacher.education_level or "THPT").upper()
    valid_grades = _grade_range(level)
    if grade not in valid_grades:
        raise HTTPException(
            422,
            f"Khối {grade} không thuộc cấp học {level} của bạn (phạm vi: {', '.join(map(str, valid_grades))})",
        )


@router.get("/me", response_model=TeacherMeOut)
def me(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Thông tin giáo viên/huấn luyện viên đang đăng nhập + danh sách khối được phép tạo."""
    teacher = _get_teacher_from_token(authorization, db)
    level = (teacher.education_level or "THPT").upper()
    user_role = teacher.user.role
    return {
        "id": teacher.id,
        "full_name": teacher.user.full_name,
        "subject": teacher.subject,
        "education_level": level,
        "allowed_grades": list(_grade_range(level)),
        "role": user_role,
        "is_coach": user_role == "coach",
    }


@router.get("/classes", response_model=list[ClassOut])
def list_classes(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách lớp chủ nhiệm của tôi."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    classes = db.query(ClassGroup).filter(ClassGroup.homeroom_teacher_id == teacher.id).all()
    # Gom đếm học sinh thành MỘT truy vấn GROUP BY (trước đây: 1 query COUNT cho mỗi lớp).
    counts: dict[tuple[str, int], int] = {}
    if classes:
        rows = (
            db.query(Student.class_name, Student.grade, func.count(Student.id))
            .filter(
                Student.class_name.in_([c.name for c in classes]),
                Student.grade.in_([c.grade for c in classes]),
            )
            .group_by(Student.class_name, Student.grade)
            .all()
        )
        counts = {(name, grade): n for name, grade, n in rows}
    return [
        ClassOut(
            id=c.id,
            name=c.name,
            grade=c.grade,
            homeroom_teacher_name=teacher.user.full_name,
            student_count=counts.get((c.name, c.grade), 0),
        )
        for c in classes
    ]


@router.post("/classes", response_model=ClassOut)
def create_class(payload: ClassIn, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Tạo lớp chủ nhiệm mới."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    _validate_grade_for_teacher(teacher, payload.grade)

    name = payload.name.strip()
    if not name:
        raise HTTPException(422, "Tên lớp không được để trống")

    # Kiểm tra trùng tên lớp
    existing = db.query(ClassGroup).filter(ClassGroup.name == name).first()
    if existing:
        raise HTTPException(409, f"Lớp '{name}' đã tồn tại")

    cg = ClassGroup(name=name, grade=payload.grade, homeroom_teacher_id=teacher.id)
    db.add(cg)
    db.flush()
    # Gán quan hệ TeacherClassAssignment
    assignment = TeacherClassAssignment(teacher_id=teacher.id, class_group_id=cg.id)
    db.add(assignment)
    db.commit()
    db.refresh(cg)
    return ClassOut(
        id=cg.id,
        name=cg.name,
        grade=cg.grade,
        homeroom_teacher_name=teacher.user.full_name,
        student_count=0,
    )


@router.put("/classes/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int, payload: ClassIn, authorization: str = Header(default=None), db: Session = Depends(get_db)
):
    """Cập nhật tên/khối lớp chủ nhiệm (đồng bộ Student.class_name + Student.grade)."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    cg = (
        db.query(ClassGroup)
        .filter(ClassGroup.id == class_id, ClassGroup.homeroom_teacher_id == teacher.id)
        .first()
    )
    if not cg:
        raise HTTPException(404, "Không tìm thấy lớp hoặc bạn không phải GVCN của lớp này")

    old_name = cg.name
    old_grade = cg.grade
    new_name = payload.name.strip() if payload.name else cg.name
    new_grade = payload.grade if payload.grade is not None else cg.grade

    if not new_name:
        raise HTTPException(422, "Tên lớp không được để trống")

    if new_name != old_name:
        # Kiểm tra trùng tên với lớp khác
        conflict = db.query(ClassGroup).filter(ClassGroup.name == new_name, ClassGroup.id != class_id).first()
        if conflict:
            raise HTTPException(409, f"Lớp '{new_name}' đã tồn tại")

    if new_grade != cg.grade:
        _validate_grade_for_teacher(teacher, new_grade)

    # Đồng bộ học sinh: chỉ những HS khớp cả tên LÀM khối cũ
    students = db.query(Student).filter(Student.class_name == old_name, Student.grade == old_grade).all()
    for s in students:
        s.class_name = new_name
        s.grade = new_grade

    cg.name = new_name
    cg.grade = new_grade
    db.commit()
    db.refresh(cg)

    student_count = db.query(Student).filter(Student.class_name == cg.name, Student.grade == cg.grade).count()
    return ClassOut(
        id=cg.id,
        name=cg.name,
        grade=cg.grade,
        homeroom_teacher_name=teacher.user.full_name,
        student_count=student_count,
    )


@router.delete("/classes/{class_id}")
def delete_class(class_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Xoá lớp chủ nhiệm (chỉ khi không còn học sinh)."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    cg = (
        db.query(ClassGroup)
        .filter(ClassGroup.id == class_id, ClassGroup.homeroom_teacher_id == teacher.id)
        .first()
    )
    if not cg:
        raise HTTPException(404, "Không tìm thấy lớp hoặc bạn không phải GVCN của lớp này")

    student_count = db.query(Student).filter(Student.class_name == cg.name, Student.grade == cg.grade).count()
    if student_count > 0:
        raise HTTPException(409, f"Lớp còn {student_count} học sinh, vui lòng bỏ lớp học sinh trước.")

    # Xoá TeacherClassAssignment trước
    db.query(TeacherClassAssignment).filter(TeacherClassAssignment.class_group_id == cg.id).delete()
    db.delete(cg)
    db.commit()
    return {"ok": True}


@router.get("/classes/{class_id}/students", response_model=list[ClassStudentOut])
def list_class_students(class_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách học sinh trong lớp chủ nhiệm."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    cg = (
        db.query(ClassGroup)
        .filter(ClassGroup.id == class_id, ClassGroup.homeroom_teacher_id == teacher.id)
        .first()
    )
    if not cg:
        raise HTTPException(404, "Không tìm thấy lớp hoặc bạn không phải GVCN của lớp này")

    students = (
        db.query(Student)
        .options(selectinload(Student.user))
        .filter(Student.class_name == cg.name, Student.grade == cg.grade)
        .all()
    )
    return [
        ClassStudentOut(
            id=s.id,
            full_name=s.user.full_name,
            grade=s.grade,
            class_name=s.class_name,
        )
        for s in students
    ]


@router.post("/classes/{class_id}/students/{student_id}/remove")
def remove_student_from_class(
    class_id: int, student_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)
):
    """Bỏ học sinh khỏi lớp: set class_name = '' (giữ grade)."""
    teacher = _get_teacher_from_token_teacher_only(authorization, db)
    cg = (
        db.query(ClassGroup)
        .filter(ClassGroup.id == class_id, ClassGroup.homeroom_teacher_id == teacher.id)
        .first()
    )
    if not cg:
        raise HTTPException(404, "Không tìm thấy lớp hoặc bạn không phải GVCN của lớp này")

    student = db.query(Student).filter(Student.id == student_id, Student.class_name == cg.name, Student.grade == cg.grade).first()
    if not student:
        raise HTTPException(409, "Học sinh không thuộc lớp này")

    student.class_name = ""
    db.commit()
    return {"ok": True}


@router.get("/overview")
def overview(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Tổng quan: số sân chơi, học viên, bài chấm, lớp GVCN (slide 20-21).

    Bắt buộc Bearer token (role teacher|coach). Tham số query `teacher_id` cũ (nếu client
    còn gửi) bị bỏ qua — danh tính lấy hoàn toàn từ token.
    """
    t = _resolve_current_teacher(authorization, db)
    activities = db.query(Activity).filter(Activity.teacher_id == t.id).all()
    activity_ids = [a.id for a in activities]
    learner_count = 0
    if activity_ids:
        learner_count = (
            db.query(ActivityRegistration)
            .filter(ActivityRegistration.activity_id.in_(activity_ids))
            .count()
        )
    eval_count = db.query(Evaluation).filter(Evaluation.teacher_id == t.id).count()
    homeroom_class = (
        db.query(ClassGroup).filter(ClassGroup.homeroom_teacher_id == t.id).all()
    )
    return {
        "id": t.id,
        "full_name": t.user.full_name,
        "subject": t.subject,
        "education_level": t.education_level,
        "activity_count": len(activities),
        "learner_count": learner_count,
        "eval_count": eval_count,
        "homeroom_classes": [{"id": c.id, "name": c.name, "grade": c.grade} for c in homeroom_class],
        "activities": [
            {
                "id": a.id,
                "title": a.title,
                "field": a.field,
                "capacity": a.capacity,
                "status": a.status,
                "start_date": a.start_date,
            }
            for a in activities
        ],
    }


@router.get("/activities", response_model=list[ActivityOut])
def my_activities(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Sân chơi của tôi (slide 21) — bắt buộc token; `teacher_id` cũ bị bỏ qua."""
    t = _resolve_current_teacher(authorization, db)
    rows = db.query(Activity).filter(Activity.teacher_id == t.id).all()
    out = []
    for a in rows:
        cnt = db.query(ActivityRegistration).filter(ActivityRegistration.activity_id == a.id).count()
        out.append(
            ActivityOut(
                id=a.id,
                title=a.title,
                field=a.field,
                description=a.description,
                capacity=a.capacity,
                start_date=a.start_date,
                end_date=a.end_date,
                teacher_id=a.teacher_id,
                status=a.status,
                registered_count=cnt,
            )
        )
    return out


@router.post("/activities", response_model=ActivityOut)
def create_activity(payload: ActivityIn, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Tạo sân chơi — bắt buộc token; sân chơi luôn thuộc người tạo (lấy từ token)."""
    t = _resolve_current_teacher(authorization, db)
    a = Activity(
        title=payload.title,
        field=payload.field,
        description=payload.description,
        capacity=payload.capacity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        teacher_id=t.id,
        status="open",
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return ActivityOut(
        id=a.id, title=a.title, field=a.field, description=a.description,
        capacity=a.capacity, start_date=a.start_date, end_date=a.end_date,
        teacher_id=a.teacher_id, status=a.status, registered_count=0,
    )


@router.get("/activities/{activity_id}/students")
def activity_students(activity_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách học viên trong 1 sân chơi — CHỈ giáo viên/HLV phụ trách sân chơi đó.

    Sân chơi không tồn tại → 404; tồn tại nhưng không phụ trách → 403.
    """
    t = _resolve_current_teacher(authorization, db)
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(404, "Không tìm thấy sân chơi")
    if activity.teacher_id != t.id:
        raise HTTPException(403, "Bạn không phải người phụ trách sân chơi này nên không thể xem danh sách học viên")
    rows = (
        db.query(ActivityRegistration, Student)
        .join(Student, Student.id == ActivityRegistration.student_id)
        .filter(ActivityRegistration.activity_id == activity_id)
        .all()
    )
    return [
        {
            "registration_id": r.id,
            "student_id": s.id,
            "full_name": s.user.full_name,
            "class_name": s.class_name,
            "hours": r.hours,
            "role": r.role,
        }
        for r, s in rows
    ]


RUBRIC_LIMITS = (
    ("chuyen_mon", 40.0),
    ("sang_tao", 20.0),
    ("lam_viec_nhom", 20.0),
    ("ky_luat", 20.0),
)


def _validate_rubric(payload: "EvaluationIn") -> None:
    """Chặn điểm vượt trần rubric 40/20/20/20 hoặc âm (tránh làm hỏng mọi bảng tổng hợp)."""
    for field, cap in RUBRIC_LIMITS:
        value = getattr(payload, field)
        if value < 0 or value > cap:
            raise HTTPException(422, f"{field} phải nằm trong 0–{cap:g} (rubric 40/20/20/20)")


@router.post("/evaluations", response_model=EvaluationOut)
def submit_evaluation(payload: EvaluationIn, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Chấm điểm rubric (Chuyên môn 40 / Sáng tạo 20 / Làm việc nhóm 20 / Kỷ luật 20).

    Bắt buộc token — người chấm (teacher_id) lấy từ token, không nhận tham số.
    """
    _validate_rubric(payload)
    t = _resolve_current_teacher(authorization, db)
    e = Evaluation(
        activity_id=payload.activity_id,
        student_id=payload.student_id,
        teacher_id=t.id,
        chuyen_mon=payload.chuyen_mon,
        sang_tao=payload.sang_tao,
        lam_viec_nhom=payload.lam_viec_nhom,
        ky_luat=payload.ky_luat,
        comment=payload.comment,
    )
    db.add(e)
    # cập nhật talent_score trung bình theo các đánh giá
    db.commit()
    db.refresh(e)
    stu = db.query(Student).filter(Student.id == payload.student_id).first()
    if stu:
        scores = db.query(Evaluation).filter(Evaluation.student_id == payload.student_id).all()
        stu.talent_score = round(sum(x.total for x in scores) / len(scores), 1) if scores else 0
        db.commit()
    return EvaluationOut(
        id=e.id, teacher_id=e.teacher_id, evaluated_at=e.evaluated_at,
        activity_id=e.activity_id, student_id=e.student_id,
        chuyen_mon=e.chuyen_mon, sang_tao=e.sang_tao,
        lam_viec_nhom=e.lam_viec_nhom, ky_luat=e.ky_luat,
        comment=e.comment, total=e.total,
    )


@router.get("/my-students")
def my_students(
    response: Response,
    authorization: str = Header(default=None),
    limit: int | None = Query(default=None, ge=1),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Học viên của tôi (slide 23): tổng theo sân chơi, filter tên/lớp.

    Bắt buộc token; danh sách chỉ gồm học viên các sân chơi của chính người gọi.
    Phân trang tùy chọn: không truyền `limit` → trả TẤT CẢ (hành vi cũ);
    có `limit` → trả trang + header X-Total-Count / X-Limit (tối đa 200).
    """
    t = _resolve_current_teacher(authorization, db)
    activity_ids = [row[0] for row in db.query(Activity.id).filter(Activity.teacher_id == t.id).all()]
    rows = []
    if activity_ids:
        rows = (
            db.query(ActivityRegistration, Student)
            .join(Student, Student.id == ActivityRegistration.student_id)
            .filter(ActivityRegistration.activity_id.in_(activity_ids))
            .all()
        )
    seen = {}
    for r, s in rows:
        if s.id not in seen:
            seen[s.id] = {
                "student_id": s.id,
                "full_name": s.user.full_name,
                "class_name": s.class_name,
                "hours": 0.0,
                "talent_score": s.talent_score,
                "activity_count": 0,
            }
        seen[s.id]["hours"] += r.hours
        seen[s.id]["activity_count"] += 1
    # Tổng hợp trong Python (mỗi HS gộp nhiều sân chơi) nên cắt trang trên list.
    students, total = paginate(list(seen.values()), limit, offset)
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(min(limit, MAX_LIMIT) if limit else "all")
    return {
        "teacher": {"id": t.id, "full_name": t.user.full_name},
        "total": total,
        "students": students,
    }


# === SÂN CHƠI — CẬP NHẬT / TRẠNG THÁI / XOÁ (bắt buộc token + role teacher) ===
VALID_STATUSES = ("open", "paused", "closed")


def _get_activity_owned(activity_id: int, teacher: Teacher, db: Session) -> Activity:
    a = db.query(Activity).filter(Activity.id == activity_id, Activity.teacher_id == teacher.id).first()
    if not a:
        raise HTTPException(404, "Không tìm thấy sân chơi hoặc bạn không phải người phụ trách")
    return a


@router.put("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: int, payload: ActivityUpdate, authorization: str = Header(default=None), db: Session = Depends(get_db)
):
    """Sửa sân chơi của tôi."""
    teacher = _get_teacher_from_token(authorization, db)
    a = _get_activity_owned(activity_id, teacher, db)

    if payload.title is not None:
        a.title = payload.title
    if payload.field is not None:
        a.field = payload.field
    if payload.description is not None:
        a.description = payload.description
    if payload.capacity is not None:
        a.capacity = payload.capacity
    if payload.start_date is not None:
        a.start_date = payload.start_date
    if payload.end_date is not None:
        a.end_date = payload.end_date
    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(422, f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(VALID_STATUSES)}")
        a.status = payload.status

    db.commit()
    db.refresh(a)
    cnt = db.query(ActivityRegistration).filter(ActivityRegistration.activity_id == a.id).count()
    return ActivityOut(
        id=a.id,
        title=a.title,
        field=a.field,
        description=a.description,
        capacity=a.capacity,
        start_date=a.start_date,
        end_date=a.end_date,
        teacher_id=a.teacher_id,
        status=a.status,
        registered_count=cnt,
    )


@router.put("/activities/{activity_id}/status", response_model=ActivityOut)
def update_activity_status(
    activity_id: int, payload: ActivityStatusUpdate, authorization: str = Header(default=None), db: Session = Depends(get_db)
):
    """Đổi trạng thái sân chơi (open|paused|closed)."""
    teacher = _get_teacher_from_token(authorization, db)
    a = _get_activity_owned(activity_id, teacher, db)

    if payload.status not in VALID_STATUSES:
        raise HTTPException(422, f"Trạng thái không hợp lệ. Chỉ chấp nhận: {', '.join(VALID_STATUSES)}")

    a.status = payload.status
    db.commit()
    db.refresh(a)
    cnt = db.query(ActivityRegistration).filter(ActivityRegistration.activity_id == a.id).count()
    return ActivityOut(
        id=a.id,
        title=a.title,
        field=a.field,
        description=a.description,
        capacity=a.capacity,
        start_date=a.start_date,
        end_date=a.end_date,
        teacher_id=a.teacher_id,
        status=a.status,
        registered_count=cnt,
    )


@router.delete("/activities/{activity_id}")
def delete_activity(activity_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Xoá sân chơi của tôi."""
    teacher = _get_teacher_from_token(authorization, db)
    a = _get_activity_owned(activity_id, teacher, db)
    db.delete(a)
    db.commit()
    return {"ok": True}