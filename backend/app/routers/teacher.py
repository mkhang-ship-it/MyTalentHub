"""GIÁO VIÊN — tổng quan, sân chơi (CRUD), chấm điểm rubric 40/20/20/20, học viên, quản lý lớp."""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    AuthToken,
    ClassGroup,
    Evaluation,
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


def _get_teacher(db: Session, teacher_id: int | None = None) -> Teacher:
    if teacher_id is not None:
        t = (
            db.query(Teacher)
            .options(selectinload(Teacher.user))
            .filter(Teacher.id == teacher_id)
            .first()
        )
    else:
        t = db.query(Teacher).options(selectinload(Teacher.user)).first()
    if not t:
        raise HTTPException(404, "Không tìm thấy giáo viên")
    return t


def _get_teacher_from_token(authorization: str | None, db: Session) -> Teacher:
    """Lấy giáo viên từ Authorization header (bắt buộc token + role teacher)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Thiếu token")
    token = authorization.removeprefix("Bearer ").strip()
    row = (
        db.query(AuthToken, User, Teacher)
        .join(User, User.id == AuthToken.user_id)
        .join(Teacher, Teacher.id == User.id)
        .filter(AuthToken.token == token, User.role == "teacher")
        .first()
    )
    if not row:
        raise HTTPException(403, "Token không hợp lệ hoặc không phải giáo viên")
    _auth_token, _user, teacher = row
    return teacher


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
    """Thông tin giáo viên đang đăng nhập + danh sách khối được phép tạo."""
    teacher = _get_teacher_from_token(authorization, db)
    level = (teacher.education_level or "THPT").upper()
    return {
        "id": teacher.id,
        "full_name": teacher.user.full_name,
        "subject": teacher.subject,
        "education_level": level,
        "allowed_grades": list(_grade_range(level)),
    }


@router.get("/classes", response_model=list[ClassOut])
def list_classes(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Danh sách lớp chủ nhiệm của tôi."""
    teacher = _get_teacher_from_token(authorization, db)
    classes = db.query(ClassGroup).filter(ClassGroup.homeroom_teacher_id == teacher.id).all()
    out = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_name == c.name, Student.grade == c.grade).count()
        out.append(
            ClassOut(
                id=c.id,
                name=c.name,
                grade=c.grade,
                homeroom_teacher_name=teacher.user.full_name,
                student_count=student_count,
            )
        )
    return out


@router.post("/classes", response_model=ClassOut)
def create_class(payload: ClassIn, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Tạo lớp chủ nhiệm mới."""
    teacher = _get_teacher_from_token(authorization, db)
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
    teacher = _get_teacher_from_token(authorization, db)
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
    teacher = _get_teacher_from_token(authorization, db)
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
    teacher = _get_teacher_from_token(authorization, db)
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
    teacher = _get_teacher_from_token(authorization, db)
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
def overview(teacher_id: int | None = None, db: Session = Depends(get_db)):
    """Tổng quan: số sân chơi, học viên, bài chấm, lớp GVCN (slide 20-21)."""
    t = _get_teacher(db, teacher_id)
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
def my_activities(teacher_id: int | None = None, db: Session = Depends(get_db)):
    """Sân chơi của tôi (slide 21)."""
    t = _get_teacher(db, teacher_id)
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
def create_activity(payload: ActivityIn, teacher_id: int | None = None, db: Session = Depends(get_db)):
    t = _get_teacher(db, teacher_id)
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
def activity_students(activity_id: int, db: Session = Depends(get_db)):
    """Danh sách học viên trong 1 sân chơi."""
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
def submit_evaluation(payload: EvaluationIn, teacher_id: int | None = None, db: Session = Depends(get_db)):
    """Chấm điểm rubric (Chuyên môn 40 / Sáng tạo 20 / Làm việc nhóm 20 / Kỷ luật 20)."""
    _validate_rubric(payload)
    t = _get_teacher(db, teacher_id)
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
def my_students(teacher_id: int | None = None, db: Session = Depends(get_db)):
    """Học viên của tôi (slide 23): tổng theo sân chơi, filter tên/lớp."""
    t = _get_teacher(db, teacher_id)
    activity_ids = [a.id for a in db.query(Activity).filter(Activity.teacher_id == t.id)]
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
    return {
        "teacher": {"id": t.id, "full_name": t.user.full_name},
        "total": len(seen),
        "students": list(seen.values()),
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