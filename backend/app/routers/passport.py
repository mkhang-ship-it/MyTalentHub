"""TALENT PASSPORT — QR định danh, hồ sơ, chứng chỉ, dự án, hoạt động, kỹ năng, CV (slide 19, 32)."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query
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
from ..security import resolve_token_user

router = APIRouter(prefix="/passport", tags=["passport"])

# Thông điệp chung cho mọi mã sai: không tiết lộ mã nào còn hợp lệ,
# cũng không tiết lộ hồ sơ có tồn tại hay không.
_MA_SAI = "Mã xác minh không đúng. Vui lòng kiểm tra lại mã trên thẻ."


@router.get("/verify")
def verify_public(code: str = Query(default=""), db: Session = Depends(get_db)):
    """Xác minh Talent Passport CÔNG KHAI — không cần token.

    Người quét (giáo viên, doanh nghiệp, nhà trường) thường không đăng nhập,
    nên endpoint này cố ý đứng ngoài mọi kiểm tra Authorization. Đặt TRƯỚC
    route `/{student_id}` để Starlette khớp đúng (route động có tham số int
    sẽ nuốt mất path tĩnh nếu đứng trước).

    RIÊNG TƯ: chỉ trả tên, lớp, khối, tên trường và trạng thái xác minh.
    KHÔNG trả email, điểm năng lực, giờ trải nghiệm, kỹ năng hay huy hiệu.
    Mã sai trả cùng một thông điệp 404, không lộ gì thêm.
    """
    from ..core.qrcheckin import MA_NGUON_RE

    ma = (code or "").strip()
    hop = db.query(TalentPassport).filter(TalentPassport.qr_code == ma).first() if MA_NGUON_RE.match(ma) else None
    if not hop:
        raise HTTPException(404, _MA_SAI)
    s = db.query(Student).filter(Student.id == hop.student_id).first()
    if not s or not s.user:
        raise HTTPException(404, _MA_SAI)
    return {
        "qr_code": hop.qr_code,
        "full_name": s.user.full_name,
        "class_name": s.class_name,
        "grade": s.grade,
        "school_name": "Trường THPT FTI Cần Thơ",
        "verified": True,
        "updated_at": str(hop.updated_at)[:10],
    }


@router.get("/{student_id}")
def passport(student_id: int, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """Hồ sơ Talent Passport đầy đủ theo QR/tên.

    Hồ sơ công khai theo ý tưởng QR — bất kỳ ai ĐÃ ĐĂNG NHẬP cũng xem được,
    nhưng bắt buộc phải có token hợp lệ (chưa hết hạn).
    """
    from ..security import MISSING_MESSAGE

    token = authorization
    if not token or not token.startswith("Bearer "):
        raise HTTPException(401, MISSING_MESSAGE)
    resolve_token_user(db, token.removeprefix("Bearer ").strip())
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