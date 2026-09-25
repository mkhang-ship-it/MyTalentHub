import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Mail,
  Loader2,
  Sparkle,
  GraduationCap,
  Users,
  School,
  Building2,
  User,
  Building,
  BookOpen,
  Dumbbell,
} from "lucide-react";
import { useAuth, roleHome, type AuthUser } from "../auth/AuthContext";
import { LogoMark } from "../components/Logo";

type RoleDef = {
  role: AuthUser["role"];
  label: string;
  icon: typeof Users;
  color: string;
  colorSoft: string;
  colorDark: string;
};

const ROLE_DEFS: RoleDef[] = [
  {
    role: "student",
    label: "Học sinh",
    icon: GraduationCap,
    color: "#A1458F",
    colorSoft: "#F9EEF7",
    colorDark: "#7E2F73",
  },
  {
    role: "teacher",
    label: "Giáo viên",
    icon: Users,
    color: "#27308E",
    colorSoft: "#ECEFF9",
    colorDark: "#1B2266",
  },
  {
    role: "school",
    label: "Nhà trường",
    icon: School,
    color: "#9B6AB5",
    colorSoft: "#F4EEF8",
    colorDark: "#6E4390",
  },
  {
    role: "enterprise",
    label: "Doanh nghiệp",
    icon: Building2,
    color: "#C44296",
    colorSoft: "#FBEFF7",
    colorDark: "#922C6B",
  },
  {
    role: "coach",
    label: "Huấn luyện viên",
    icon: Dumbbell,
    color: "#0F766E",
    colorSoft: "#E6FFFA",
    colorDark: "#0B4F4A",
  },
];

const EDUCATION_LEVELS = [
  { value: "THCS", label: "THCS" },
  { value: "THPT", label: "THPT" },
  { value: "CDDH", label: "Cao đẳng / Đại học" },
] as const;

type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];

function getGradeOptions(level: EducationLevel): { value: string; label: string }[] {
  if (level === "THCS") {
    return [
      { value: "6", label: "Khối 6" },
      { value: "7", label: "Khối 7" },
      { value: "8", label: "Khối 8" },
      { value: "9", label: "Khối 9" },
    ];
  }
  if (level === "THPT") {
    return [
      { value: "10", label: "Khối 10" },
      { value: "11", label: "Khối 11" },
      { value: "12", label: "Khối 12" },
    ];
  }
  // CDDH
  return [
    { value: "1", label: "Khoá 1" },
    { value: "2", label: "Khoá 2" },
    { value: "3", label: "Khoá 3" },
    { value: "4", label: "Khoá 4" },
    { value: "5", label: "Khoá 5" },
    { value: "6", label: "Khoá 6" },
    { value: "7", label: "Khoá 7" },
    { value: "8", label: "Khoá 8" },
  ];
}

function RoleFields({
  selectedRole,
  formData,
  setFormData,
}: {
  selectedRole: AuthUser["role"];
  formData: RegisterFormData;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormData>>;
}) {
  const level = selectedRole === "student"
    ? (formData.education_level as EducationLevel) || "THPT"
    : selectedRole === "teacher"
      ? (formData.education_level_teacher as EducationLevel) || "THPT"
      : selectedRole === "school"
        ? (formData.education_level_school as EducationLevel) || "THPT"
        : "THPT";

  const gradeOptions = getGradeOptions(level);
  const gradeLabel = level === "CDDH" ? "Khoá" : "Khối";

  switch (selectedRole) {
    case "student":
      return (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp học</label>
            <div className="relative mt-1.5">
              <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <select
                required
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                className="input-control pl-9 pr-8 appearance-none"
              >
                <option value="">Chọn cấp học</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Lớp</label>
            <div className="relative mt-1.5">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                required
                value={formData.class_name}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                placeholder="Ví dụ: 10A1"
                className="input-control pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">{gradeLabel}</label>
            <div className="relative mt-1.5">
              <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <select
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="input-control pl-9 pr-8 appearance-none"
              >
                <option value="">Chọn {gradeLabel.toLowerCase()}</option>
                {gradeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      );
    case "teacher":
      return (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp quản lý</label>
            <div className="relative mt-1.5">
              <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <select
                required
                value={formData.education_level_teacher}
                onChange={(e) => setFormData({ ...formData, education_level_teacher: e.target.value })}
                className="input-control pl-9 pr-8 appearance-none"
              >
                <option value="">Chọn cấp quản lý</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Môn dạy</label>
            <div className="relative mt-1.5">
              <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ví dụ: Toán, Văn, Anh, Lý..."
                className="input-control pl-9"
              />
            </div>
          </div>
        </>
      );
    case "coach":
      return (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp quản lý</label>
            <div className="relative mt-1.5">
              <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <select
                required
                value={formData.education_level_coach}
                onChange={(e) => setFormData({ ...formData, education_level_coach: e.target.value })}
                className="input-control pl-9 pr-8 appearance-none"
              >
                <option value="">Chọn cấp quản lý</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Chuyên môn</label>
            <div className="relative mt-1.5">
              <Dumbbell size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                required
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="Ví dụ: Bơi lội, Bóng đá, Võ thuật..."
                className="input-control pl-9"
              />
            </div>
          </div>
        </>
      );
    case "school":
      return (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Cấp quản lý</label>
            <div className="relative mt-1.5">
              <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <select
                required
                value={formData.education_level_school}
                onChange={(e) => setFormData({ ...formData, education_level_school: e.target.value })}
                className="input-control pl-9 pr-8 appearance-none"
              >
                <option value="">Chọn cấp quản lý</option>
                {EDUCATION_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Tên trường</label>
            <div className="relative mt-1.5">
              <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                required
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                placeholder="Ví dụ: THPT FTI"
                className="input-control pl-9"
              />
            </div>
          </div>
        </>
      );
    case "enterprise":
      return (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Tên công ty</label>
            <div className="relative mt-1.5">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Ví dụ: Công ty TNHH TechFPT"
                className="input-control pl-9"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">Ngành nghề</label>
            <div className="relative mt-1.5">
              <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Ví dụ: Công nghệ thông tin"
                className="input-control pl-9"
              />
            </div>
          </div>
        </>
      );
    default:
      return null;
  }
}

type RegisterFormData = {
  full_name: string;
  email: string;
  password: string;
  role: AuthUser["role"];
  class_name: string;
  grade: string;
  education_level: string; // student
  subject: string;
  education_level_teacher: string; // teacher
  specialty: string; // coach
  education_level_coach: string; // coach
  school_name: string;
  education_level_school: string; // school
  company_name: string;
  industry: string;
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<AuthUser["role"]>("student");
  const [formData, setFormData] = useState<RegisterFormData>({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    class_name: "",
    grade: "",
    education_level: "THPT",
    subject: "",
    education_level_teacher: "THPT",
    specialty: "",
    education_level_coach: "THPT",
    school_name: "",
    education_level_school: "THPT",
    company_name: "",
    industry: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleDef = ROLE_DEFS.find((r) => r.role === selectedRole)!;

  // Update role in formData when selectedRole changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
  }, [selectedRole]);

  // Reset grade when education_level changes (student)
  useEffect(() => {
    if (selectedRole === "student") {
      setFormData((prev) => ({ ...prev, grade: "" }));
    }
  }, [formData.education_level, selectedRole]);

  // Reset grade when education_level_teacher changes (teacher doesn't have grade, but for consistency)
  // Teacher doesn't use grade field, but we keep the pattern

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (selectedRole === "coach" && !formData.specialty.trim()) {
      setError("Chuyên môn không được để trống");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        grade: formData.grade ? Number(formData.grade) : undefined,
      };
      const user = await register(payload);
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "linear-gradient(160deg, #FDF7F1 0%, #F7EFF7 55%, #EEEBF7 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <LogoMark size={64} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#1B2A5E" }}>
            FTalentHub
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Discover Talent · Develop Skills · Create Future
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-lift">
          <h2 className="text-lg font-bold text-ink">Đăng ký tài khoản</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted">
            Chọn vai trò và điền thông tin để tham gia hệ sinh thái FTalentHub
          </p>

          {/* Role selector */}
          <div className="mb-5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              Vai trò của bạn
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_DEFS.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setSelectedRole(r.role)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center text-xs transition-all duration-200 ${
                    selectedRole === r.role
                      ? "border-2 shadow-[0_0_0_2px]"
                      : "border-line hover:border-transparent"
                  }`}
                  style={{
                    backgroundColor:
                      selectedRole === r.role ? r.colorSoft + "80" : r.colorSoft + "55",
                    borderColor: selectedRole === r.role ? r.color : "transparent",
                    color: selectedRole === r.role ? r.colorDark : "inherit",
                  }}
                >
                  <r.icon size={20} className="shrink-0" style={{ color: r.color }} />
                  <span className="font-semibold text-ink truncate">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Họ tên
              </label>
              <div className="relative mt-1.5">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="input-control pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ban@ftalenthub.edu.vn"
                  className="input-control pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Mật khẩu
              </label>
              <div className="relative mt-1.5">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-control pl-9"
                />
              </div>
            </div>

            {/* Role-specific fields */}
            <div className="space-y-4 pt-2 border-t border-line">
              <RoleFields selectedRole={selectedRole} formData={formData} setFormData={setFormData} />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${roleDef.color} 0%, ${roleDef.colorDark} 100%)`,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkle size={16} />}
              {loading ? "Đang đăng ký…" : "Đăng ký"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted">
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-portal hover:underline"
            >
              Đăng nhập
            </button>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Team FPI Cần Thơ · Discover Talent · Develop Skills · Create Future
        </p>
      </div>
    </div>
  );
}