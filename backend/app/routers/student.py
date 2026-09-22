"""HỌC SINH — dashboard, hồ sơ, khám phá, hoạt động, check-in QR, huy hiệu, lộ trình AI."""
import json
from fastapi import APIRouter, Depends, HTTPException
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
)
from ..schemas import ComputeIn, ComputeOut, QuestionOut

router = APIRouter(prefix="/student", tags=["student"])


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
            {"title": c.title, "issuer": c.issuer, "issued_at": c.issued_at} for c in certs
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


@router.get("/overview")
def overview(student_id: int = 1, db: Session = Depends(get_db)):
    """Dashboard tổng quan + KPI xếp hạng + huy hiệu + lộ trình AI."""
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
    label = {"I": "Nội tâm - Sáng tạo", "C": "Chặt chẽ - Phân tích", "D": "Dũng cảm - Lãnh đạo",
             "S": "Chăm sóc - Hỗ trợ", "E": "Hướng ngoại - Năng động", "N": "Tưởng tượng - Trừu tượng",
             "T": "Logic - Phân tích", "F": "Cảm xúc - Đồng cảm", "J": "Có tổ chức - Kiên định",
             "P": "Linh hoạt - Mở cửa", "S": "Thực hành - Cụ thể"}.get(top_pole[:2].upper(), top_pole)
    # Holland nhóm
    holland_map = {"Kỹ thuật": "Doanh nhân thực hành", "Nghệ thuật": "Người sáng tạo",
                   "Xã hội": "Người giúp đỡ", "Doanh nghiệp": "Người lãnh đạo",
                   "Tự nhiên": "Nhà nghiên cứu", "Học thuật": "Nhà tư duy"}
    result = {"type": top_pole, "score": pct,
              "poles": {k: round(v, 1) for k, v in sorted(poles.items(), key=lambda x: -x[1])},
              "holland": holland_map.get(top_pole, top_pole)}
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
        out.append(
            {
                "id": e.id,
                "activity": activity.title if activity else f"Hoạt động #{e.activity_id}",
                "reviewer": teacher.full_name if teacher else f"Giáo viên #{e.teacher_id}",
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
    """Danh sách sân chơi theo lĩnh vực (slide 13)."""
    query = db.query(Activity)
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