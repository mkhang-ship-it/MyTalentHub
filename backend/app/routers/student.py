"""HỌC SINH — dashboard, hồ sơ, khám phá, hoạt động, check-in QR, huy hiệu, lộ trình AI, chứng chỉ, gợi ý nhóm."""
import json
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    Activity,
    ActivityRegistration,
    AiSuggestion,
    Badge,
    Certificate,
    CheckIn,
    Coach,
    Evaluation,
    Project,
    ProjectMember,
    Skill,
    Student,
    StudentBadge,
    StudentSkill,
    TalentAssessment,
    TestQuestion,
    User,
    StudyGroup,
    StudyGroupMember,
)
from ..schemas import ComputeIn, ComputeOut, QuestionOut

router = APIRouter(prefix="/student", tags=["student"])

# ============================================================
# GROUP SUGGESTIONS — hằng số & thuật toán gợi ý nhóm
# ============================================================

FIELD_LABELS_VN: dict[str, str] = {
    "nghe_thuat": "Nghệ thuật",
    "the_thao": "Thể thao",
    "kinh_doanh": "Kinh doanh",
    "ky_thuat": "Kỹ thuật",
    "hoc_thuat": "Học thuật",
    "sang_tao": "Sáng tạo",
}

# Danh mục nhóm mẫu theo field (2-3 nhóm mỗi field)
GROUP_SUGGESTIONS: dict[str, list[str]] = {
    "ky_thuat": ["Maker Space", "IoT Lab", "Drone Lab"],
    "nghe_thuat": ["CLB Âm nhạc", "Đoàn Diễn sinh viên"],
    "kinh_doanh": ["Startup Challenge", "Business Fair"],
    "hoc_thuat": ["CLB Robotics", "Hội thảo khoa học"],
    "the_thao": ["Đội bóng", "CLB chạy bộ"],
    "sang_tao": ["CLB Sáng tạo", "Đội dự án ý tưởng"],
}

def _extract_student_signals(db: Session, s: Student) -> dict:
    """Trích xuất tín hiệu của học sinh để gợi ý nhóm."""
    signals = {
        "top_skills": [],
        "poles": [],
        "field": None,
        "hours": s.experience_hours or 0.0,
    }

    # 1. StudentSkill - lấy top skills theo level
    student_skills = (
        db.query(Skill, StudentSkill.level)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .filter(StudentSkill.student_id == s.id, Skill.is_active.is_(True))
        .order_by(StudentSkill.level.desc())
        .limit(5)
        .all()
    )
    if student_skills:
        signals["top_skills"] = [sk.name for sk, lvl in student_skills if lvl > 0]

    # 2. TalentAssessment - parse result_json lấy poles/holland
    assessments = (
        db.query(TalentAssessment)
        .filter(TalentAssessment.student_id == s.id)
        .order_by(TalentAssessment.id.desc())
        .all()
    )
    for a in assessments:
        try:
            result = json.loads(a.result_json)
            if a.test_type == "holland" and "holland" in result:
                signals["field"] = result["holland"]
            if "poles" in result:
                for pole in result["poles"]:
                    if pole not in signals["poles"]:
                        signals["poles"].append(pole)
        except Exception:
            pass  # dữ liệu cũ có thể không parse được

    # 3. Student.interests - so khớp không phân biệt hoa thường
    if s.interests:
        interests_lower = s.interests.lower()
        # Mapping interests -> field
        interest_field_map = {
            "lập trình": "ky_thuat",
            "python": "ky_thuat",
            "javascript": "ky_thuat",
            "iot": "ky_thuat",
            "drone": "ky_thuat",
            "robot": "ky_thuat",
            "âm nhạc": "nghe_thuat",
            "vẽ": "nghe_thuat",
            "diễn": "nghe_thuat",
            "startup": "kinh_doanh",
            "kinh doanh": "kinh_doanh",
            "toán": "hoc_thuat",
            "khoa học": "hoc_thuat",
            "bóng": "the_thao",
            "chạy": "the_thao",
            "sáng tạo": "sang_tao",
            "ý tưởng": "sang_tao",
        }
        for kw, fld in interest_field_map.items():
            if kw in interests_lower and signals["field"] != fld:
                signals["field"] = fld

    return signals


def _calculate_match_pct(signals: dict, group_name: str, group_field: str) -> tuple[int, str]:
    """Tính match_pct và lý do why từ tín hiệu học sinh và nhóm."""
    score = 0
    reasons = []

    # 1. Khớp field chính (+40 điểm)
    if signals["field"] == group_field:
        score += 40
        reasons.append(f"quan tâm {FIELD_LABELS_VN.get(group_field, group_field)}")

    # 2. Khớp poles (từ Holland/MI) (+20 điểm)
    if group_field in signals["poles"]:
        score += 20
        reasons.append(f"xu hướng {FIELD_LABELS_VN.get(group_field, group_field)}")

    # 3. Khớp top_skills (+20 điểm)
    skill_field_map = {
        "Lập trình": "ky_thuat",
        "Python": "ky_thuat",
        "IoT": "ky_thuat",
        "Drone": "ky_thuat",
        "Robot": "ky_thuat",
        "Âm nhạc": "nghe_thuat",
        "Vẽ": "nghe_thuat",
        "Diễn": "nghe_thuat",
        "Startup": "kinh_doanh",
        "Kinh doanh": "kinh_doanh",
        "Toán": "hoc_thuat",
        "Khoa học": "hoc_thuat",
        "Bóng đá": "the_thao",
        "Chạy bộ": "the_thao",
        "Sáng tạo": "sang_tao",
        "Ý tưởng": "sang_tao",
    }
    for skill in signals["top_skills"]:
        if skill in skill_field_map and skill_field_map[skill] == group_field:
            score += 20
            reasons.append(f"mạnh {skill}")

    # 4. Experience hours (+10 điểm nếu > 10h)
    if signals["hours"] >= 10:
        score += 10
        reasons.append(f"đã tích lũy {signals['hours']:.0f}h trải nghiệm")

    # Giới hạn 0-100
    match_pct = min(100, max(0, score))

    # Tạo lý do why
    why = "Bạn phù hợp với nhóm này"
    if reasons:
        why = "Bạn " + ", ".join(reasons[:3]) + ("..." if len(reasons) > 3 else "")

    return match_pct, why


@router.get("/recommendations")
def recommendations(student_id: int = 1, db: Session = Depends(get_db)):
    """Gợi ý nhóm học tập cho học sinh (slide 5)."""
    s = _get_student(db, student_id)
    signals = _extract_student_signals(db, s)

    # Lấy danh sách nhóm thực tế từ DB
    real_groups = db.query(StudyGroup).all()
    real_group_names = {g.name for g in real_groups}
    real_group_members = {
        g.name: db.query(StudyGroupMember).filter(StudyGroupMember.group_id == g.id).count()
        for g in real_groups
    }
    real_group_field = {g.name: g.field for g in real_groups}

    # Lấy nhóm đã tham gia của học sinh
    my_group_ids = {
        m.group_id
        for m in db.query(StudyGroupMember).filter(StudyGroupMember.student_id == s.id).all()
    }
    my_group_names = {g.name for g in real_groups if g.id in my_group_ids}

    # Tạo danh sách gợi ý từ GROUP_SUGGESTIONS
    suggestions = []
    for field, group_names in GROUP_SUGGESTIONS.items():
        for name in group_names:
            match_pct, why = _calculate_match_pct(signals, name, field)
            if match_pct < 30:
                continue

            existing = name in real_group_names
            members = real_group_members.get(name, 0) if existing else 0
            joined = name in my_group_names

            suggestions.append({
                "name": name,
                "field": field,
                "why": why,
                "match_pct": match_pct,
                "members": members,
                "existing": existing,
                "joined": joined,
            })

    # Sắp xếp giảm dần match_pct, lấy tối đa 6
    suggestions.sort(key=lambda x: x["match_pct"], reverse=True)
    suggestions = suggestions[:6]

    # Tạo my_groups nếu có
    my_groups = []
    for name in my_group_names:
        g = next((g for g in real_groups if g.name == name), None)
        if g:
            my_groups.append({
                "name": g.name,
                "field": g.field,
                "members": db.query(StudyGroupMember).filter(StudyGroupMember.group_id == g.id).count(),
            })

    based_on = {
        "top_skills": signals["top_skills"],
        "poles": signals["poles"],
        "field": signals["field"],
        "hours": signals["hours"],
    }

    return {
        "based_on": based_on,
        "suggestions": suggestions,
        "my_groups": my_groups,
    }


class CertificateCreate(BaseModel):
    title: str
    issuer: str | None = None
    issued_at: str | None = None


class CertificateUpdate(BaseModel):
    title: str | None = None
    issuer: str | None = None
    issued_at: str | None = None


def _validate_certificate_title(title: str | None) -> str:
    if title is None:
        raise HTTPException(422, "Tên chứng chỉ không được rỗng")
    stripped = title.strip()
    if not stripped:
        raise HTTPException(422, "Tên chứng chỉ không được rỗng")
    return stripped


def _get_student(db: Session, student_id: int) -> Student:
    s = (
        db.query(Student)
        .options(selectinload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )
    if not s:
        raise HTTPException(404, f"Không tìm thấy học sinh #{student_id}")
    return s


def _student_payload(s: Student, db: Session) -> dict:
    badges = (
        db.query(Badge)
        .join(StudentBadge, StudentBadge.badge_id == Badge.id)
        .filter(StudentBadge.student_id == s.id)
        .all()
    )
    skills = (
        db.query(Skill, StudentSkill.level)
        .join(StudentSkill, StudentSkill.skill_id == Skill.id)
        .filter(StudentSkill.student_id == s.id, Skill.is_active.is_(True))
        .all()
    )
    evals = db.query(Evaluation).filter(Evaluation.student_id == s.id).all()
    certs = db.query(Certificate).filter(Certificate.student_id == s.id).all()
    owned = db.query(Project).filter(Project.owner_student_id == s.id).all()
    member_ids = {
        r[0]
        for r in db.query(ProjectMember.project_id)
        .filter(ProjectMember.student_id == s.id)
        .all()
    }
    membered = (
        db.query(Project)
        .filter(Project.id.in_(member_ids - {p.id for p in owned}))
        .all()
        if member_ids
        else []
    )
    return {
        "id": s.id,
        "full_name": s.user.full_name,
        "class_name": s.class_name,
        "grade": s.grade,
        "education_level": s.education_level,
        "talent_score": s.talent_score,
        "experience_hours": s.experience_hours,
        "interests": s.interests,
        "bio": s.bio,
        "avatar_url": s.user.avatar_url,
        "badges": [{"code": b.code, "name": b.name, "icon": b.icon, "color": b.color} for b in badges],
        "skills": [
            {"code": sk.code, "name": sk.name, "level": level} for sk, level in skills
        ],
        "evaluation_count": len(evals),
        "certificates": [
            {"id": c.id, "title": c.title, "issuer": c.issuer, "issued_at": c.issued_at} for c in certs
        ],
        "projects": [
            {"id": p.id, "title": p.title, "field": p.field, "status": p.status, "role": "owner"}
            for p in owned
        ]
        + [
            {"id": p.id, "title": p.title, "field": p.field, "status": p.status, "role": "member"}
            for p in membered
        ],
    }


# ---------- CHỨNG CHỈ CRUD ----------

@router.post("/certificates", status_code=status.HTTP_201_CREATED)
def create_certificate(
    payload: CertificateCreate,
    student_id: int = 1,
    db: Session = Depends(get_db),
):
    """Tạo chứng chỉ mới cho học sinh."""
    s = _get_student(db, student_id)
    title = _validate_certificate_title(payload.title)
    cert = Certificate(
        student_id=s.id,
        title=title,
        issuer=payload.issuer or "FTalentHub",
        issued_at=payload.issued_at,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return {
        "id": cert.id,
        "title": cert.title,
        "issuer": cert.issuer,
        "issued_at": cert.issued_at,
    }


@router.put("/certificates/{cert_id}")
def update_certificate(
    cert_id: int,
    payload: CertificateUpdate,
    student_id: int = 1,
    db: Session = Depends(get_db),
):
    """Cập nhật chứng chỉ (chỉ của học sinh đó)."""
    s = _get_student(db, student_id)
    cert = db.query(Certificate).filter(Certificate.id == cert_id, Certificate.student_id == s.id).first()
    if not cert:
        raise HTTPException(404, "Không tìm thấy chứng chỉ")
    if payload.title is not None:
        cert.title = _validate_certificate_title(payload.title)
    if payload.issuer is not None:
        cert.issuer = payload.issuer
    if payload.issued_at is not None:
        cert.issued_at = payload.issued_at
    db.commit()
    db.refresh(cert)
    return {
        "id": cert.id,
        "title": cert.title,
        "issuer": cert.issuer,
        "issued_at": cert.issued_at,
    }


@router.delete("/certificates/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificate(
    cert_id: int,
    student_id: int = 1,
    db: Session = Depends(get_db),
):
    """Xoá chứng chỉ (chỉ của học sinh đó)."""
    s = _get_student(db, student_id)
    cert = db.query(Certificate).filter(Certificate.id == cert_id, Certificate.student_id == s.id).first()
    if not cert:
        raise HTTPException(404, "Không tìm thấy chứng chỉ")
    db.delete(cert)
    db.commit()
    return


@router.get("/overview")
def overview(student_id: int = 1, db: Session = Depends(get_db)):
    """Dashboard tổng quan + KPI xếp hạng + huy hiệu + lộ trình AI + chuỗi ngày liên tiếp."""
    s = _get_student(db, student_id)
    base = _student_payload(s, db)

    # xếp hạng theo talent_score trong cùng khối
    rank_row = (
        db.query(Student)
        .filter(Student.grade == s.grade, Student.talent_score > s.talent_score)
        .count()
    )
    total = db.query(Student).filter(Student.grade == s.grade).count()
    rank = rank_row + 1
    base["school_rank"] = rank
    base["school_total"] = max(total, rank)

    # huy hiệu theo giờ trải nghiệm (LevelProgression: 10/50/100/200h)
    badges = db.query(Badge).all()
    unlocked = []
    for b in badges:
        if s.experience_hours >= b.min_hours:
            unlocked.append({"code": b.code, "name": b.name, "icon": b.icon, "color": b.color})
    base["unlocked_badges"] = unlocked
    base["next_badge"] = next(
        ({"code": b.code, "name": b.name, "min_hours": b.min_hours} for b in badges if s.experience_hours < b.min_hours),
        None,
    )

    # chuỗi ngày check-in liên tiếp (streak)
    checkin_dates = (
        db.query(CheckIn.checked_in_at)
        .join(ActivityRegistration, ActivityRegistration.id == CheckIn.registration_id)
        .filter(ActivityRegistration.student_id == s.id)
        .distinct(CheckIn.checked_in_at)
        .all()
    )
    date_set = {c[0].date() for c in checkin_dates}
    today = date.today()
    streak = 0
    check_day = today
    if today not in date_set:
        check_day = today - timedelta(days=1)
    while check_day in date_set:
        streak += 1
        check_day -= timedelta(days=1)
    base["streak"] = streak

    # hoạt động tham gia
    regs = (
        db.query(ActivityRegistration, Activity)
        .join(Activity, Activity.id == ActivityRegistration.activity_id)
        .filter(ActivityRegistration.student_id == s.id)
        .all()
    )
    base["activities"] = [
        {
            "id": a.id,
            "title": a.title,
            "field": a.field,
            "status": r.status,
            "hours": r.hours,
        }
        for r, a in regs
    ]

    # lộ trình AI
    roadmap = (
        db.query(AiSuggestion)
        .filter(AiSuggestion.student_id == s.id, AiSuggestion.kind == "roadmap")
        .order_by(AiSuggestion.id.desc())
        .limit(4)
        .all()
    )
    base["roadmap"] = [
        {"title": r.title, "content": r.content} for r in roadmap
    ]
    analysis = (
        db.query(AiSuggestion)
        .filter(AiSuggestion.student_id == s.id, AiSuggestion.kind == "analysis")
        .order_by(AiSuggestion.id.desc())
        .first()
    )
    base["ai_analysis"] = analysis.content if analysis else None
    return base


@router.get("/profile")
def profile(student_id: int = 1, db: Session = Depends(get_db)):
    """Hồ sơ năng lực chi tiết (slide 11)."""
    return _student_payload(_get_student(db, student_id), db)


@router.get("/assessments")
def assessments(student_id: int = 1, db: Session = Depends(get_db)):
    """Kết quả test năng khiếu Holland/DISC/MBTI/MI (slide 12)."""
    rows = (
        db.query(TalentAssessment)
        .filter(TalentAssessment.student_id == student_id)
        .order_by(TalentAssessment.id.asc())
        .all()
    )
    return [
        {"test_type": r.test_type, "result": r.result_json, "date": str(r.created_at)[:10]}
        for r in rows
    ]


VALID_TEST_TYPES = {"holland", "disc", "mbti", "mi"}


@router.post("/assessments")
def submit_assessment(payload: dict, student_id: int = 1, db: Session = Depends(get_db)):
    """Nộp kết quả test năng khiếu (slide 12) — upsert theo loại bài."""
    _get_student(db, student_id)
    test_type = str(payload.get("test_type", "")).lower()
    if test_type not in VALID_TEST_TYPES:
        raise HTTPException(400, f"test_type phải thuộc {sorted(VALID_TEST_TYPES)}")
    result = str(payload.get("result", "")).strip()
    if not result:
        raise HTTPException(400, "result không được rỗng")
    row = (
        db.query(TalentAssessment)
        .filter(TalentAssessment.student_id == student_id, TalentAssessment.test_type == test_type)
        .first()
    )
    if row:
        row.result_json = result
    else:
        row = TalentAssessment(student_id=student_id, test_type=test_type, result_json=result)
        db.add(row)
    db.commit()
    return {"ok": True, "test_type": test_type}


# ---------- Ngân hàng câu hỏi (48 câu — 12 mỗi loại) ----------
QUESTION_BANK: dict[str, list[dict]] = {
    "holland": [
        {"order": 1, "text": "Tôi thích giải quyết các vấn đề kỹ thuật phức tạp hơn là thuyết phục người khác.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}', "order_val": 1},
        {"order": 2, "text": "Tôi thường xuyên sáng tạo ra những ý tưởng nghệ thuật độc đáo và muốn chia sẻ chúng.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}', "order_val": 2},
        {"order": 3, "text": "Tôi muốn giúp đỡ người khác và quan tâm đến cộng đồng hơn là theo đuổi sự nghiệp cá nhân.", "scoring": '{"poles":["Xã hội"],"reverse":false}', "order_val": 3},
        {"order": 4, "text": "Tôi thích làm việc với dữ liệu, con số và phân tích thống kê.", "scoring": '{"poles":["Doanh nghiệp"],"reverse":false}', "order_val": 4},
        {"order": 5, "text": "Tôi thích khám phá thiên nhiên, động vật và môi trường sống.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}', "order_val": 5},
        {"order": 6, "text": "Tôi thích lãnh đạo, tổ chức và điều hành nhóm.", "scoring": '{"poles":["Doanh nghiệp"],"reverse":false}', "order_val": 6},
        {"order": 7, "text": "Tôi thích viết lách, vẽ tranh hoặc biểu diễn nghệ thuật.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}', "order_val": 7},
        {"order": 8, "text": "Tôi thích lập trình, xây dựng hệ thống và giải thuật.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}', "order_val": 8},
        {"order": 9, "text": "Tôi thích nói chuyện, tư vấn và hỗ trợ mọi người.", "scoring": '{"poles":["Xã hội"],"reverse":false}', "order_val": 9},
        {"order": 10, "text": "Tôi thích nghiên cứu lý thuyết và tìm hiểu sâu về khoa học.", "scoring": '{"poles":["Học thuật"],"reverse":false}', "order_val": 10},
        {"order": 11, "text": "Tôi thích thiết kế, trang trí và tạo ra sản phẩm đẹp.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}', "order_val": 11},
        {"order": 12, "text": "Tôi thích làm việc thực hành, thí nghiệm và chế tạo.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}', "order_val": 12},
    ],
    "disc": [
        {"order": 1, "text": "Tôi là người hướng nội, thích làm việc một mình và suy nghĩ thầm lặng.", "scoring": '{"poles":["I"],"reverse":false}', "order_val": 1},
        {"order": 2, "text": "Tôi là người cẩn thận, thích tuân thủ quy tắc và quy trình.", "scoring": '{"poles":["C"],"reverse":false}', "order_val": 2},
        {"order": 3, "text": "Tôi là người năng động, thích tác động và thuyết phục người khác.", "scoring": '{"poles":["D"],"reverse":false}', "order_val": 3},
        {"order": 4, "text": "Tôi là người sáng tạo, thích thử nghiệm và đổi mới.", "scoring": '{"poles":["I"],"reverse":false}', "order_val": 4},
        {"order": 5, "text": "Tôi rất có tổ chức, thích mọi thứ nằm gọn trong kế hoạch.", "scoring": '{"poles":["C"],"reverse":false}', "order_val": 5},
        {"order": 6, "text": "Tôi thích dẫn đầu và ra quyết định nhanh chóng.", "scoring": '{"poles":["D"],"reverse":false}', "order_val": 6},
        {"order": 7, "text": "Tôi thích giúp đỡ và hỗ trợ người khác phát triển.", "scoring": '{"poles":["S"],"reverse":false}', "order_val": 7},
        {"order": 8, "text": "Tôi thích phân tích và tìm hiểu sâu trước khi hành động.", "scoring": '{"poles":["C"],"reverse":false}', "order_val": 8},
        {"order": 9, "text": "Tôi thích thể hiện bản thân và thu hút sự chú ý.", "scoring": '{"poles":["D"],"reverse":false}', "order_val": 9},
        {"order": 10, "text": "Tôi kiên nhẫn, hợp tác và thích làm việc nhóm.", "scoring": '{"poles":["S"],"reverse":false}', "order_val": 10},
        {"order": 11, "text": "Tôi thích suy nghĩ trừu tượng và tìm ra các mô hình mới.", "scoring": '{"poles":["I"],"reverse":false}', "order_val": 11},
        {"order": 12, "text": "Tôi thích quan tâm, chăm sóc và đồng cảm với người xung quanh.", "scoring": '{"poles":["S"],"reverse":false}', "order_val": 12},
    ],
    "mbti": [
        {"order": 1, "text": "Tôi thu được năng lượng khi ở một mình hơn là ở nơi đông người.", "scoring": '{"poles":["I"],"reverse":false}', "order_val": 1},
        {"order": 2, "text": "Tôi thích lên kế hoạch chi tiết trước khi thực hiện.", "scoring": '{"poles":["J"],"reverse":false}', "order_val": 2},
        {"order": 3, "text": "Tôi thích phân tích logic hơn là dựa vào cảm xúc.", "scoring": '{"poles":["T"],"reverse":false}', "order_val": 3},
        {"order": 4, "text": "Tôi thích quan sát và thu thập thông tin cụ thể.", "scoring": '{"poles":["S"],"reverse":false}', "order_val": 4},
        {"order": 5, "text": "Tôi thích suy nghĩ về tương lai và các khả năng.", "scoring": '{"poles":["N"],"reverse":false}', "order_val": 5},
        {"order": 6, "text": "Tôi thích linh hoạt, spontaneity hơn là theo lịch trình.", "scoring": '{"poles":["P"],"reverse":false}', "order_val": 6},
        {"order": 7, "text": "Tôi quyết định dựa trên giá trị và cảm xúc cá nhân.", "scoring": '{"poles":["F"],"reverse":false}', "order_val": 7},
        {"order": 8, "text": "Tôi thích học hỏi qua trải nghiệm thực tế.", "scoring": '{"poles":["S"],"reverse":false}', "order_val": 8},
        {"order": 9, "text": "Tôi thích suy nghĩ trừu tượng và lý thuyết.", "scoring": '{"poles":["N"],"reverse":false}', "order_val": 9},
        {"order": 10, "text": "Tôi thích hoàn thành công việc đúng hạn.", "scoring": '{"poles":["J"],"reverse":false}', "order_val": 10},
        {"order": 11, "text": "Tôi là người hướng ngoại, năng lượng đến từ giao tiếp.", "scoring": '{"poles":["E"],"reverse":false}', "order_val": 11},
        {"order": 12, "text": "Tôi thích linh hoạt thích nghi với hoàn cảnh thay vì kiểm soát.", "scoring": '{"poles":["P"],"reverse":false}', "order_val": 12},
    ],
    "mi": [
        {"order": 1, "text": "Tôi giỏi tư duy logic, giải toán và nhận ra các quy luật.", "scoring": '{"poles":["Logic-Toán học"],"reverse":false}', "order_val": 1},
        {"order": 2, "text": "Tôi có trí nhớ hình ảnh tốt, nhớ bằng hình ảnh hơn lời nói.", "scoring": '{"poles":["Không gian"],"reverse":false}', "order_val": 2},
        {"order": 3, "text": "Tôi nhạy cảm với âm thanh, giai điệu và nhịp điệu.", "scoring": '{"poles":["Âm nhạc"],"reverse":false}', "order_val": 3},
        {"order": 4, "text": "Tôi học tốt bằng cách chạm vào, làm thí nghiệm và vận động.", "scoring": '{"poles":["Thể chất"],"reverse":false}', "order_val": 4},
        {"order": 5, "text": "Tôi giỏi hiểu cảm xúc, động cơ của người khác.", "scoring": '{"poles":["Giao tiếp"],"reverse":false}', "order_val": 5},
        {"order": 6, "text": "Tôi có tư duy sắc sảo, nhìn thấy mối liên hệ và sự đối lập.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}', "order_val": 6},
        {"order": 7, "text": "Tôi có khả năng kể chuyện, dùng từ ngữ hiệu quả.", "scoring": '{"poles":["Ngôn ngữ"],"reverse":false}', "order_val": 7},
        {"order": 8, "text": "Tôi giỏi nhìn tổng thể, tưởng tượng và sáng tạo.", "scoring": '{"poles":["Tồn tại"],"reverse":false}', "order_val": 8},
        {"order": 9, "text": "Tôi học tốt nhất qua việc nghe giảng và thảo luận.", "scoring": '{"poles":["Âm nhạc"],"reverse":false}', "order_val": 9},
        {"order": 10, "text": "Tôi giỏi vẽ, thiết kế và nắm bắt không gian 3D.", "scoring": '{"poles":["Không gian"],"reverse":false}', "order_val": 10},
        {"order": 11, "text": "Tôi giỏi lập kế hoạch, quản lý thời gian và tổ chức.", "scoring": '{"poles":["Logic-Toán học"],"reverse":false}', "order_val": 11},
        {"order": 12, "text": "Tôi hiểu sâu về thế giới tự nhiên và các hệ thống.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}', "order_val": 12},
    ],
}


@router.get("/assessments/questions")
def get_questions(
    test_type: str,
    db: Session = Depends(get_db),
):
    """Lấy ngân hàng câu hỏi cho 1 loại test (slide 12)."""
    if test_type not in VALID_TEST_TYPES:
        raise HTTPException(400, f"test_type phải thuộc {sorted(VALID_TEST_TYPES)}")
    rows = (
        db.query(TestQuestion)
        .filter(TestQuestion.test_type == test_type)
        .order_by(TestQuestion.order.asc())
        .all()
    )
    if not rows:
        raise HTTPException(404, f"Chưa có câu hỏi cho {test_type}")
    return [
        QuestionOut(
            id=r.id, test_type=r.test_type, order=r.order,
            text=r.text, options=json.loads(r.options_json),
            scoring=json.loads(r.scoring_json),
        ).model_dump()
        for r in rows
    ]


# Labels riêng cho DISC và MBTI (tránh trùng key "S", "I")
DISC_LABELS = {
    "D": "Dũng cảm - Lãnh đạo",
    "I": "Cảm hứng - Thuyết phục",
    "S": "Chăm sóc - Hỗ trợ",
    "C": "Chặt chẽ - Phân tích",
}
MBTI_LABELS = {
    "E": "Hướng ngoại - Năng động",
    "I": "Nội tâm - Sáng tạo",
    "S": "Thực hành - Cụ thể",
    "N": "Tưởng tượng - Trừu tượng",
    "T": "Logic - Phân tích",
    "F": "Cảm xúc - Đồng cảm",
    "J": "Có tổ chức - Kiên định",
    "P": "Linh hoạt - Mở cửa",
}


@router.post("/assessments/compute", response_model=ComputeOut)
def compute_assessment(payload: ComputeIn, student_id: int = 1, db: Session = Depends(get_db)):
    """Tính điểm năng khiếu từ đáp án (slide 12) — server-side."""
    _get_student(db, student_id)
    questions = QUESTION_BANK.get(payload.test_type)
    if not questions:
        raise HTTPException(400, f"test_type không hợp lệ: {payload.test_type}")
    if len(payload.answers) != len(questions):
        raise HTTPException(400, f"Cần {len(questions)} câu trả lời, nhận {len(payload.answers)}")
    # Tính điểm theo poles
    poles: dict[str, float] = {}
    for q, ans in zip(questions, payload.answers):
        sc = json.loads(q["scoring"])
        ans_val = ans if 0 <= ans <= 4 else 0
        for pole in sc["poles"]:
            pts = (6 - ans_val) if sc.get("reverse") else ans_val
            poles[pole] = poles.get(pole, 0) + pts
    # Xếp loại
    total = sum(poles.values())
    max_total = len(questions) * 5
    pct = round(total / max_total * 100) if max_total else 0
    top_pole = max(poles, key=poles.get) if poles else "Chưa xác định"

    # Chọn label theo test_type
    if payload.test_type == "disc":
        label = DISC_LABELS.get(top_pole, top_pole)
    elif payload.test_type == "mbti":
        label = MBTI_LABELS.get(top_pole, top_pole)
    else:
        # holland / mi: dùng tên pole tiếng Việt (toàn bộ chuỗi, không cắt)
        label = top_pole

    # Holland nhóm: chỉ set khi test_type == "holland"
    result = {"type": top_pole, "score": pct,
              "poles": {k: round(v, 1) for k, v in sorted(poles.items(), key=lambda x: -x[1])}}
    if payload.test_type == "holland":
        holland_map = {"Kỹ thuật": "Doanh nhân thực hành", "Nghệ thuật": "Người sáng tạo",
                       "Xã hội": "Người giúp đỡ", "Doanh nghiệp": "Người lãnh đạo",
                       "Tự nhiên": "Nhà nghiên cứu", "Học thuật": "Nhà tư duy"}
        result["holland"] = holland_map.get(top_pole, top_pole)

    return ComputeOut(test_type=payload.test_type, result=result,
                      label=label,
                      detail=f"Điểm {pct}/100 — Đặc điểm: {label}")


def _xep_loai(total: float) -> str:
    if total >= 90:
        return "Xuất sắc"
    if total >= 80:
        return "Tốt"
    if total >= 70:
        return "Khá"
    return "Đạt"


@router.get("/evaluations")
def evaluations(student_id: int = 1, db: Session = Depends(get_db)):
    """Điểm tiêu chí + nhận xét từ GV/HLV (slide 15)."""
    _get_student(db, student_id)
    rows = (
        db.query(Evaluation)
        .filter(Evaluation.student_id == student_id)
        .order_by(Evaluation.id.desc())
        .all()
    )
    out = []
    for e in rows:
        teacher = db.query(User).filter(User.id == e.teacher_id).first()
        activity = db.query(Activity).filter(Activity.id == e.activity_id).first()
        total = round(e.chuyen_mon + e.sang_tao + e.lam_viec_nhom + e.ky_luat, 1)
        # Xác định role của người chấm (teacher/coach)
        reviewer_role = "teacher"
        if teacher and teacher.role == "coach":
            reviewer_role = "coach"
        out.append(
            {
                "id": e.id,
                "activity": activity.title if activity else f"Hoạt động #{e.activity_id}",
                "reviewer": teacher.full_name if teacher else f"Giáo viên #{e.teacher_id}",
                "reviewer_role": reviewer_role,
                "criteria": [
                    {"name": "Chuyên môn", "score": e.chuyen_mon, "max": 40},
                    {"name": "Sáng tạo", "score": e.sang_tao, "max": 20},
                    {"name": "Làm việc nhóm", "score": e.lam_viec_nhom, "max": 20},
                    {"name": "Kỷ luật", "score": e.ky_luat, "max": 20},
                ],
                "total": total,
                "xep_loai": _xep_loai(total),
                "comment": e.comment,
                "date": str(e.evaluated_at)[:10],
            }
        )
    return out


@router.get("/checkins")
def checkin_history(student_id: int = 1, db: Session = Depends(get_db)):
    """Lịch sử check-in QR của học sinh (slide 14)."""
    _get_student(db, student_id)
    rows = (
        db.query(CheckIn, ActivityRegistration, Activity)
        .join(ActivityRegistration, ActivityRegistration.id == CheckIn.registration_id)
        .join(Activity, Activity.id == ActivityRegistration.activity_id)
        .filter(ActivityRegistration.student_id == student_id)
        .order_by(CheckIn.id.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": c.id,
            "activity": a.title,
            "qr_code": c.qr_code,
            "hours_added": c.hours_added,
            "checked_in_at": str(c.checked_in_at)[:16],
        }
        for c, _r, a in rows
    ]


@router.get("/activities")
def activities(
    field: str | None = None,
    q: str | None = None,
    student_id: int = 1,
    db: Session = Depends(get_db),
):
    """Danh sách sân chơi theo lĩnh vực — chỉ trạng thái open (slide 13)."""
    query = db.query(Activity).filter(Activity.status == "open")
    if field:
        query = query.filter(Activity.field == field)
    if q:
        query = query.filter(Activity.title.ilike(f"%{q}%"))
    rows = query.all()
    my_ids = {
        r.activity_id
        for r in db.query(ActivityRegistration).filter(ActivityRegistration.student_id == student_id)
    }
    return [
        {
            "id": a.id,
            "title": a.title,
            "field": a.field,
            "description": a.description,
            "capacity": a.capacity,
            "start_date": a.start_date,
            "status": a.status,
            "registered": a.id in my_ids,
            "slots_left": max(0, a.capacity - db.query(ActivityRegistration).filter(ActivityRegistration.activity_id == a.id).count()),
        }
        for a in rows
    ]


@router.post("/activities/{activity_id}/register")
def register(activity_id: int, student_id: int = 1, db: Session = Depends(get_db)):
    existing = (
        db.query(ActivityRegistration)
        .filter(ActivityRegistration.activity_id == activity_id, ActivityRegistration.student_id == student_id)
        .first()
    )
    if existing:
        return {"ok": True, "status": "already_registered"}
    db.add(ActivityRegistration(activity_id=activity_id, student_id=student_id))
    db.commit()
    return {"ok": True, "status": "registered"}


@router.post("/checkin")
def checkin(qr_code: str, registration_id: int | None = None, student_id: int = 1, db: Session = Depends(get_db)):
    """Check-in QR — cộng giờ tự động (slide 14)."""
    reg = None
    if registration_id:
        reg = (
            db.query(ActivityRegistration)
            .filter(ActivityRegistration.id == registration_id, ActivityRegistration.student_id == student_id)
            .first()
        )
    if reg is None:
        # mặc định lấy đăng ký đầu tiên ở hoạt động đang mở của học sinh (demo)
        reg = (
            db.query(ActivityRegistration)
            .join(Activity, Activity.id == ActivityRegistration.activity_id)
            .filter(ActivityRegistration.student_id == student_id, Activity.status == "open")
            .first()
        )
    if reg is None:
        raise HTTPException(404, "Không tìm thấy đăng ký hợp lệ")

    old = reg.hours
    reg.hours += 1.0
    db.add(CheckIn(registration_id=reg.id, qr_code=qr_code, hours_added=1.0))
    # cập nhật tổng giờ học sinh
    stu = db.query(Student).filter(Student.id == reg.student_id).first()
    if stu:
        stu.experience_hours += 1.0
    db.commit()
    return {"ok": True, "message": "Check-in thành công +1 giờ", "registration_id": reg.id, "hours": reg.hours, "chk_total": stu.experience_hours if stu else None}


@router.get("/badges")
def badges(student_id: int = 1, db: Session = Depends(get_db)):
    """Hệ thống huy hiệu (slide 17)."""
    s = _get_student(db, student_id)
    all_badges = db.query(Badge).order_by(Badge.min_hours.asc()).all()
    return [
        {
            "code": b.code,
            "name": b.name,
            "min_hours": b.min_hours,
            "icon": b.icon,
            "color": b.color,
            "description": b.description,
            "unlocked": s.experience_hours >= b.min_hours,
            "current_hours": s.experience_hours,
            "progress_pct": min(100, round(s.experience_hours / b.min_hours * 100)) if b.min_hours else 0,
        }
        for b in all_badges
    ]