import { CSSProperties, useEffect, useState } from "react";
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
  Menu,
  ChevronRight,
  Star,
  Home,
} from "lucide-react";
import { useAuth, roleLabel } from "../auth/AuthContext";
import { LogoMark, LogoWordmark } from "./Logo";
import { PageTransition } from "./motion";

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
      { to: "/passport/1", label: "Talent Passport", icon: IdCard },
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

type Tone = {
  accent: string;
  accentSoft?: string;
  accentDark?: string;
  hero: string;
  nav: string;
  cta: string;
};

const PASSPORT_TONE: Tone = {
  accent: "#4858AC",
  accentSoft: "#EEF0FA",
  accentDark: "#34428A",
  hero: "linear-gradient(100deg, #202F6B 0%, #34428A 55%, #542CB9 100%)",
  nav: "linear-gradient(90deg, #4858AC 0%, #34428A 100%)",
  cta: "linear-gradient(90deg, #4858AC 0%, #34428A 100%)",
};

function NavItem({ item, p }: { item: { to: string; label: string; icon: typeof Users }; p: PortalDef }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 ease-out ${
          isActive
            ? "font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
            : "text-ink-soft hover:-translate-y-0.5 hover:bg-canvas-soft hover:text-ink hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        }`
      }
      style={({ isActive }) =>
        isActive
          ? {
              background: p.nav,
              color: "#fff",
              boxShadow: `0 4px 14px ${p.accent}30`,
            }
          : undefined
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <item.icon
            size={16}
            className={`shrink-0 transition-transform duration-200 ${
              isActive ? "scale-110" : ""
            }`}
          />
          <span className="truncate">{item.label}</span>
          {isActive && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60">
              <ChevronRight size={12} />
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const section = pathname.split("/")[1] || "student";
  const activePortal = PORTALS.find((p) => p.key === user?.role) || PORTALS[0];
  const portal = activePortal;
  const tone: Tone =
    section === "passport"
      ? PASSPORT_TONE
      : {
          accent: activePortal.accent,
          accentSoft: activePortal.accentSoft || undefined,
          accentDark: activePortal.accentDark || undefined,
          hero: activePortal.hero,
          nav: activePortal.nav,
          cta: activePortal.cta,
        };

  const mainStyle = {
    "--portal": tone.accent,
    "--portal-soft": tone.accentSoft || tone.accent,
    "--portal-dark": tone.accentDark || tone.accent,
    "--hero-gradient": tone.hero,
    "--nav-gradient": tone.nav,
    "--cta-gradient": tone.cta,
  } as CSSProperties;

  // Close drawer on resize to desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) {
        setDrawerOpen(false);
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const isOwn = user ? portal.key === user.role : false;

  return (
    <div className="flex min-h-screen bg-canvas font-sans">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Desktop sidebar / Mobile drawer */}
      <aside
        className={`
          fixed lg:sticky lg:top-0 z-50 lg:z-0
          flex h-screen w-[280px] shrink-0 flex-col border-r border-line bg-surface
          transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          lg:translate-x-0
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ boxShadow: "0 0 0 transparent" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
          <LogoMark size={36} />
          <LogoWordmark compact />
        </div>

        {/* Home link - Desktop sidebar */}
        <div className="px-4 py-3 border-b border-line">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ease-out text-ink-soft hover:-translate-y-0.5 hover:bg-canvas-soft hover:text-ink hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            title="Về trang chủ"
            aria-label="Về trang chủ"
          >
            <Home size={16} className="shrink-0" />
            <span className="truncate">Về trang chủ</span>
          </NavLink>
        </div>

        {/* Active role state badge */}
        <div className="px-4 pt-3">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest shadow-sm transition-all duration-300 hover:shadow-md"
            style={{
              backgroundColor: tone.accentSoft,
              color: tone.accentDark,
              border: `1px solid ${tone.accentSoft}`,
            }}
          >
            <Star size={12} strokeWidth={2.5} />
            {isOwn ? "Cổng đang hoạt động" : "Trải nghiệm cổng"}
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-muted">
            {roleLabel(user?.role)} · {portal.label}
          </div>
        </div>

        {/* Active role navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scroll-smooth">
          <div className="group">
            <div className="mb-2 flex items-center gap-2 px-2">
              <span
                className="rounded-md p-0.5 transition-transform duration-300 ease-out group-hover:scale-110"
                style={{ color: activePortal.accent }}
              >
                <activePortal.icon size={17} strokeWidth={2.2} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {activePortal.label}
              </span>
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide shadow-[0_1px_2px_rgb(0,0,0,0.05)]"
                style={{ backgroundColor: activePortal.accentSoft, color: activePortal.accentDark }}
              >
                Bạn
              </span>
            </div>
            <div
              className="space-y-0.5 rounded-xl p-1 transition-colors duration-300"
              style={{ backgroundColor: `${activePortal.accentSoft}40` }}
            >
              {activePortal.items.map((item) => (
                <NavItem key={item.to} item={item} p={activePortal} />
              ))}
            </div>
          </div>
        </nav>

        {/* User card */}
        {user && (
          <div className="px-3 pb-4">
            <div
              className="flex items-center gap-3 rounded-2xl border border-line bg-canvas-soft/70 px-3 py-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(51,50,77,0.08)] hover:bg-canvas-soft/90"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition-transform duration-300 hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--brand) 0%, #A1458F 100%)",
                }}
              >
                {user.full_name
                  .split(" ")
                  .slice(-2)
                  .map((w) => w[0])
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold text-ink tracking-tight">
                  {user.full_name}
                </div>
                <div
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: tone.accentDark }}
                >
                  {roleLabel(user.role)}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="rounded-lg p-1.5 text-muted transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
                aria-label="Đăng xuất"
              >
                <LogOut size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="relative min-w-0 flex-1" style={mainStyle}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-surface/80 px-4 py-3 backdrop-blur-md border-b border-line lg:hidden transition-all duration-300">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl p-2 -ml-1 text-ink hover:bg-canvas-soft transition-colors duration-200"
            aria-label="Mở menu"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <LogoWordmark compact />
          </div>
          {/* Home link + Role button - Mobile header (grouped on right) */}
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/"
              className="rounded-xl p-2 text-ink hover:bg-canvas-soft transition-colors duration-200"
              title="Về trang chủ"
              aria-label="Về trang chủ"
            >
              <Home size={20} strokeWidth={2} />
            </NavLink>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl bg-canvas-soft px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
              style={{ color: tone.accentDark }}
            >
              {portal.label}
            </button>
          </div>
        </header>

        {/* Mobile quick-nav dropdown */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mx-4 my-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_8px_30px_rgba(51,50,77,0.08)] backdrop-blur-xl">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 px-1">
              Điều hướng nhanh
            </div>
            {/* Home link - Mobile quick-nav dropdown */}
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-ink hover:bg-canvas-soft"
            >
              <Home size={14} />
              <span className="truncate">Về trang chủ</span>
            </NavLink>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {activePortal.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      isActive ? "text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]" : "text-ink hover:bg-canvas-soft"
                    }`
                  }
                  style={({ isActive }) => (isActive ? { background: activePortal.nav } : undefined)}
                >
                  <item.icon size={14} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop main padding */}
        <div className="relative min-w-0 p-5 sm:p-6 lg:p-8">
          {/* Background decoration */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.08]"
              style={{ background: "radial-gradient(circle, #F97316 0%, transparent 70%)" }}
            />
            <svg
              className="absolute bottom-0 left-0 w-full opacity-[0.04]"
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

          <PageTransition className="relative">
            <Outlet />
          </PageTransition>
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface/90 backdrop-blur-xl border-t border-line shadow-[0_-4px_20px_rgba(51,50,77,0.05)]">
        <div className="mx-auto flex max-w-lg items-center gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Home link - Mobile bottom navigation */}
          <NavLink
            to="/"
            className="relative flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-extrabold transition-all duration-200 text-muted hover:-translate-y-0.5 hover:text-ink"
          >
            <Home size={20} strokeWidth={2} />
            <span className="max-w-[4.5rem] truncate">Trang chủ</span>
          </NavLink>
          {activePortal.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex min-w-[4.25rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-extrabold transition-all duration-200 ${
                  isActive
                    ? "-translate-y-1 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                    : "text-muted hover:-translate-y-0.5 hover:text-ink"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: activePortal.nav, boxShadow: `0 4px 14px ${activePortal.accent}30` }
                  : undefined
              }
            >
              <item.icon size={20} strokeWidth={2} />
              <span className="max-w-[4.5rem] truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}
