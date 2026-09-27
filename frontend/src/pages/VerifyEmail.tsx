import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailCheck, Loader2, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { API_BASE, post } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LogoMark } from "../components/Logo";

/**
 * Xác minh email (route công khai /xac-minh-email).
 * - Có ?token=… (mở từ link trong email): gọi GET verify-email — endpoint trả
 *   HTML (kể cả khi lỗi) nên dùng fetch trực tiếp thay vì helper JSON của
 *   api/client, rồi hiện kết quả cho người dùng.
 * - Không có token: nếu đã đăng nhập thì cho nút "Gửi lại email xác minh"
 *   (POST verify-email/resend, cần Bearer); chưa đăng nhập thì mời đăng nhập.
 */

/** Bóc chữ trong HTML backend trả về (chỉ lấy text, không chèn HTML). */
function htmlToText(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body?.textContent ?? "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const token = (params.get("token") ?? "").trim();

  const [verifying, setVerifying] = useState(token !== "");
  const [verified, setVerified] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }
    let cancelled = false;
    setVerifying(true);
    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const html = await res.text().catch(() => "");
        // Bóc chữ trong HTML backend trả về để hiện (chỉ lấy text, không chèn HTML).
        const text = htmlToText(html);
        if (cancelled) return;
        setVerified(res.ok);
        setResultMessage(
          text ||
            (res.ok
              ? "Email của bạn đã được xác minh thành công."
              : "Link không hợp lệ hoặc đã hết hạn. Hãy yêu cầu link mới.")
        );
      })
      .catch(() => {
        if (cancelled) return;
        setVerified(false);
        setResultMessage("Không kết nối được máy chủ, vui lòng thử lại sau.");
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleResend() {
    setResendMessage("");
    setResendError("");
    setResending(true);
    try {
      const data = await post<{ message: string }>("/auth/verify-email/resend", {});
      setResendMessage(
        data.message || "Đã gửi lại email xác minh. Hãy kiểm tra hộp thư (kể cả thư rác)."
      );
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Không gửi được, vui lòng thử lại.");
    } finally {
      setResending(false);
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
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <MailCheck size={20} className="text-portal" aria-hidden="true" />
            Xác minh email
          </h2>

          {token ? (
            <div className="mt-4">
              {verifying ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Đang xác minh email của bạn…
                </p>
              ) : verified ? (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
                >
                  <p className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{resultMessage}</span>
                  </p>
                </div>
              ) : (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <p className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{resultMessage}</span>
                  </p>
                </div>
              )}
            </div>
          ) : user ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted">
                Tài khoản <strong className="text-ink">{user.email}</strong> chưa xác minh email.
                Bấm nút dưới đây để nhận link xác minh mới.
              </p>
              {resendMessage && (
                <div
                  role="status"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
                >
                  <p className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{resendMessage}</span>
                  </p>
                </div>
              )}
              {resendError && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <p className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{resendError}</span>
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="h-11 w-full rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #A1458F 0%, #7E2F73 100%)",
                }}
              >
                {resending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {resending ? "Đang gửi…" : "Gửi lại email xác minh"}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div
                role="status"
                className="rounded-xl border border-line bg-canvas-soft px-3 py-2.5 text-sm text-muted"
              >
                Trang này dùng để xác minh email từ link trong hộp thư, hoặc gửi lại link khi
                bạn đã đăng nhập. Hãy{" "}
                <Link to="/login" className="font-semibold text-portal hover:underline">
                  đăng nhập
                </Link>{" "}
                để gửi lại email xác minh.
              </div>
            </div>
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
