"""
AI Router - /api/v1/ai endpoints
Dynamic AI suggestions for students using Gemini/Anthropic
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from ..database import get_db
from ..models import (
    Student,
    User,
    TalentAssessment,
    Skill,
    StudentSkill,
    Evaluation,
    Activity,
    ActivityRegistration,
    Badge,
    StudentBadge,
    AiSuggestion,
)
from .service import (
    AIService,
    StudentProfile,
    AIAnalysisResult,
    AIRoadmapResult,
    get_ai_service,
    analyze_student_profile,
    generate_student_roadmap,
    chat_with_ai,
)

router = APIRouter(prefix="/ai", tags=["ai"])


# ============================================================
# PYDANTIC MODELS
# ============================================================

class ChatIn(BaseModel):
    message: str
    context: Optional[List[Dict[str, str]]] = None


class ChatOut(BaseModel):
    response: str


class AnalysisOut(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommended_fields: List[str]
    career_suggestions: List[str]
    confidence_score: int


class RoadmapMonth(BaseModel):
    month: int
    title: str
    goal: str
    actions: List[str]
    expected_outcome: str
    suggested_activities: List[str]


class RoadmapOut(BaseModel):
    overall_goal: str
    months: List[RoadmapMonth]
    key_milestones: List[str]


class SaveSuggestionIn(BaseModel):
    kind: str  # "analysis" or "roadmap"
    title: str
    content: str


# ============================================================
# HELPER: Build StudentProfile from DB
# ============================================================

async def build_student_profile(db: Session, student_id: int) -> StudentProfile:
    """Build StudentProfile from database"""
    student = (
        db.query(Student)
        .options(selectinload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )
    if not student:
        raise HTTPException(404, f"Không tìm thấy học sinh #{student_id}")
    
    # Assessments
    assessments = (
        db.query(TalentAssessment)
        .filter(TalentAssessment.student_id == student_id)
        .order_by(TalentAssessment.created_at.desc())
        .all()
    )
    assessments_data = [
        {"test_type": a.test_type, "result": a.result_json, "date": str(a.created_at)[:10]}
        for a in assessments
    ]
    
    # Skills
    skills = (
        db.query(Skill, StudentSkill.level)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .filter(StudentSkill.student_id == student_id, Skill.is_active.is_(True))
        .all()
    )
    skills_data = [
        {"code": sk.code, "name": sk.name, "level": level}
        for sk, level in skills
    ]
    
    # Evaluations
    evals = (
        db.query(Evaluation)
        .filter(Evaluation.student_id == student_id)
        .order_by(Evaluation.evaluated_at.desc())
        .all()
    )
    evals_data = []
    for e in evals:
        activity = db.query(Activity).filter(Activity.id == e.activity_id).first()
        teacher = db.query(User).filter(User.id == e.teacher_id).first()
        total = round(e.chuyen_mon + e.sang_tao + e.lam_viec_nhom + e.ky_luat, 1)
        def _xep_loai(total: float) -> str:
            if total >= 90: return "Xuất sắc"
            if total >= 80: return "Tốt"
            if total >= 70: return "Khá"
            return "Đạt"
        evals_data.append({
            "activity": activity.title if activity else f"Hoạt động #{e.activity_id}",
            "total": total,
            "xep_loai": _xep_loai(total),
            "comment": e.comment or "",
        })
    
    # Activities
    regs = (
        db.query(ActivityRegistration, Activity)
        .join(Activity, Activity.id == ActivityRegistration.activity_id)
        .filter(ActivityRegistration.student_id == student_id)
        .all()
    )
    activities_data = [
        {
            "title": a.title,
            "field": a.field,
            "hours": r.hours,
            "status": r.status,
        }
        for r, a in regs
    ]
    
    # Badges
    badges = (
        db.query(Badge)
        .join(StudentBadge, StudentBadge.badge_id == Badge.id)
        .filter(StudentBadge.student_id == student_id)
        .all()
    )
    badges_data = [
        {"code": b.code, "name": b.name, "icon": b.icon, "color": b.color}
        for b in badges
    ]
    
    return StudentProfile(
        id=student.id,
        full_name=student.user.full_name,
        class_name=student.class_name,
        grade=student.grade,
        talent_score=student.talent_score,
        experience_hours=student.experience_hours,
        interests=student.interests,
        bio=student.bio,
        assessments=assessments_data,
        skills=skills_data,
        evaluations=evals_data,
        activities=activities_data,
        badges=badges_data,
    )


# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/analyze/{student_id}", response_model=AnalysisOut)
async def analyze_student(student_id: int, db: Session = Depends(get_db)):
    """
    Phân tích năng lực học sinh bằng AI (Gemini/Anthropic).
    Trả về: summary, strengths, weaknesses, recommended_fields, career_suggestions, confidence_score.
    """
    profile = await build_student_profile(db, student_id)
    result = await analyze_student_profile(profile)
    
    # Save to DB for history
    db.add(AiSuggestion(
        student_id=student_id,
        kind="analysis",
        title="Phân tích năng lực AI",
        content=result.summary,
    ))
    db.commit()
    
    return AnalysisOut(
        summary=result.summary,
        strengths=result.strengths,
        weaknesses=result.weaknesses,
        recommended_fields=result.recommended_fields,
        career_suggestions=result.career_suggestions,
        confidence_score=result.confidence_score,
    )


@router.post("/roadmap/{student_id}", response_model=RoadmapOut)
async def generate_roadmap(student_id: int, db: Session = Depends(get_db)):
    """
    Tạo lộ trình 3 tháng cá nhân hóa bằng AI.
    Dựa trên phân tích năng lực (sẽ tự gọi analyze nếu chưa có).
    """
    profile = await build_student_profile(db, student_id)
    
    # Get latest analysis or generate new
    latest_analysis = (
        db.query(AiSuggestion)
        .filter(AiSuggestion.student_id == student_id, AiSuggestion.kind == "analysis")
        .order_by(AiSuggestion.id.desc())
        .first()
    )
    
    if latest_analysis:
        analysis = AIAnalysisResult(
            summary=latest_analysis.content,
            strengths=[],  # Will be regenerated
            weaknesses=[],
            recommended_fields=[],
            career_suggestions=[],
            confidence_score=80,
        )
    else:
        analysis = await analyze_student_profile(profile)
    
    roadmap = await generate_student_roadmap(profile, analysis)
    
    # Save roadmap to DB
    for i, month in enumerate(roadmap.months, 1):
        db.add(AiSuggestion(
            student_id=student_id,
            kind="roadmap",
            title=f"Tháng {month['month']}: {month['title']}",
            content=f"Mục tiêu: {month['goal']}\nHành động: {', '.join(month['actions'])}\nKết quả: {month['expected_outcome']}",
        ))
    db.commit()
    
    return RoadmapOut(
        overall_goal=roadmap.overall_goal,
        months=[
            RoadmapMonth(
                month=m["month"],
                title=m["title"],
                goal=m["goal"],
                actions=m["actions"],
                expected_outcome=m["expected_outcome"],
                suggested_activities=m["suggested_activities"],
            )
            for m in roadmap.months
        ],
        key_milestones=roadmap.key_milestones,
    )


@router.post("/chat/{student_id}", response_model=ChatOut)
async def chat_ai(student_id: int, payload: ChatIn, db: Session = Depends(get_db)):
    """
    Trò chuyện với AI về định hướng nghề nghiệp, kỹ năng, hoạt động...
    """
    profile = await build_student_profile(db, student_id)
    response = await chat_with_ai(profile, payload.message, payload.context)
    return ChatOut(response=response)


@router.get("/suggestions/{student_id}")
async def get_suggestions(student_id: int, kind: str = None, db: Session = Depends(get_db)):
    """
    Lấy lịch sử gợi ý AI đã lưu (analysis/roadmap).
    """
    query = db.query(AiSuggestion).filter(AiSuggestion.student_id == student_id)
    if kind:
        query = query.filter(AiSuggestion.kind == kind)
    rows = query.order_by(AiSuggestion.id.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "title": r.title,
            "content": r.content,
            "created_at": str(r.created_at)[:16],
        }
        for r in rows
    ]


@router.post("/suggestions/{student_id}")
async def save_suggestion(student_id: int, payload: SaveSuggestionIn, db: Session = Depends(get_db)):
    """
    Lưu gợi ý AI thủ công (analysis/roadmap).
    """
    db.add(AiSuggestion(
        student_id=student_id,
        kind=payload.kind,
        title=payload.title,
        content=payload.content,
    ))
    db.commit()
    return {"ok": True}


@router.get("/health")
def ai_health(request=None):
    """Kiểm tra trạng thái AI service"""
    service = get_ai_service()
    return {
        "status": "ok",
        "provider": service.provider.value,
        "has_api_key": service.api_key is not None,
        "client_ready": service.client is not None,
    }