"""Pydantic schemas — response models cho 4 cổng."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------- users
class UserOut(ORMModel):
    id: int
    role: str
    full_name: str
    email: str
    avatar_url: Optional[str] = None
    profile_id: Optional[int] = None
    detail: Optional[dict] = None


class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    full_name: str
    email: str
    password: str
    role: str  # student | teacher | school | enterprise
    # Student fields
    class_name: Optional[str] = None
    grade: Optional[int] = None
    education_level: Optional[str] = None  # THCS | THPT | CDDH
    # Teacher fields
    subject: Optional[str] = None
    education_level_teacher: Optional[str] = None  # THCS | THPT | CDDH
    # School fields
    school_name: Optional[str] = None
    education_level_school: Optional[str] = None  # THCS | THPT | CDDH
    # Enterprise fields
    company_name: Optional[str] = None
    industry: Optional[str] = None

    def model_post_init(self, __context):
        if not self.full_name or not self.full_name.strip():
            raise ValueError("Họ tên không được để trống")
        if not self.email or not self.email.strip():
            raise ValueError("Email không được để trống")
        if not self.password or len(self.password) < 6:
            raise ValueError("Mật khẩu phải có ít nhất 6 ký tự")
        if self.role not in ("student", "teacher", "school", "enterprise"):
            raise ValueError("Vai trò không hợp lệ")

        valid_levels = ("THCS", "THPT", "CDDH")
        # Role-specific validation
        if self.role == "student":
            if not self.class_name or not self.class_name.strip():
                raise ValueError("Lớp không được để trống")
            level = self.education_level or "THPT"
            if level not in valid_levels:
                raise ValueError("Cấp học không hợp lệ")
            if level == "THCS":
                if not self.grade or self.grade not in (6, 7, 8, 9):
                    raise ValueError("Khối THCS phải từ 6 đến 9")
            elif level == "THPT":
                if not self.grade or self.grade not in (10, 11, 12):
                    raise ValueError("Khối THPT phải là 10, 11 hoặc 12")
            else:  # CDDH
                if not self.grade or not (1 <= self.grade <= 8):
                    raise ValueError("Khoá phải từ 1 đến 8")
        if self.role == "teacher":
            if not self.subject or not self.subject.strip():
                raise ValueError("Môn dạy không được để trống")
            level = self.education_level_teacher or "THPT"
            if level not in valid_levels:
                raise ValueError("Cấp quản lý không hợp lệ")
        if self.role == "school":
            if not self.school_name or not self.school_name.strip():
                raise ValueError("Tên trường không được để trống")
            level = self.education_level_school or "THPT"
            if level not in valid_levels:
                raise ValueError("Cấp quản lý không hợp lệ")
        if self.role == "enterprise":
            if not self.company_name or not self.company_name.strip():
                raise ValueError("Tên công ty không được để trống")


class LoginOut(BaseModel):
    token: str
    user: UserOut


# ---------------- student
class StudentOut(ORMModel):
    id: int
    class_name: str
    grade: int
    education_level: str
    talent_score: float
    experience_hours: float
    interests: Optional[str] = None
    bio: Optional[str] = None
    user: UserOut


class StudentDetail(StudentOut):
    badges: list = []
    skills: list = []
    evaluations: list = []


# ---------------- teacher
class TeacherOut(ORMModel):
    id: int
    subject: str
    is_homeroom: bool
    education_level: str
    user: UserOut


class EvaluationIn(BaseModel):
    activity_id: int
    student_id: int
    chuyen_mon: float = 0
    sang_tao: float = 0
    lam_viec_nhom: float = 0
    ky_luat: float = 0
    comment: Optional[str] = None


class EvaluationOut(EvaluationIn, ORMModel):
    id: int
    teacher_id: int
    evaluated_at: datetime
    total: float = 0


# ---------------- assessment (test năng khiếu)
class QuestionOut(ORMModel):
    id: int
    test_type: str
    order: int
    text: str
    options: list[str]
    scoring: dict


class ComputeIn(BaseModel):
    test_type: str
    answers: list[int]  # answer index 0-4 per question, ordered by question order


class ComputeOut(ORMModel):
    test_type: str
    result: dict  # {"type": "E", "top": [...], "poles": {...}, "score": 78}
    label: str
    detail: str


# ---------------- activity
class ActivityIn(BaseModel):
    title: str
    field: str
    description: Optional[str] = None
    capacity: int = 30
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ActivityOut(ActivityIn, ORMModel):
    id: int
    teacher_id: Optional[int] = None
    status: str = "open"
    registered_count: int = 0


class ActivityUpdate(BaseModel):
    title: Optional[str] = None
    field: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    status: Optional[str] = None


class ActivityStatusUpdate(BaseModel):
    status: str


# ---------------- class group
class ClassIn(BaseModel):
    name: str
    grade: int


class ClassOut(BaseModel):
    id: int
    name: str
    grade: int
    homeroom_teacher_name: str
    student_count: int


class ClassStudentOut(BaseModel):
    id: int
    full_name: str
    grade: int
    class_name: str


# ---------------- teacher me
class TeacherMeOut(BaseModel):
    id: int
    full_name: str
    subject: str
    education_level: str
    allowed_grades: list[int]


# ---------------- enterprise
class InternshipPostIn(BaseModel):
    title: str
    description: Optional[str] = None
    required_skills: Optional[str] = None
    slots: int = 3
    deadline: Optional[str] = None
    status: Optional[str] = None

    def model_post_init(self, __context):
        if not self.title or not self.title.strip():
            raise ValueError("Tiêu đề không được để trống")
        if self.slots <= 0:
            raise ValueError("Số vị trí phải lớn hơn 0")
        if self.deadline:
            from datetime import date
            try:
                deadline_date = date.fromisoformat(self.deadline)
                if deadline_date < date.today():
                    raise ValueError("Hạn nộp phải là ngày hôm nay hoặc trong tương lai")
            except ValueError as e:
                if "Hạn nộp" in str(e):
                    raise
                raise ValueError("Định dạng ngày không hợp lệ (YYYY-MM-DD)")


class InternshipPostOut(InternshipPostIn, ORMModel):
    id: int
    enterprise_id: int
    status: str = "open"
    created_at: datetime
    applicant_count: int = 0


class SponsorshipIn(BaseModel):
    project_id: int
    amount: float = 5_000_000
    conditions: Optional[str] = None

    def model_post_init(self, __context):
        if self.amount <= 0:
            raise ValueError("Số tiền tài trợ phải lớn hơn 0")
        if not self.project_id:
            raise ValueError("Phải chọn dự án để tài trợ")


class SponsorshipOut(ORMModel):
    id: int
    enterprise_id: int
    project_id: int
    amount: float
    conditions: Optional[str] = None
    status: str
    created_at: datetime
    project_title: Optional[str] = None
    project_field: Optional[str] = None


class InterviewInvitationIn(BaseModel):
    student_id: int
    message: Optional[str] = None


class InterviewInvitationOut(ORMModel):
    id: int
    enterprise_id: int
    student_id: int
    message: Optional[str] = None
    status: str
    sent_at: datetime
    responded_at: Optional[datetime] = None


# ---------------- passport
class PassportOut(ORMModel):
    student_id: int
    qr_code: str
    updated_at: datetime
    student: StudentOut | None = None
    certificates: list = []
    projects: list = []
    activities: list = []
    skills: list = []
    badges: list = []