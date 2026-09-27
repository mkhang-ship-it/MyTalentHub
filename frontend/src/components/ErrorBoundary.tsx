import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/**
 * ErrorBoundary — chặn lỗi render/lifecycle làm TRẮNG toàn màn hình.
 *
 * Hiển thị màn hình tiếng Việt với:
 * - Mã lỗi ngắn (REQ-XXXXXX) + thông điệp lỗi gọn để báo lại cho người sửa lỗi
 * - Nút "Tải lại trang" và "Về trang chủ"
 * - Ở chế độ phát triển (import.meta.env.DEV): hiện thêm stack trace chi tiết
 *
 * Cách dùng:
 * - main.tsx: bọc ngoài cùng quanh <App /> (bắt lỗi ở bất kỳ đâu)
 * - Layout.tsx: bọc quanh <Outlet /> kèm `key={pathname}` → đổi trang là tự reset,
 *   lỗi ở một trang không làm sập cả khung và trang mới được thử lại từ đầu.
 */

type Props = { children: ReactNode };
type State = { error: Error | null; code: string };

// tsconfig của dự án không nạp types "vite/client" → tự mô tả shape của import.meta.env
// để kiểm tra chế độ DEV mà không cần sửa tsconfig.
const IS_DEV = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);

function makeCode(): string {
  return "REQ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, code: "" };

  static getDerivedStateFromError(error: Error): State {
    return { error, code: makeCode() };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Giữ console.error (được phép) — cần cho điều tra khi chạy thật
    console.error(
      `[ErrorBoundary] ${this.state.code}: ${error.message}`,
      info.componentStack
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    const { error, code } = this.state;
    if (!error) return this.props.children;

    const message = (error.message || "Lỗi không xác định").slice(0, 300);

    return (
      <div role="alert" className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
            <h1 className="text-lg font-extrabold tracking-tight">
              Trang gặp sự cố kỹ thuật
            </h1>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-red-700">
            Đã xảy ra lỗi khi hiển thị nội dung này. Dữ liệu của bạn vẫn an toàn —
            hãy thử tải lại trang, hoặc quay về trang chủ nếu vẫn không được.
          </p>

          <p className="mt-3 break-words text-xs text-red-700/80">
            <strong>Mã lỗi:</strong> {code} · {message}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
            >
              Tải lại trang
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              Về trang chủ
            </button>
          </div>

          {IS_DEV && error.stack && (
            <pre
              aria-label="Stack trace chi tiết (chỉ ở chế độ phát triển)"
              className="mt-4 max-h-56 overflow-auto rounded-xl bg-black/85 p-3 text-left text-[11px] leading-relaxed text-emerald-200"
            >
              {error.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
