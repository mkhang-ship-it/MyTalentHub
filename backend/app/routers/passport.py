"""TALENT PASSPORT — QR định danh, hồ sơ, chứng chỉ, dự án, hoạt động, kỹ năng, CV (slide 19, 32)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    Badge,
    Certificate,
    Project,
    ProjectMember,
    Skill,
    Student,
    StudentBadge,
    StudentSkill,
    TalentPassport,
)

router = APIRouter(prefix="/passport", tags=["passport"])


@router.get("/{student_id}")
def passport(student_id: int, db: Session = Depends(get_db)):
    """Hồ sơ Talent Passport đầy đủ theo QR/tên."""
    p = (
        db.query(TalentPassport)
        .options(selectinload(TalentPassport.student))
        .filter(TalentPassport.student_id == student_id)
        .first()
    )
    if not p:
        raise HTTPException(404, "Chưa có Talent Passport cho học sinh này")

    s = p.student
    items = {
        "qr_code": p.qr_code,
        "updated_at": str(p.updated_at)[:10],
        "student": {
            "id": s.id,
            "full_name": s.user.full_name,
            "class_name": s.class_name,
            "grade": s.grade,
            "avatar_url": s.user.avatar_url,
            "bio": s.bio,
            "interests": s.interests,
            "talent_score": s.talent_score,
            "experience_hours": s.experience_hours,
        },
        "certificates": [
            {"title": c.title, "issuer": c.issuer, "issued_at": c.issued_at}
            for c in db.query(Certificate).filter(Certificate.student_id == s.id).all()
        ],
        "projects": [],
        "activities": [],
        "skills": [],
        "badges": [],
    }

    for pr in (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.student_id == s.id)
        .all()
    ):
        items["projects"].append({"title": pr.title, "field": pr.field, "status": pr.status, "description": pr.description})

    for r, a in (
        db.query(ActivityRegistration, Activity)
        .join(Activity, Activity.id == ActivityRegistration.activity_id)
        .filter(ActivityRegistration.student_id == s.id)
        .all()
    ):
        items["activities"].append({"title": a.title, "field": a.field, "hours": r.hours, "role": r.role})

    for sk, lvl in (
        db.query(Skill, StudentSkill.level)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .filter(StudentSkill.student_id == s.id)
        .all()
    ):
        items["skills"].append({"name": sk.name, "level": lvl})

    for b in (
        db.query(Badge)
        .join(StudentBadge, StudentBadge.badge_id == Badge.id)
        .filter(StudentBadge.student_id == s.id)
        .all()
    ):
        items["badges"].append({"code": b.code, "name": b.name, "icon": b.icon, "color": b.color})

    return items