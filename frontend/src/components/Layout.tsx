import { CSSProperties } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Users,
  School,
  Building2,
  IdCard,
  LayoutDashboard,
  FileText,
  BarChart3,
  TrendingUp,
  Sparkles,
  QrCode,
  Award,
  Compass,
  CalendarDays,
  ClipboardCheck,
  Search,
  Briefcase,
  HandCoins,
  BookOpen,
  LogOut,
} from "lucide-react";
import { useAuth, roleLabel } from "../auth/AuthContext";
import { LogoMark, LogoWordmark } from "./Logo";

type PortalDef = {
  key: string;
  label: string;
  icon: typeof Users;
  accent: string;
  accentSoft: string;
  accentDark: string;
  hero: string;
  nav: string;
  cta: string;
  items: { to: string; label: string; icon: typeof Users }[];
};

const PORTALS: PortalDef[] = [
  {
    key: "student",
    label: "Học sinh",
    icon: GraduationCap,
    accent: "#A1458F",
    accentSoft: "#F9EEF7",
    accentDark: "#7E2F73",
    hero: "linear-gradient(100deg, #FF5A4E 0%, #EF4580 48%, #844BD2 100%)",
    nav: "linear-gradient(90deg, #FF7A3D 0%, #A1458F 100%)",
    cta: "linear-gradient(90deg, #F43F5E 0%, #A1458F 100%)",
    items: [
      { to: "/student", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/student/profile", label: "Hồ sơ năng lực", icon: FileText },
      { to: "/student/discover", label: "Khám phá năng khiếu", icon: Compass },
      { to: "/student/activities", label: "Hoạt động", icon: CalendarDays },
      { to: "/student/checkin", label: "Check-in QR", icon: QrCode },
      { to: "/student/badges", label: "Huy hiệu", icon: Award },
      { to: "/student/roadmap", label: "AI gợi ý", icon: Sparkles },
      { to: "/student/statistics", label: "Thống kê", icon: TrendingUp },
    ],
  },
  {
    key: "teacher",
    label: "Giáo viên",
    icon: Users,
    accent: "#27308E",
    accentSoft: "#ECEFF9",
    accentDark: "#1B2266",
    hero: "linear-gradient(100deg, #FBBF24 0%, #F97316 55%, #EA580C 100%)",
    nav: "linear-gradient(90deg, #FB9A29 0%, #F97316 100%)",
    cta: "linear-gradient(90deg, #FB9A29 0%, #EA580C 100%)",
    items: [
      { to: "/teacher", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/teacher/activities", label: "Sân chơi của tôi", icon: BookOpen },
      { to: "/teacher/grading", label: "Chấm điểm", icon: ClipboardCheck },
      { to: "/teacher/students", label: "Học viên", icon: Users },
    ],
  },
  {
    key: "school",
    label: "Nhà trường",
    icon: School,
    accent: "#9B6AB5",
    accentSoft: "#F4EEF8",
    accentDark: "#6E4390",
    hero: "linear-gradient(100deg, #F4417E 0%, #C345A9 50%, #7C57DB 100%)",
    nav: "linear-gradient(90deg, #EC4899 0%, #9B6AB5 100%)",
    cta: "linear-gradient(90deg, #EC4899 0%, #6E4390 100%)",
    items: [
      { to: "/school", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/school/analysis", label: "Phân tích năng lực", icon: BarChart3 },
      { to: "/school/reports", label: "Báo cáo", icon: FileText },
      { to: "/school/classes", label: "Lớp & Khối", icon: School },
    ],
  },
  {
    key: "enterprise",
    label: "Doanh nghiệp",
    icon: Building2,
    accent: "#C44296",
    accentSoft: "#FBEFF7",
    accentDark: "#922C6B",
    hero: "linear-gradient(100deg, #FF5A4E 0%, #EE3380 48%, #8842C8 100%)",
    nav: "linear-gradient(90deg, #F97316 0%, #C44296 100%)",
    cta: "linear-gradient(90deg, #F43F5E 0%, #922C6B 100%)",
    items: [
      { to: "/enterprise", label: "Tổng quan", icon: LayoutDashboard },
      { to: "/enterprise/talents", label: "Tìm nhân tài", icon: Search },
      { to: "/enterprise/internships", label: "Tuyển thực tập", icon: Briefcase },
      { to: "/enterprise/sponsorships", label: "Tài trợ dự án", icon: HandCoins },
    ],
  },
];

const PASSPORT_TONE = {
  accent: "#4858AC",
  soft: "#EEF0FA",
  dark: "#34428A",
  hero: "linear-gradient(100deg, #202F6B 0%, #34428A 55%, #542CB9 100%)",
  nav: "linear-gradient(90deg, #4858AC 0%, #34428A 100%)",
  cta: "linear-gradient(90deg, #4858AC 0%, #34428A 100%)",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const section = pathname.split("/")[1] || "student";
  const portal =
    PORTALS.find((p) => p.key === section) ||
    (section === "passport" ? ({} as PortalDef) : PORTALS[0]);
  const tone =
    section === "passport"
      ? PASSPORT_TONE
      : {
          accent: portal.accent,
          soft: portal.accentSoft,
          dark: portal.accentDark,
          hero: portal.hero,
          nav: portal.nav,
          cta: portal.cta,
        };

  const mainStyle = {
    "--portal": tone.accent,
    "--portal-soft": tone.soft,
    "--portal-dark": tone.dark,
    "--hero-gradient": tone.hero,
    "--nav-gradient": tone.nav,
    "--cta-gradient": tone.cta,
  } as CSSProperties;

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface sticky top-0">
        {/* Logo */}
        {/* Logo (bám slide: F navy + cánh cam + sao vàng, chữ navy một màu) */}
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
          <LogoMark size={36} />
          <LogoWordmark compact />
        </div>

        {/* Portals */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {PORTALS.map((p) => {
            const isOwn = p.key === user?.role;
            return (
              <div key={p.key}>
                <div className="mb-1.5 flex items-center gap-2 px-2">
                  <p.icon size={15} style={{ color: p.accent }} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {p.label}
                  </span>
                  {isOwn && (
                    <span
                      className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      style={{ backgroundColor: p.accentSoft, color: p.accent }}
                    >
                      Cổng của bạn
                    </span>
                  )}
                </div>
                <div
                  className="space-y-0.5 rounded-lg p-1"
                  style={{ backgroundColor: isOwn ? p.accentSoft + "55" : undefined }}
                >
                  {p.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? "font-semibold text-white"
                            : "text-ink-soft hover:bg-canvas-soft"
                        }`
                      }
                      style={({ isActive }) =>
                        isActive ? { background: p.nav, color: "#fff" } : undefined
                      }
                    >
                      <item.icon size={16} className="shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Passport shortcut */}
        <div className="px-3 pb-3">
          <NavLink
            to="/passport/1"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                isActive ? "border-transparent text-white" : "border-line hover:bg-canvas-soft"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: PASSPORT_TONE.accent }
                : { color: PASSPORT_TONE.accent }
            }
          >
            <IdCard size={16} />
            Talent Passport
          </NavLink>
        </div>

        {/* User card */}
        {user && (
          <div className="px-3 pb-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas-soft/70 px-3 py-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand) 0%, #A1458F 100%)",
                }}
              >
                {user.full_name
                  .split(" ")
                  .slice(-2)
                  .map((w) => w[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {user.full_name}
                </div>
                <div className="text-[11px] font-medium" style={{ color: tone.accent }}>
                  {roleLabel(user.role)}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="text-muted transition-colors hover:text-red-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      <main
        className="relative min-w-0 flex-1 p-6 lg:p-8"
        style={mainStyle}
      >
        {/* Trang trí nền bám slide: blob cam góc phải + sóng navy đáy */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.10]"
            style={{ background: "radial-gradient(circle, #F97316 0%, transparent 70%)" }}
          />
          <svg
            className="absolute bottom-0 left-0 w-full opacity-[0.05]"
            height="90"
            viewBox="0 0 1440 90"
            preserveAspectRatio="none"
          >
            <path
              d="M0,60 C240,90 480,20 720,45 C960,70 1200,30 1440,55 L1440,90 L0,90 Z"
              fill="#1B2A5E"
            />
          </svg>
        </div>
        <div className="relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}