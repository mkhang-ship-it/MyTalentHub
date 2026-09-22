"""GIÁO VIÊN — tổng quan, sân chơi (CRUD), chấm điểm rubric 40/20/20/20, học viên."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    ClassGroup,
    Evaluation,
    Student,
    StudentBadge,
    Teacher,
    User,
)
from ..schemas import ActivityIn, ActivityOut, EvaluationIn, EvaluationOut

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


@router.post("/evaluations", response_model=EvaluationOut)
def submit_evaluation(payload: EvaluationIn, teacher_id: int | None = None, db: Session = Depends(get_db)):
    """Chấm điểm rubric (Chuyên môn 40 / Sáng tạo 20 / Làm việc nhóm 20 / Kỷ luật 20)."""
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