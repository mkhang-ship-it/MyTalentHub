import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { post } from "../api/client";
import { LogoMark } from "../components/Logo";

/** Bóc trường `detail` từ chuỗi lỗi `API /path → status: {"detail":"…"}` của api/client. */
function extractDetail(message: string): string {
  const start = message.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(message.slice(start)) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail.trim()) return body.detail;
    } catch {
      // JSON lỗi — rơi xuống dùng thông điệp gốc
    }
  }
  return message;
}

/**
 * Đặt lại mật khẩu (route công khai /dat-lai-mat-khau?token=…).
 * - Thiếu token trong link → báo ngay, không gọi API.
 * - Lỗi backend (link hết hạn, mật khẩu yếu…) hiện nguyên văn tiếng Việt.
 * - Thành công → về /login kèm thông báo để đăng nhập bằng mật khẩu mới.
 */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get("token") ?? "").trim();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Mật khẩu nhập lại chưa khớp, vui lòng kiểm tra lại.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await post<{ message: string }>("/auth/reset-password", {
        token,
        new_password: password,
      });
      navigate("/login?dat-lai=thanh-cong", { replace: true });
    } catch (err) {
      setError(extractDetail(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
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

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-lift">
          <h2 className="text-lg font-bold text-ink">Đặt lại mật khẩu</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted">
            Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ hoa và chữ số.
          </p>

          {!token ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <p className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Liên kết đặt lại mật khẩu thiếu mã xác nhận. Hãy mở lại link trong email,{" "}
                  <Link to="/quen-mat-khau" className="font-semibold underline">
                    hoặc yêu cầu link mới
                  </Link>
                  .
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-password"
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Mật khẩu mới
                </label>
                <div className="relative mt-1.5">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light"
                  />
                  <input
                    id="reset-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 8 ký tự, có chữ hoa và số"
                    autoComplete="new-password"
                    className="input-control pl-9"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-confirm"
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Nhập lại mật khẩu mới
                </label>
                <div className="relative mt-1.5">
                  <KeyRound
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light"
                  />
                  <input
                    id="reset-confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Nhập lại giống mật khẩu mới"
                    autoComplete="new-password"
                    className="input-control pl-9"
                  />
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <p className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #A1458F 0%, #7E2F73 100%)",
                }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {submitting ? "Đang lưu…" : "Đặt lại mật khẩu"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-muted">
            <Link to="/login" className="font-semibold text-portal hover:underline">
              Về trang đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
