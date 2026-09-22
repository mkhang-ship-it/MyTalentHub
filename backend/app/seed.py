"""Seed dữ liệu mẫu đẹp theo 35 slide — 40 HS, rải 6 tháng cho KPI/trend.

Chạy: python -m app.seed

Tài khoản đăng nhập demo (password: demo123):
- hs01@ftalenthub.edu.vn  (Học sinh — Nguyễn Minh Anh)
- nguyen.van.hung@ftalenthub.edu.vn (Giáo viên)
- bgh@ftalenthub.edu.vn   (Nhà trường)
- hr@techfpt.vn           (Doanh nghiệp)
"""
import json
from datetime import datetime, timedelta

from sqlalchemy import func
from .database import Base, SessionLocal, engine
from .models import (
    Activity,
    ActivityRegistration,
    AiSuggestion,
    Badge,
    Certificate,
    CheckIn,
    ClassGroup,
    Enterprise,
    Evaluation,
    InternshipApplication,
    InternshipPost,
    Project,
    ProjectMember,
    School,
    Skill,
    Sponsorship,
    Student,
    StudentBadge,
    StudentSkill,
    TalentAssessment,
    TalentPassport,
    Teacher,
    TeacherClassAssignment,
    TestQuestion,
    User,
)
from .routers.auth import hash_password

STUDENT_NAMES = [
    "Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Thị Hồng Nhung", "Phạm Gia Khánh",
    "Võ Nhật Minh", "Đặng Thanh Trúc", "Bùi Anh Tuấn", "Hoàng Mai Linh",
    "Đỗ Khánh Vân", "Ngô Đức Huy", "Hà Phương Uyên", "Dương Thế Vinh",
    "Lâm Gia Bảo", "Châu Ngọc Diệp", "Mai Đức Trung", "Trịnh Hoài An",
    "Hồ Thanh Tùng", "Bạch Yến Nhi", "Kiều Minh Quân", "Lý Gia Hân",
    "Phan Nhật Nam", "Thái Ngọc Tú", "Cao Đình Phong", "Tô Mai Chi",
    "Lưu Cẩm Tú", "Diệp Anh Thư", "Quách Văn Khôi", "Uông Bảo Ngọc",
    "Tăng Hữu Đạt", "Trương Linh Đan", "Nghiêm Tuấn Kiệt", "Lạc Thanh Mai",
    "Vi Khánh Huyền", "Mạc Đình Sơn", "Phùng Thu Hà", "Đoàn Nhật Anh",
    "Tạ Mỹ Duyên", "Chung Hải Đăng", "Đinh Thu Thảo", "Vũ Quốc Cường",
]

CLASSES = ["10A1", "10A2", "11B1", "11B2", "12C1", "12C2"]
GRADE_BY_CLASS = {"10A1": 10, "10A2": 10, "11B1": 11, "11B2": 11, "12C1": 12, "12C2": 12}

TEACHERS = [
    ("Nguyễn Văn Hùng", "Công nghệ", "nguyen.van.hung@ftalenthub.edu.vn"),
    ("Trần Thị Mai", "Toán", "tran.thi.mai@ftalenthub.edu.vn"),
    ("Lê Quốc Dũng", "Vật lý", "le.quoc.dung@ftalenthub.edu.vn"),
    ("Phạm Hồng Hạnh", "Văn", "pham.hong.hanh@ftalenthub.edu.vn"),
]

INTERESTS = [
    "IoT, Lập trình, Drone",
    "Hội họa, Thiết kế",
    "Kinh doanh, Khởi nghiệp",
    "Thể thao, Bóng rổ",
    "Âm nhạc, Guitar",
    "Sáng tạo nội dung",
    "Robotics, Cơ khí",
    "Viết lách, Nghiên cứu",
    "Nhiếp ảnh, Video",
    "Kinh tế, Tài chính",
    "Nghệ thuật, Mỹ thuật",
    "Công nghệ, AI",
]

# 6 tháng quay về từ 2026-09 (tháng hiện tại) — để school overview có trend đủ 6 cột.
BASE_MONTHS = [4, 5, 6, 7, 8, 9]  # các tháng có hoạt động rải: 04 -> 09/2026
_YEAR = 2026


def _dt(month: int, day: int, hour: int = 8) -> datetime:
    return datetime(_YEAR, month, min(day, 28), hour, 0, 0)


def _reg_date(i: int) -> datetime:
    """Ngày đăng ký rải đều theo index của học sinh."""
    m = BASE_MONTHS[i % len(BASE_MONTHS)]
    return _dt(m, 2 + (i * 3) % 24)


def _checkin_date(i: int, k: int = 0) -> datetime:
    m = BASE_MONTHS[(i + k) % len(BASE_MONTHS)]
    return _dt(m, 4 + (i * 5 + k * 7) % 22, 15)


def _eval_date(i: int) -> datetime:
    m = BASE_MONTHS[(i + 1) % len(BASE_MONTHS)]
    return _dt(m, 20 + (i * 2) % 8, 17)


def run():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # ---------- users / students (40 HS) ----------
    users, students = [], []
    for i, name in enumerate(STUDENT_NAMES, start=1):
        cls = CLASSES[(i - 1) % len(CLASSES)]
        u = User(
            role="student",
            full_name=name,
            email=f"hs{i:02d}@ftalenthub.edu.vn",
            password_hash=hash_password("demo123"),
            avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
        )
        users.append(u)
        students.append(
            Student(
                user=u,
                class_name=cls,
                grade=GRADE_BY_CLASS[cls],
                talent_score=round(52 + (i * 13) % 46, 1),
                experience_hours=float(10 + (i * 7) % 58),
                interests=INTERESTS[(i - 1) % len(INTERESTS)],
                bio="Học sinh tích cực tham gia hoạt động trải nghiệm.",
            )
        )
    db.add_all(users)
    db.add_all(students)
    db.flush()

    # ---------- teachers ----------
    teachers = []
    for name, subject, email in TEACHERS:
        teachers.append(
            Teacher(
                user=User(
                    role="teacher",
                    full_name=name,
                    email=email,
                    password_hash=hash_password("demo123"),
                ),
                subject=subject,
                is_homeroom=True,
            )
        )
    db.add_all(teachers)
    db.flush()

    # ---------- school + enterprise ----------
    sc = School(
        user=User(role="school", full_name="Ban Giám hiệu THPT FTI", email="bgh@ftalenthub.edu.vn", password_hash=hash_password("demo123")),
        school_name="Trường THPT FTI Cần Thơ",
    )
    ent = Enterprise(
        user=User(role="enterprise", full_name="Công ty TNHH TechFPT", email="hr@techfpt.vn", password_hash=hash_password("demo123")),
        company_name="TechFPT Solutions",
        industry="Công nghệ thông tin",
    )
    db.add_all([sc, ent])
    db.flush()

    # ---------- classes + homeroom ----------
    for cname, grade in GRADE_BY_CLASS.items():
        cg = ClassGroup(name=cname, grade=grade, homeroom_teacher_id=teachers[(grade % len(teachers))].id)
        db.add(cg)
        db.flush()
        db.add(TeacherClassAssignment(teacher_id=cg.homeroom_teacher_id, class_group_id=cg.id))
    db.flush()

    # ---------- skills (4 criteria active) ----------
    skill_defs = [
        ("chuyen_mon", "Chuyên môn", "chuyen_mon", 1.0),
        ("sang_tao", "Sáng tạo", "sang_tao", 1.0),
        ("ky_luat", "Kỷ luật", "ky_luat", 1.0),
        ("lam_viec_nhom", "Làm việc nhóm", "lam_viec_nhom", 1.0),
    ]
    skills = [Skill(code=c, name=n, category=cat, weight=w) for c, n, cat, w in skill_defs]
    db.add_all(skills)
    db.flush()

    for i, s in enumerate(students):
        for j, sk in enumerate(skills):
            db.add(StudentSkill(student_id=s.id, skill_id=sk.id, level=round(4.5 + (i * 7 + j * 3) % 56 / 10, 1)))

    # ---------- badges ----------
    badge_defs = [
        ("explorer", "Explorer", 10, "compass", "blue", "Hoàn thành 10 giờ trải nghiệm"),
        ("innovator", "Innovator", 50, "lightbulb", "violet", "Hoàn thành 50 giờ trải nghiệm"),
        ("expert", "Expert", 100, "award", "amber", "Hoàn thành 100 giờ trải nghiệm"),
        ("master", "Master", 200, "crown", "emerald", "Hoàn thành 200 giờ trải nghiệm"),
    ]
    badges = [Badge(code=c, name=n, min_hours=h, icon=i_c, color=col, description=d) for c, n, h, i_c, col, d in badge_defs]
    db.add_all(badges)
    db.flush()

    # ---------- activities (rải start_date theo tháng) ----------
    act_defs = [
        ("IoT Lab — Lập trình nhúng", "ky_thuat", 0, "Học lập trình Arduino, cảm biến, điều khiển thiết bị thông minh."),
        ("Câu lạc bộ Vẽ & Thiết kế", "nghe_thuat", 1, "Phát triển khả năng hội họa, thiết kế đồ họa."),
        ("Startup Challenge", "kinh_doanh", 2, "Học như một doanh nhân: ý tưởng, kế hoạch kinh doanh, thuyết trình."),
        ("CLB Bóng rổ", "the_thao", 0, "Rèn luyện thể chất, tinh thần đồng đội."),
        ("Workshop Drone & 3D Printing", "ky_thuat", 2, "Thực hành chế tạo drone, in 3D mô hình."),
        ("Học thuật — Olympiad Toán", "hoc_thuat", 1, "Ôn luyện đội tuyển Toán học sinh giỏi."),
        ("Sáng tạo nội dung số", "sang_tao", 3, "Làm video, viết blog, nhiếp ảnh."),
        ("Câu lạc bộ Robotics", "ky_thuat", 0, "Chế tạo robot đấu trường, học cảm biến & lập trình điều khiển."),
        ("Workshop Kinh tế & Khởi nghiệp", "kinh_doanh", 2, "Tìm hiểu lập kế hoạch kinh doanh, gọi vốn, pitch."),
    ]
    activities = []
    for idx, (title, field, tid_i, desc) in enumerate(act_defs):
        m = BASE_MONTHS[idx % len(BASE_MONTHS)]
        a = Activity(
            title=title, field=field, teacher_id=teachers[tid_i].id, description=desc,
            capacity=25 + (idx % 4) * 5, status="open",
            start_date=f"{_YEAR}-{m:02d}-{1 + idx:02d}",
            end_date=f"{_YEAR}-{m + 2 if m + 2 <= 12 else 12:02d}-28",
        )
        activities.append(a)
    db.add_all(activities)
    db.flush()

    # ---------- registrations + checkins (rải nhiều tháng) ----------
    for i, s in enumerate(students):
        act = activities[i % len(activities)]
        if i % 3 == 0:
            # 1/3 hồ sơ đăng ký còn "pending" (mới đăng ký, chưa duyệt) → participation < 100%
            db.add(ActivityRegistration(
                activity_id=act.id, student_id=s.id, role="Thành viên",
                status="pending", hours=0, registered_at=_reg_date(i),
            ))
            db.flush()
            continue
        hours = round(2 + (i * 5) % 30, 1)
        if i % 5 == 2:
            hours = 0  # đã duyệt nhưng chưa check-in → completion < 100%
        r = ActivityRegistration(
            activity_id=act.id, student_id=s.id, role="Thành viên",
            status="registered", hours=hours, registered_at=_reg_date(i),
        )
        db.add(r)
        db.flush()
        # 1-3 check-in theo tháng khác nhau → trend hoàn thành nhiều tháng
        for k in range(1 + i % 3):
            db.add(CheckIn(
                registration_id=r.id,
                qr_code=f"QR-{s.id:04d}-{act.id:03d}-{k}",
                hours_added=1.0,
                checked_in_at=_checkin_date(i, k),
            ))
    db.flush()

    # ---------- evaluations (rải tháng) ----------
    for i, s in enumerate(students):
        db.add(Evaluation(
            activity_id=activities[i % len(activities)].id,
            student_id=s.id,
            teacher_id=teachers[i % len(teachers)].id,
            chuyen_mon=round(24 + (i * 5) % 16, 1),
            sang_tao=round(12 + (i * 3) % 8, 1),
            lam_viec_nhom=round(13 + (i * 4) % 7, 1),
            ky_luat=round(14 + (i * 2) % 6, 1),
            comment="Học sinh có tiến bộ rõ rệt.",
            evaluated_at=_eval_date(i),
        ))
    db.flush()

    # ---------- huy hiệu Explorer cho HS có giờ >= 10 ----------
    for s in students:
        if s.experience_hours >= 10:
            db.add(StudentBadge(student_id=s.id, badge_id=badges[0].id))
        if s.experience_hours >= 50:
            db.add(StudentBadge(student_id=s.id, badge_id=badges[1].id))
    db.flush()

    # ---------- talent assessments ----------
    for i, s in enumerate(students):
        db.add(TalentAssessment(student_id=s.id, test_type="holland", result_json=json.dumps({"top": ["Kỹ thuật", "Thực hành"] if i % 2 else ["Nghệ thuật", "Sáng tạo"], "score": 78 + i % 20})))
        db.add(TalentAssessment(student_id=s.id, test_type="disc", result_json=json.dumps({"type": "S" if i % 3 == 0 else "C", "score": 72 + i % 10})))
    db.flush()

    # ---------- ngân hàng câu hỏi test năng khiếu (48 câu — 12 mỗi loại) ----------
    _Q_BANK: dict[str, list[dict]] = {
        "holland": [
            {"order": 1, "text": "Tôi thích giải quyết các vấn đề kỹ thuật phức tạp hơn là thuyết phục người khác.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}'},
            {"order": 2, "text": "Tôi thường xuyên sáng tạo ra những ý tưởng nghệ thuật độc đáo và muốn chia sẻ chúng.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}'},
            {"order": 3, "text": "Tôi muốn giúp đỡ người khác và quan tâm đến cộng đồng hơn là theo đuổi sự nghiệp cá nhân.", "scoring": '{"poles":["Xã hội"],"reverse":false}'},
            {"order": 4, "text": "Tôi thích làm việc với dữ liệu, con số và phân tích thống kê.", "scoring": '{"poles":["Doanh nghiệp"],"reverse":false}'},
            {"order": 5, "text": "Tôi thích khám phá thiên nhiên, động vật và môi trường sống.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}'},
            {"order": 6, "text": "Tôi thích lãnh đạo, tổ chức và điều hành nhóm.", "scoring": '{"poles":["Doanh nghiệp"],"reverse":false}'},
            {"order": 7, "text": "Tôi thích viết lách, vẽ tranh hoặc biểu diễn nghệ thuật.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}'},
            {"order": 8, "text": "Tôi thích lập trình, xây dựng hệ thống và giải thuật.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}'},
            {"order": 9, "text": "Tôi thích nói chuyện, tư vấn và hỗ trợ mọi người.", "scoring": '{"poles":["Xã hội"],"reverse":false}'},
            {"order": 10, "text": "Tôi thích nghiên cứu lý thuyết và tìm hiểu sâu về khoa học.", "scoring": '{"poles":["Học thuật"],"reverse":false}'},
            {"order": 11, "text": "Tôi thích thiết kế, trang trí và tạo ra sản phẩm đẹp.", "scoring": '{"poles":["Nghệ thuật"],"reverse":false}'},
            {"order": 12, "text": "Tôi thích làm việc thực hành, thí nghiệm và chế tạo.", "scoring": '{"poles":["Kỹ thuật"],"reverse":false}'},
        ],
        "disc": [
            {"order": 1, "text": "Tôi là người hướng nội, thích làm việc một mình và suy nghĩ thầm lặng.", "scoring": '{"poles":["I"],"reverse":false}'},
            {"order": 2, "text": "Tôi là người cẩn thận, thích tuân thủ quy tắc và quy trình.", "scoring": '{"poles":["C"],"reverse":false}'},
            {"order": 3, "text": "Tôi là người năng động, thích tác động và thuyết phục người khác.", "scoring": '{"poles":["D"],"reverse":false}'},
            {"order": 4, "text": "Tôi là người sáng tạo, thích thử nghiệm và đổi mới.", "scoring": '{"poles":["I"],"reverse":false}'},
            {"order": 5, "text": "Tôi rất có tổ chức, thích mọi thứ nằm gọn trong kế hoạch.", "scoring": '{"poles":["C"],"reverse":false}'},
            {"order": 6, "text": "Tôi thích dẫn đầu và ra quyết định nhanh chóng.", "scoring": '{"poles":["D"],"reverse":false}'},
            {"order": 7, "text": "Tôi thích giúp đỡ và hỗ trợ người khác phát triển.", "scoring": '{"poles":["S"],"reverse":false}'},
            {"order": 8, "text": "Tôi thích phân tích và tìm hiểu sâu trước khi hành động.", "scoring": '{"poles":["C"],"reverse":false}'},
            {"order": 9, "text": "Tôi thích thể hiện bản thân và thu hút sự chú ý.", "scoring": '{"poles":["D"],"reverse":false}'},
            {"order": 10, "text": "Tôi kiên nhẫn, hợp tác và thích làm việc nhóm.", "scoring": '{"poles":["S"],"reverse":false}'},
            {"order": 11, "text": "Tôi thích suy nghĩ trừu tượng và tìm ra các mô hình mới.", "scoring": '{"poles":["I"],"reverse":false}'},
            {"order": 12, "text": "Tôi thích quan tâm, chăm sóc và đồng cảm với người xung quanh.", "scoring": '{"poles":["S"],"reverse":false}'},
        ],
        "mbti": [
            {"order": 1, "text": "Tôi thu được năng lượng khi ở một mình hơn là ở nơi đông người.", "scoring": '{"poles":["I"],"reverse":false}'},
            {"order": 2, "text": "Tôi thích lên kế hoạch chi tiết trước khi thực hiện.", "scoring": '{"poles":["J"],"reverse":false}'},
            {"order": 3, "text": "Tôi thích phân tích logic hơn là dựa vào cảm xúc.", "scoring": '{"poles":["T"],"reverse":false}'},
            {"order": 4, "text": "Tôi thích quan sát và thu thập thông tin cụ thể.", "scoring": '{"poles":["S"],"reverse":false}'},
            {"order": 5, "text": "Tôi thích suy nghĩ về tương lai và các khả năng.", "scoring": '{"poles":["N"],"reverse":false}'},
            {"order": 6, "text": "Tôi thích linh hoạt, spontaneity hơn là theo lịch trình.", "scoring": '{"poles":["P"],"reverse":false}'},
            {"order": 7, "text": "Tôi quyết định dựa trên giá trị và cảm xúc cá nhân.", "scoring": '{"poles":["F"],"reverse":false}'},
            {"order": 8, "text": "Tôi thích học hỏi qua trải nghiệm thực tế.", "scoring": '{"poles":["S"],"reverse":false}'},
            {"order": 9, "text": "Tôi thích suy nghĩ trừu tượng và lý thuyết.", "scoring": '{"poles":["N"],"reverse":false}'},
            {"order": 10, "text": "Tôi thích hoàn thành công việc đúng hạn.", "scoring": '{"poles":["J"],"reverse":false}'},
            {"order": 11, "text": "Tôi là người hướng ngoại, năng lượng đến từ giao tiếp.", "scoring": '{"poles":["E"],"reverse":false}'},
            {"order": 12, "text": "Tôi thích linh hoạt thích nghi với hoàn cảnh thay vì kiểm soát.", "scoring": '{"poles":["P"],"reverse":false}'},
        ],
        "mi": [
            {"order": 1, "text": "Tôi giỏi tư duy logic, giải toán và nhận ra các quy luật.", "scoring": '{"poles":["Logic-Toán học"],"reverse":false}'},
            {"order": 2, "text": "Tôi có trí nhớ hình ảnh tốt, nhớ bằng hình ảnh hơn lời nói.", "scoring": '{"poles":["Không gian"],"reverse":false}'},
            {"order": 3, "text": "Tôi nhạy cảm với âm thanh, giai điệu và nhịp điệu.", "scoring": '{"poles":["Âm nhạc"],"reverse":false}'},
            {"order": 4, "text": "Tôi học tốt bằng cách chạm vào, làm thí nghiệm và vận động.", "scoring": '{"poles":["Thể chất"],"reverse":false}'},
            {"order": 5, "text": "Tôi giỏi hiểu cảm xúc, động cơ của người khác.", "scoring": '{"poles":["Giao tiếp"],"reverse":false}'},
            {"order": 6, "text": "Tôi có tư duy sắc sảo, nhìn thấy mối liên hệ và sự đối lập.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}'},
            {"order": 7, "text": "Tôi có khả năng kể chuyện, dùng từ ngữ hiệu quả.", "scoring": '{"poles":["Ngôn ngữ"],"reverse":false}'},
            {"order": 8, "text": "Tôi giỏi nhìn tổng thể, tưởng tượng và sáng tạo.", "scoring": '{"poles":["Tồn tại"],"reverse":false}'},
            {"order": 9, "text": "Tôi học tốt nhất qua việc nghe giảng và thảo luận.", "scoring": '{"poles":["Âm nhạc"],"reverse":false}'},
            {"order": 10, "text": "Tôi giỏi vẽ, thiết kế và nắm bắt không gian 3D.", "scoring": '{"poles":["Không gian"],"reverse":false}'},
            {"order": 11, "text": "Tôi giỏi lập kế hoạch, quản lý thời gian và tổ chức.", "scoring": '{"poles":["Logic-Toán học"],"reverse":false}'},
            {"order": 12, "text": "Tôi hiểu sâu về thế giới tự nhiên và các hệ thống.", "scoring": '{"poles":["Tự nhiên"],"reverse":false}'},
        ],
    }
    for _t, _qs in _Q_BANK.items():
        for _q in _qs:
            db.merge(TestQuestion(
                test_type=_t, order=_q["order"], text=_q["text"],
                scoring_json=_q["scoring"],
            ))
    db.flush()

    # ---------- talent passport + certificates ----------
    for i, s in enumerate(students):
        db.add(TalentPassport(student_id=s.id, qr_code=f"TP-{1000 + i}"))
        db.add(Certificate(student_id=s.id, title="Chứng nhận Hoàn thành IoT Lab", issuer="FTalentHub", issued_at="2026-08-15"))
        db.add(Certificate(student_id=s.id, title="Giấy khen Sân chơi Sáng tạo", issuer="Trường THPT FTI", issued_at="2026-06-20"))
    db.flush()

    # ---------- projects ----------
    proj = [
        ("Hệ thống tưới cây tự động", "ky_thuat", 0, "Dự án IoT tưới cây thông minh dùng cảm biến độ ẩm."),
        ("App học tiếng Anh cho học sinh", "kinh_doanh", 1, "Ứng dụng luyện từ vựng theo chủ đề."),
        ("Triển lãm tranh 3D", "nghe_thuat", 2, "Triển lãm tranh in 3D do học sinh thiết kế."),
    ]
    projects = []
    _goals = [50_000_000, 30_000_000, 20_000_000]
    for idx, (title, field, owner_i, desc) in enumerate(proj):
        pr = Project(title=title, field=field, owner_student_id=students[owner_i].id, description=desc, status="active", funding_goal=_goals[idx], funded_total=0)
        projects.append(pr)
    db.add_all(projects)
    db.flush()
    for i, pr in enumerate(projects):
        db.add(ProjectMember(project_id=pr.id, student_id=students[i].id, role="Chủ dự án"))
        db.add(ProjectMember(project_id=pr.id, student_id=students[(i + 1) % len(students)].id, role="Thành viên"))
    db.flush()

    # ---------- internships ----------
    posts = [
        InternshipPost(enterprise_id=ent.id, title="Thực tập sinh Lập trình IoT", description="Tham gia team phát triển thiết bị thông minh.", required_skills="Python, C++, Arduino, MQTT", slots=3, status="open", deadline="2026-10-30"),
        InternshipPost(enterprise_id=ent.id, title="Thực tập sinh Marketing số", description="Hỗ trợ chiến dịch truyền thông sản phẩm.", required_skills="Facebook Ads, Google Analytics, Content Writing", slots=2, status="open", deadline="2026-11-15"),
    ]
    db.add_all(posts)
    db.flush()
    for i, p in enumerate(posts):
        db.add(InternshipApplication(post_id=p.id, student_id=students[i].id, status="pending" if i else "reviewing"))

    # ---------- sponsorships ----------
    db.add(Sponsorship(enterprise_id=ent.id, project_id=projects[0].id, amount=10_000_000, conditions="Báo cáo tiến độ hàng tháng", status="approved"))
    db.add(Sponsorship(enterprise_id=ent.id, project_id=projects[1].id, amount=5_000_000, conditions="Cam kết hoàn thành MVP trong 3 tháng", status="pending"))
    # Cập nhật funded_total cho projects
    for pr in projects:
        approved = db.query(func.coalesce(func.sum(Sponsorship.amount), 0)).filter(Sponsorship.project_id == pr.id, Sponsorship.status == "approved").scalar() or 0
        pr.funded_total = approved
    db.flush()

    # ---------- AI suggestions ----------
    db.add(AiSuggestion(student_id=students[0].id, kind="analysis", title="Phân tích năng lực", content="Bạn có năng lực nổi bật về IoT và Drone. Điểm mạnh: kỹ thuật, tư duy logic, tỉ mỉ."))
    for k, title in enumerate(["Tháng 1", "Tháng 2", "Tháng 3"]):
        db.add(AiSuggestion(student_id=students[0].id, kind="roadmap", title=title, content=f"Giai đoạn {k + 1}: hoàn thành khóa Arduino nâng cao, tham gia IoT Lab và xây dựng hồ sơ năng lực."))
    db.add(AiSuggestion(student_id=students[1].id, kind="analysis", title="Phân tích năng lực", content="Thế mạnh về nghệ thuật và sáng tạo thị giác. Nên phát triển thiết kế đồ họa."))
    db.flush()

    db.commit()
    counts = {
        "students": db.query(Student).count(),
        "teachers": db.query(Teacher).count(),
        "activities": db.query(Activity).count(),
        "registrations": db.query(ActivityRegistration).count(),
        "checkins": db.query(CheckIn).count(),
        "evaluations": db.query(Evaluation).count(),
        "passports": db.query(TalentPassport).count(),
        "internships": db.query(InternshipPost).count(),
    }
    print("Seed xong:", counts)
    print("Login demo (password demo123): hs01@ftalenthub.edu.vn | nguyen.van.hung@ftalenthub.edu.vn | bgh@ftalenthub.edu.vn | hr@techfpt.vn")
    db.close()


if __name__ == "__main__":
    run()