import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { post } from "../api/client";
import { LogoMark } from "../components/Logo";

/**
 * Quên mật khẩu (route công khai /quen-mat-khau).
 * Backend LUÔN trả 200 với thông điệp chung — không bao giờ tiết lộ email nào
 * có tài khoản. Trang này cũng vậy: thành công thì nói rõ đã gửi tới email đã
 * nhập, không bao giờ nói "email không tồn tại".
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await post<{ message: string }>("/auth/forgot-password", { email: email.trim() });
      // Luôn hiện thành công (backend cố tình giấu email có tồn tại hay không).
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu, vui lòng thử lại.");
    } finally {
      setSending(false);
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
          <h2 className="text-lg font-bold text-ink">Quên mật khẩu</h2>
          <p className="mb-5 mt-0.5 text-sm text-muted">
            Nhập email đã đăng ký — chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.
          </p>

          {sentTo ? (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
            >
              <p className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Đã gửi hướng dẫn đặt lại mật khẩu tới <strong>{sentTo}</strong>. Hãy kiểm
                  tra hộp thư (kể cả thư rác) và làm theo hướng dẫn trong email.
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Email
                </label>
                <div className="relative mt-1.5">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light"
                  />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@ftalenthub.edu.vn"
                    autoComplete="email"
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
                disabled={sending}
                className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #A1458F 0%, #7E2F73 100%)",
                }}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {sending ? "Đang gửi…" : "Gửi link đặt lại mật khẩu"}
              </button>
            </form>
          )}

          <p className="mt-5 text-center text-xs text-muted">
            Nhớ mật khẩu rồi?{" "}
            <Link to="/login" className="font-semibold text-portal hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
