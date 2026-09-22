import { useState, type FormEvent } from "react";
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
} from "lucide-react";
import { useAuth, roleHome, type AuthUser } from "../auth/AuthContext";
import { LogoMark } from "../components/Logo";

const ACCENT = "#A1458F";
const ACCENT_SOFT = "#F9EEF7";
const ACCENT_DARK = "#7E2F73";

const DEMO_ACCOUNTS: { role: AuthUser["role"]; email: string; label: string; icon: typeof Users }[] = [
  { role: "student", email: "hs01@ftalenthub.edu.vn", label: "Học sinh", icon: GraduationCap },
  { role: "teacher", email: "nguyen.van.hung@ftalenthub.edu.vn", label: "Giáo viên", icon: Users },
  { role: "school", email: "bgh@ftalenthub.edu.vn", label: "Nhà trường", icon: School },
  { role: "enterprise", email: "hr@techfpt.vn", label: "Doanh nghiệp", icon: Building2 },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
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
        {/* Brand (bám slide: F navy + cánh cam + sao vàng, chữ navy một màu) */}
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
          <h2 className="text-lg font-bold text-ink">Đăng nhập</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted">
            Hệ sinh thái tài năng đa lĩnh vực dành cho học sinh
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-control pl-9"
                />
              </div>
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
                background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)`,
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkle size={16} />}
              {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">
              Tài khoản demo · mật khẩu <span className="font-mono">demo123</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setError("");
                  }}
                  className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2 text-left text-xs text-ink-soft transition-colors hover:border-transparent"
                  style={{ backgroundColor: ACCENT_SOFT + "55" }}
                >
                  <acc.icon size={14} style={{ color: ACCENT }} />
                  <span className="truncate">
                    <span className="block font-semibold">{acc.label}</span>
                    <span className="block truncate text-[10px] text-muted">{acc.email}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">
              Chọn vai trò để điền nhanh → nhấn Đăng nhập
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Team FPI Cần Thơ · Discover Talent · Develop Skills · Create Future
        </p>
      </div>
    </div>
  );
}