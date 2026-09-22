"""ORM models — ánh xạ 4 cổng + Talent Passport theo 35 slide."""
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# ---------------------------------------------------------------- users
ROLE_STUDENT = "student"
ROLE_TEACHER = "teacher"
ROLE_SCHOOL = "school"
ROLE_ENTERPRISE = "enterprise"
ROLES = (ROLE_STUDENT, ROLE_TEACHER, ROLE_SCHOOL, ROLE_ENTERPRISE)


class AuthToken(Base):
    """Phiên đăng nhập — token ngẫu nhiên lưu DB (demo, không cần JWT dep)."""

    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    role: Mapped[str] = mapped_column(String(20), index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    class_name: Mapped[str] = mapped_column(String(40), index=True)  # "10A1"
    grade: Mapped[int] = mapped_column(Integer, index=True)  # 10 | 11 | 12
    talent_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    experience_hours: Mapped[float] = mapped_column(Float, default=0.0)
    interests: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(lazy="joined")


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    subject: Mapped[str] = mapped_column(String(80), default="")
    is_homeroom: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(lazy="joined")


class School(Base):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    school_name: Mapped[str] = mapped_column(String(160), default="")
    user: Mapped["User"] = relationship(lazy="joined")


class Enterprise(Base):
    __tablename__ = "enterprises"

    id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(160), default="")
    industry: Mapped[str] = mapped_column(String(80), default="")
    user: Mapped["User"] = relationship(lazy="joined")


# ---------------------------------------------------------------- classes
class ClassGroup(Base):
    """Lớp học — homeroom teacher."""

    __tablename__ = "class_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)  # "10A1"
    grade: Mapped[int] = mapped_column(Integer, index=True)
    homeroom_teacher_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teachers.id"), nullable=True
    )


# ---------------------------------------------------------------- capabilities
class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)  # "chuyen_mon"
    name: Mapped[str] = mapped_column(String(120))  # "Chuyên môn"
    category: Mapped[str] = mapped_column(String(40), default="chuyen_mon")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)


class StudentSkill(Base):
    __tablename__ = "student_skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), index=True
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), index=True)
    level: Mapped[float] = mapped_column(Float, default=0.0)  # 0-10


class TalentAssessment(Base):
    """Kết quả test năng khiếu: Holland / DISC / MBTI / MI."""

    __tablename__ = "talent_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    test_type: Mapped[str] = mapped_column(String(20))  # holland|disc|mbti|mi
    result_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class TestQuestion(Base):
    """Ngân hàng câu hỏi test năng khiếu — thang Likert 1-5.

    options_json: ["Hoàn toàn không đúng", ..., "Hoàn toàn đúng"] (chung, 5 option).
    scoring_json: {"poles": ["Kỹ thuật", "Nghệ thuật"], "reverse": false}
      — cộng (6 - answer) vào mỗi pole nếu reverse=true, else cộng answer.
    """

    __tablename__ = "test_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_type: Mapped[str] = mapped_column(String(20), index=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    scoring_json: Mapped[str] = mapped_column(Text, default="{}")
    options_json: Mapped[str] = mapped_column(Text, default='["Hoàn toàn không đúng","Không đúng","Không chắc","Đúng","Hoàn toàn đúng"]')


# ---------------------------------------------------------------- activities
FIELD_ART = "nghe_thuat"
FIELD_SPORT = "the_thao"
FIELD_BUSINESS = "kinh_doanh"
FIELD_TECH = "ky_thuat"
FIELD_ACADEMIC = "hoc_thuat"
FIELD_CREATIVE = "sang_tao"
FIELDS = (
    FIELD_ART,
    FIELD_SPORT,
    FIELD_BUSINESS,
    FIELD_TECH,
    FIELD_ACADEMIC,
    FIELD_CREATIVE,
)


class Activity(Base):
    """Sân chơi / hoạt động (lab, CLB, workshop, cuộc thi)."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    field: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("teachers.id"), nullable=True
    )
    capacity: Mapped[int] = mapped_column(Integer, default=30)
    start_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    end_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open|closed
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class ActivityRegistration(Base):
    __tablename__ = "activity_registrations"

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id"), index=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    role: Mapped[str] = mapped_column(String(60), default="Thành viên")
    status: Mapped[str] = mapped_column(String(20), default="registered")
    hours: Mapped[float] = mapped_column(Float, default=0.0)
    registered_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class CheckIn(Base):
    """Check-in QR tại điểm hoạt động — tự cộng giờ trải nghiệm."""

    __tablename__ = "checkins"

    id: Mapped[int] = mapped_column(primary_key=True)
    registration_id: Mapped[int] = mapped_column(
        ForeignKey("activity_registrations.id"), index=True
    )
    qr_code: Mapped[str] = mapped_column(String(40))
    hours_added: Mapped[float] = mapped_column(Float, default=1.0)
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


# ---------------------------------------------------------------- evaluation
class Evaluation(Base):
    """Chấm điểm năng lực theo 4 tiêu chí (rubric 40/20/20/20)."""

    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id"), index=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    chuyen_mon: Mapped[float] = mapped_column(Float, default=0.0)
    sang_tao: Mapped[float] = mapped_column(Float, default=0.0)
    lam_viec_nhom: Mapped[float] = mapped_column(Float, default=0.0)
    ky_luat: Mapped[float] = mapped_column(Float, default=0.0)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    @property
    def total(self) -> float:
        return round(
            self.chuyen_mon + self.sang_tao + self.lam_viec_nhom + self.ky_luat, 1
        )


# ---------------------------------------------------------------- badges
class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    min_hours: Mapped[int] = mapped_column(Integer)
    icon: Mapped[str] = mapped_column(String(40), default="star")
    color: Mapped[str] = mapped_column(String(40), default="blue")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class StudentBadge(Base):
    __tablename__ = "student_badges"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    badge_id: Mapped[int] = mapped_column(ForeignKey("badges.id"), index=True)
    earned_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


# ---------------------------------------------------------------- talent passport
class TalentPassport(Base):
    __tablename__ = "talent_passports"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id"), unique=True, index=True
    )
    qr_code: Mapped[str] = mapped_column(String(40), unique=True)  # "TP-0001"
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    student: Mapped["Student"] = relationship(lazy="joined")


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    issuer: Mapped[str] = mapped_column(String(120), default="FTalentHub")
    issued_at: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    field: Mapped[str] = mapped_column(String(40), index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    funding_goal: Mapped[float] = mapped_column(Float, default=0.0)  # VNĐ
    funded_total: Mapped[float] = mapped_column(Float, default=0.0)  # VNĐ đã tài trợ
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class ProjectMember(Base):
    __tablename__ = "project_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    role: Mapped[str] = mapped_column(String(60), default="Thành viên")


# ---------------------------------------------------------------- enterprise
class InternshipPost(Base):
    __tablename__ = "internship_posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    enterprise_id: Mapped[int] = mapped_column(
        ForeignKey("enterprises.id"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    required_skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slots: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(20), default="open")
    deadline: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class InternshipApplication(Base):
    __tablename__ = "internship_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("internship_posts.id"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    applied_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class Sponsorship(Base):
    __tablename__ = "sponsorships"

    id: Mapped[int] = mapped_column(primary_key=True)
    enterprise_id: Mapped[int] = mapped_column(
        ForeignKey("enterprises.id"), index=True
    )
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


class InterviewInvitation(Base):
    __tablename__ = "interview_invitations"

    id: Mapped[int] = mapped_column(primary_key=True)
    enterprise_id: Mapped[int] = mapped_column(
        ForeignKey("enterprises.id"), index=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent, accepted, declined
    sent_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


# ---------------------------------------------------------------- ai
class AiSuggestion(Base):
    __tablename__ = "ai_suggestions"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(40), default="roadmap")  # analysis|roadmap
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )


# ---------------------------------------------------------------- school admin
class TeacherClassAssignment(Base):
    __tablename__ = "teacher_class_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    class_group_id: Mapped[int] = mapped_column(
        ForeignKey("class_groups.id"), index=True
    )