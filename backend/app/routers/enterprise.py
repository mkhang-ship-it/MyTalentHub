"""DOANH NGHIỆP — tổng quan, tìm nhân tài (filter), tuyển thực tập, tài trợ dự án."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    Enterprise,
    InternshipApplication,
    InternshipPost,
    InterviewInvitation,
    Project,
    ProjectMember,
    Sponsorship,
    Skill,
    Student,
    StudentSkill,
    User,
)
from ..schemas import (
    InternshipPostIn,
    InternshipPostOut,
    InterviewInvitationIn,
    InterviewInvitationOut,
    SponsorshipIn,
    SponsorshipOut,
)

router = APIRouter(prefix="/enterprise", tags=["enterprise"])

# Slide 29: map mã lĩnh vực -> từ khóa tra trong interests (SQLite LIKE
# phân biệt hoa/thường với ký tự có dấu nên liệt kê cả 2 dạng).
FIELD_KEYWORDS: dict[str, list[str]] = {
    "ky_thuat": ["công nghệ", "Công nghệ", "AI", "IoT", "Lập trình", "lập trình", "Robotics", "robotics", "Cơ khí", "cơ khí", "Drone", "drone"],
    "nghe_thuat": ["Âm nhạc", "âm nhạc", "Nghệ thuật", "nghệ thuật", "Mỹ thuật", "mỹ thuật", "Hội họa", "hội họa", "Nhiếp ảnh", "nhiếp ảnh", "Video", "video", "Thiết kế", "thiết kế", "Guitar", "guitar"],
    "kinh_doanh": ["Kinh doanh", "kinh doanh", "Kinh tế", "kinh tế", "Tài chính", "tài chính", "Khởi nghiệp", "khởi nghiệp"],
    "the_thao": ["Thể thao", "thể thao", "Bóng", "bóng"],
    "hoc_thuat": ["Nghiên cứu", "nghiên cứu", "Viết lách", "viết lách", "Học thuật", "học thuật"],
    "sang_tao": ["Sáng tạo", "sáng tạo", "Nội dung", "nội dung", "Thiết kế", "thiết kế"],
}


def _get_enterprise(db: Session, enterprise_id: int | None = None) -> Enterprise:
    if enterprise_id is not None:
        e = db.query(Enterprise).filter(Enterprise.id == enterprise_id).first()
    else:
        e = db.query(Enterprise).first()
    if not e:
        raise HTTPException(404, "Không tìm thấy doanh nghiệp")
    return e


@router.get("/overview")
def overview(enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Tổng quan (slide 28): hồ sơ phù hợp, tin thực tập, ứng viên, tài trợ."""
    e = _get_enterprise(db, enterprise_id)
    posts = db.query(InternshipPost).filter(InternshipPost.enterprise_id == e.id).all()
    post_ids = [p.id for p in posts]
    applicants = 0
    if post_ids:
        applicants = db.query(InternshipApplication).filter(InternshipApplication.post_id.in_(post_ids)).count()
    sponsorships = db.query(Sponsorship).filter(Sponsorship.enterprise_id == e.id).all()
    total_fund = sum(sp.amount for sp in sponsorships if sp.status == "approved")
    matching = db.query(Student).filter(Student.talent_score >= 70).count()
    return {
        "company_name": e.company_name,
        "industry": e.industry,
        "post_count": len(posts),
        "applicant_count": applicants,
        "sponsorship_count": len(sponsorships),
        "total_sponsored": round(total_fund),
        "matching_profiles": matching,
        "recent_posts": [
            {"id": p.id, "title": p.title, "slots": p.slots, "status": p.status, "applicants": db.query(InternshipApplication).filter(InternshipApplication.post_id == p.id).count()}
            for p in posts[:5]
        ],
    }


@router.get("/talents")
def talents(
    q: str | None = None,
    field: str | None = None,
    class_name: str | None = None,
    grade: int | None = None,
    min_score: float | None = None,
    min_technical_score: float | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Tìm kiếm nhân tài (slide 29): filter tên/lớp/khối/điểm năng lực/điểm kỹ thuật + phân trang."""
    query = db.query(Student).join(Student.user).order_by(Student.talent_score.desc())
    if q:
        query = query.filter(
            or_(User.full_name.ilike(f"%{q}%"), Student.interests.ilike(f"%{q}%"))
        )
    if class_name:
        query = query.filter(Student.class_name == class_name)
    if grade:
        query = query.filter(Student.grade == grade)
    if field:
        kws = FIELD_KEYWORDS.get(field, [field])
        query = query.filter(or_(*[Student.interests.ilike(f"%{k}%") for k in kws]))
    if min_score is not None:
        query = query.filter(Student.talent_score >= min_score)

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    # Compute technical_score (avg level of "chuyen_mon" skills) and top_skills for each student
    result = []
    for s in rows:
        # Get all skills for this student
        skills = (
            db.query(StudentSkill, Skill)
            .join(Skill)
            .filter(StudentSkill.student_id == s.id)
            .all()
        )
        # Technical score = average level of "chuyen_mon" category skills
        chuyen_mon_skills = [(ss.level, sk.name) for ss, sk in skills if sk.category == "chuyen_mon"]
        technical_score = round(sum(l for l, _ in chuyen_mon_skills) / len(chuyen_mon_skills), 1) if chuyen_mon_skills else 0.0
        # Top 3 skills by level
        top_skills = sorted([(ss.level, sk.name) for ss, sk in skills], key=lambda x: x[0], reverse=True)[:3]
        top_skill_names = [name for _, name in top_skills]

        if min_technical_score is not None and technical_score < min_technical_score:
            continue

        result.append(
            {
                "id": s.id,
                "full_name": s.user.full_name,
                "class_name": s.class_name,
                "grade": s.grade,
                "talent_score": s.talent_score,
                "technical_score": technical_score,
                "experience_hours": s.experience_hours,
                "interests": s.interests,
                "top_skills": top_skill_names,
                "avatar_url": s.user.avatar_url,
            }
        )
    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/invite", response_model=InterviewInvitationOut)
def invite_student(
    payload: InterviewInvitationIn,
    enterprise_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Gửi lời mời phỏng vấn cho học sinh."""
    e = _get_enterprise(db, enterprise_id)
    # Kiểm tra học sinh tồn tại
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(404, "Không tìm thấy học sinh")
    # Kiểm tra đã mời chưa
    existing = db.query(InterviewInvitation).filter(
        InterviewInvitation.enterprise_id == e.id,
        InterviewInvitation.student_id == payload.student_id,
    ).first()
    if existing:
        raise HTTPException(400, "Đã gửi lời mời cho học sinh này")
    inv = InterviewInvitation(
        enterprise_id=e.id,
        student_id=payload.student_id,
        message=payload.message,
        status="sent",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/internships", response_model=InternshipPostOut)
def create_internship(payload: InternshipPostIn, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    e = _get_enterprise(db, enterprise_id)
    p = InternshipPost(
        enterprise_id=e.id,
        title=payload.title,
        description=payload.description,
        required_skills=payload.required_skills,
        slots=payload.slots,
        deadline=payload.deadline,
        status="open",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return InternshipPostOut(
        id=p.id, enterprise_id=p.enterprise_id, title=p.title,
        description=p.description, required_skills=p.required_skills,
        slots=p.slots, deadline=p.deadline,
        status=p.status, created_at=p.created_at, applicant_count=0,
    )


@router.get("/internships")
def internships(enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Danh sách tin tuyển thực tập (slide 30)."""
    e = _get_enterprise(db, enterprise_id)
    rows = db.query(InternshipPost).filter(InternshipPost.enterprise_id == e.id).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "required_skills": p.required_skills,
            "slots": p.slots,
            "status": p.status,
            "deadline": p.deadline,
            "applicant_count": db.query(InternshipApplication).filter(InternshipApplication.post_id == p.id).count(),
        }
        for p in rows
    ]


@router.get("/internships/{post_id}")
def get_internship(post_id: int, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Chi tiết tin tuyển thực tập."""
    e = _get_enterprise(db, enterprise_id)
    p = db.query(InternshipPost).filter(InternshipPost.id == post_id, InternshipPost.enterprise_id == e.id).first()
    if not p:
        raise HTTPException(404, "Không tìm thấy tin tuyển dụng")
    applicant_count = db.query(InternshipApplication).filter(InternshipApplication.post_id == p.id).count()
    return {
        "id": p.id,
        "title": p.title,
        "description": p.description,
        "required_skills": p.required_skills,
        "slots": p.slots,
        "status": p.status,
        "deadline": p.deadline,
        "created_at": p.created_at,
        "applicant_count": applicant_count,
    }


@router.put("/internships/{post_id}", response_model=InternshipPostOut)
def update_internship(post_id: int, payload: InternshipPostIn, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Cập nhật tin tuyển thực tập."""
    e = _get_enterprise(db, enterprise_id)
    p = db.query(InternshipPost).filter(InternshipPost.id == post_id, InternshipPost.enterprise_id == e.id).first()
    if not p:
        raise HTTPException(404, "Không tìm thấy tin tuyển dụng")
    p.title = payload.title
    p.description = payload.description
    p.required_skills = payload.required_skills
    p.slots = payload.slots
    p.deadline = payload.deadline
    if payload.status is not None:
        p.status = payload.status
    db.commit()
    db.refresh(p)
    applicant_count = db.query(InternshipApplication).filter(InternshipApplication.post_id == p.id).count()
    return InternshipPostOut(
        id=p.id, enterprise_id=p.enterprise_id, title=p.title,
        description=p.description, required_skills=p.required_skills,
        slots=p.slots, deadline=p.deadline,
        status=p.status, created_at=p.created_at, applicant_count=applicant_count,
    )


@router.delete("/internships/{post_id}")
def delete_internship(post_id: int, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Xóa tin tuyển thực tập."""
    e = _get_enterprise(db, enterprise_id)
    p = db.query(InternshipPost).filter(InternshipPost.id == post_id, InternshipPost.enterprise_id == e.id).first()
    if not p:
        raise HTTPException(404, "Không tìm thấy tin tuyển dụng")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.get("/internships/{post_id}/applicants")
def internship_applicants(post_id: int, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Danh sách ứng viên cho một tin tuyển thực tập."""
    e = _get_enterprise(db, enterprise_id)
    p = db.query(InternshipPost).filter(InternshipPost.id == post_id, InternshipPost.enterprise_id == e.id).first()
    if not p:
        raise HTTPException(404, "Không tìm thấy tin tuyển dụng")
    apps = (
        db.query(InternshipApplication, Student, User)
        .join(Student, Student.id == InternshipApplication.student_id)
        .join(User, User.id == Student.id)
        .filter(InternshipApplication.post_id == post_id)
        .all()
    )
    return [
        {
            "application_id": a.id,
            "student_id": s.id,
            "full_name": u.full_name,
            "class_name": s.class_name,
            "grade": s.grade,
            "talent_score": s.talent_score,
            "experience_hours": s.experience_hours,
            "interests": s.interests,
            "avatar_url": u.avatar_url,
            "status": a.status,
            "applied_at": a.applied_at,
        }
        for a, s, u in apps
    ]


@router.get("/projects")
def projects(field: str | None = None, status: str | None = None, db: Session = Depends(get_db)):
    """Danh sách dự án học sinh để doanh nghiệp chọn tài trợ (slide 31). Filter: field, status."""
    query = db.query(Project).order_by(Project.id.desc())
    if field:
        query = query.filter(Project.field == field)
    if status:
        query = query.filter(Project.status == status)
    rows = query.limit(100).all()
    out = []
    for pr in rows:
        owner = db.query(Student).join(Student.user).filter(Student.id == pr.owner_student_id).first()
        members = db.query(ProjectMember).filter(ProjectMember.project_id == pr.id).count()
        funded = (
            db.query(func.coalesce(func.sum(Sponsorship.amount), 0))
            .filter(Sponsorship.project_id == pr.id, Sponsorship.status == "approved")
            .scalar()
            or 0
        )
        out.append(
            {
                "id": pr.id,
                "title": pr.title,
                "field": pr.field,
                "description": pr.description,
                "status": pr.status,
                "owner_name": owner.user.full_name if owner else "—",
                "member_count": members,
                "sponsored_total": round(funded),
                "funding_goal": round(pr.funding_goal),
                "funded_total": round(pr.funded_total),
            }
        )
    return out


@router.get("/sponsorships")
def sponsorships(enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Danh sách tài trợ dự án (slide 31)."""
    e = _get_enterprise(db, enterprise_id)
    rows = (
        db.query(Sponsorship, Project)
        .join(Project, Project.id == Sponsorship.project_id)
        .filter(Sponsorship.enterprise_id == e.id)
        .all()
    )
    return [
        {
            "sponsorship_id": sp.id,
            "project_id": pr.id,
            "project_title": pr.title,
            "field": pr.field,
            "amount": sp.amount,
            "conditions": sp.conditions,
            "status": sp.status,
            "created_at": str(sp.created_at)[:10],
        }
        for sp, pr in rows
    ]


@router.post("/sponsorships", response_model=SponsorshipOut)
def create_sponsorship(payload: SponsorshipIn, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    e = _get_enterprise(db, enterprise_id)
    sp = Sponsorship(enterprise_id=e.id, project_id=payload.project_id, amount=payload.amount, conditions=payload.conditions, status="approved")
    db.add(sp)
    pr = db.query(Project).filter(Project.id == payload.project_id).first()
    if pr:
        pr.funded_total = (pr.funded_total or 0) + payload.amount
        db.add(pr)
    db.commit()
    db.refresh(sp)
    return SponsorshipOut(
        id=sp.id,
        enterprise_id=sp.enterprise_id,
        project_id=sp.project_id,
        amount=sp.amount,
        conditions=sp.conditions,
        status=sp.status,
        created_at=sp.created_at,
        project_title=pr.title if pr else None,
        project_field=pr.field if pr else None,
    )


@router.get("/sponsorships/{sponsorship_id}", response_model=SponsorshipOut)
def get_sponsorship(sponsorship_id: int, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Chi tiết tài trợ."""
    e = _get_enterprise(db, enterprise_id)
    sp = db.query(Sponsorship).filter(Sponsorship.id == sponsorship_id, Sponsorship.enterprise_id == e.id).first()
    if not sp:
        raise HTTPException(404, "Không tìm thấy tài trợ")
    pr = db.query(Project).filter(Project.id == sp.project_id).first()
    return SponsorshipOut(
        id=sp.id,
        enterprise_id=sp.enterprise_id,
        project_id=sp.project_id,
        amount=sp.amount,
        conditions=sp.conditions,
        status=sp.status,
        created_at=sp.created_at,
        project_title=pr.title if pr else None,
        project_field=pr.field if pr else None,
    )


@router.put("/sponsorships/{sponsorship_id}", response_model=SponsorshipOut)
def update_sponsorship(sponsorship_id: int, payload: SponsorshipIn, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Cập nhật tài trợ."""
    e = _get_enterprise(db, enterprise_id)
    sp = db.query(Sponsorship).filter(Sponsorship.id == sponsorship_id, Sponsorship.enterprise_id == e.id).first()
    if not sp:
        raise HTTPException(404, "Không tìm thấy tài trợ")
    # Nếu thay đổi amount, cần điều chỉnh funded_total của project
    old_amount = sp.amount
    sp.project_id = payload.project_id
    sp.amount = payload.amount
    sp.conditions = payload.conditions
    db.commit()
    db.refresh(sp)
    pr = db.query(Project).filter(Project.id == sp.project_id).first()
    if pr:
        pr.funded_total = (pr.funded_total or 0) - old_amount + payload.amount
        db.add(pr)
        db.commit()
    return SponsorshipOut(
        id=sp.id,
        enterprise_id=sp.enterprise_id,
        project_id=sp.project_id,
        amount=sp.amount,
        conditions=sp.conditions,
        status=sp.status,
        created_at=sp.created_at,
        project_title=pr.title if pr else None,
        project_field=pr.field if pr else None,
    )


@router.delete("/sponsorships/{sponsorship_id}")
def delete_sponsorship(sponsorship_id: int, enterprise_id: int | None = None, db: Session = Depends(get_db)):
    """Xóa tài trợ."""
    e = _get_enterprise(db, enterprise_id)
    sp = db.query(Sponsorship).filter(Sponsorship.id == sponsorship_id, Sponsorship.enterprise_id == e.id).first()
    if not sp:
        raise HTTPException(404, "Không tìm thấy tài trợ")
    pr = db.query(Project).filter(Project.id == sp.project_id).first()
    if pr:
        pr.funded_total = (pr.funded_total or 0) - sp.amount
        db.add(pr)
    db.delete(sp)
    db.commit()
    return {"ok": True}