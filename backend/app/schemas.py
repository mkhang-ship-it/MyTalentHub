"""Pydantic schemas — response models cho 4 cổng."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


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


class ForgotPasswordIn(BaseModel):
    """Yêu cầu gửi link đặt lại mật khẩu.

    Không có trường nào khác: endpoint luôn trả cùng một thông điệp dù email
    có tồn tại hay không, nên không gửi gì quá nhiều cũng không lộ thông tin.
    """

    email: str = Field(min_length=3, max_length=160)


class ResetPasswordIn(BaseModel):
    """Đặt mật khẩu mới bằng token trong link."""

    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)

    def model_post_init(self, __context):
        # 8 ký tự là mức tối thiểu hợp lý cho mật khẩu mới. Không ép phức tạp
        # hơn (ký tự đặc biệt, bảng chữ cái…) vì người dùng hay bỏ qua và
        # quay lại dùng mật khẩu yếu — cấm chặn cứng cũng không làm họ mạnh hơn.
        if not self.new_password.strip():
            raise ValueError("Mật khẩu không được để trống")
        if self.new_password == self.new_password.lower():
            raise ValueError("Mật khẩu nên có ít nhất một chữ hoa")
        if not any(c.isdigit() for c in self.new_password):
            raise ValueError("Mật khẩu nên có ít nhất một chữ số")


class RegisterIn(BaseModel):
    full_name: str
    email: str
    password: str
    role: str  # student | teacher | coach | school | enterprise    # Student fields
    class_name: Optional[str] = None
    grade: Optional[int] = None
    education_level: Optional[str] = None  # THCS | THPT | CDDH
    # Teacher fields
    subject: Optional[str] = None
    education_level_teacher: Optional[str] = None  # THCS | THPT | CDDH
    # Coach fields
    specialty: Optional[str] = None
    education_level_coach: Optional[str] = None  # THCS | THPT | CDDH
    bio: Optional[str] = None
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
        if self.role not in ("student", "teacher", "coach", "school", "enterprise"):
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
        if self.role == "coach":
            if not self.specialty or not self.specialty.strip():
                raise ValueError("Chuyên môn không được để trống")
            if self.education_level_coach and self.education_level_coach not in valid_levels:
                raise ValueError("Cấp học không hợp lệ")
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
# Giới hạn độ dài đặt CAO HƠN giá trị dài nhất trong dữ liệu seed, nên không
# làm hỏng dữ liệu sẵn có mà vẫn chặn payload khổng lồ.
MAX_TEXT = 2000
MAX_TITLE = 200
MAX_CLASS_NAME = 40


class TeacherOut(ORMModel):
    id: int
    subject: str
    is_homeroom: bool
    education_level: str
    user: UserOut


class EvaluationIn(BaseModel):
    activity_id: int
    student_id: int
    chuyen_mon: float = Field(default=0, ge=0, le=40)
    sang_tao: float = Field(default=0, ge=0, le=20)
    lam_viec_nhom: float = Field(default=0, ge=0, le=20)
    ky_luat: float = Field(default=0, ge=0, le=20)
    comment: Optional[str] = Field(default=None, max_length=MAX_TEXT)


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
    title: str = Field(min_length=1, max_length=MAX_TITLE)
    field: str = Field(min_length=1, max_length=40)
    description: Optional[str] = Field(default=None, max_length=MAX_TEXT)
    capacity: int = Field(default=30, ge=1, le=10_000)
    start_date: Optional[str] = Field(default=None, max_length=20)
    end_date: Optional[str] = Field(default=None, max_length=20)


class ActivityOut(ActivityIn, ORMModel):
    id: int
    teacher_id: Optional[int] = None
    status: str = "open"
    registered_count: int = 0


class ActivityUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=MAX_TITLE)
    field: Optional[str] = Field(default=None, min_length=1, max_length=40)
    description: Optional[str] = Field(default=None, max_length=MAX_TEXT)
    capacity: Optional[int] = Field(default=None, ge=1, le=10_000)
    start_date: Optional[str] = Field(default=None, max_length=20)
    end_date: Optional[str] = Field(default=None, max_length=20)
    status: Optional[str] = None


class ActivityStatusUpdate(BaseModel):
    status: str = Field(pattern="^(open|paused|closed)$")


# ---------------- class group
class ClassIn(BaseModel):
    name: str = Field(min_length=1, max_length=MAX_CLASS_NAME)
    grade: int = Field(ge=1, le=12)


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


# ---------------- school — nhập dữ liệu CSV (G5)
class StudentImportIn(BaseModel):
    """Nội dung file CSV dạng text (POST /school/import/students)."""

    content: str = ""