import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function Card({
  children,
  className = "",
  interactive = false,
  reveal = false,
  revealDelay = 0,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const revealClass = reveal ? "reveal-up" : "";
  const interactiveClass = interactive ? "hover-lift" : "";
  return (
    <div
      className={`card-surface p-6 ${revealClass} ${interactiveClass} ${className}`}
      style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  accent = false,
  color,
  animated = false,
  reveal = false,
  revealDelay = 0,
}: {
  label: string;
  value: ReactNode;
  /** Phụ chú: số → tô theo dấu kèm icon ▲▼; chuỗi → --muted-strong (file 03 G1). */
  delta?: string | number;
  icon?: ReactNode;
  accent?: boolean;
  color?: string;
  animated?: boolean;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const valueClass = animated ? "animated-number" : "";
  // Delta số tô theo dấu (file 00 mục 7.7: màu không là tín hiệu duy nhất nên kèm icon).
  // Chuỗi (kể cả "+12%") và kiểu lạ (object/null) → nhánh chuỗi, không crash.
  const deltaSo = typeof delta === "number" ? delta : null;
  const deltaChuoi = typeof delta === "string" ? delta : null;
  const mauDeltaSo =
    deltaSo === null ? "" : deltaSo > 0 ? "text-[#047857]" : deltaSo < 0 ? "text-[#B91C1C]" : "text-muted-strong";
  const iconDeltaSo = deltaSo === null || deltaSo === 0 ? null : deltaSo > 0 ? "▲" : "▼";
  return (
    <Card interactive reveal={reveal} revealDelay={revealDelay}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Nhãn 13/600 --ink-soft 8,50:1 (file 03 G1) */}
          <div className="text-[13px] font-semibold text-ink-soft">{label}</div>
          <div className={`mt-1 text-[28px] font-extrabold leading-tight text-ink tabular-nums ${valueClass} break-words`}>
            {value}
          </div>
          {deltaSo !== null ? (
            <div className={`mt-1 text-xs font-semibold tabular-nums break-words overflow-wrap-anywhere ${mauDeltaSo}`}>
              {iconDeltaSo && (
                <span aria-hidden="true">{iconDeltaSo} </span>
              )}
              {deltaSo > 0 ? `+${deltaSo}` : `${deltaSo}`}
            </div>
          ) : (
            deltaChuoi && (
              <div className="mt-1 text-xs font-semibold text-muted-strong break-words overflow-wrap-anywhere">
                {deltaChuoi}
              </div>
            )
          )}
        </div>
        {icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              color ?? (accent ? "bg-portal-soft text-portal" : "bg-canvas-soft text-muted")
            }`}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  reveal = false,
  revealDelay = 0,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const revealClass = reveal ? "reveal-up" : "";
  return (
    <div className={`mb-6 flex items-start justify-between gap-4 ${revealClass}`} style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}>
      <div className="min-w-0 flex-1">
        {/* H1 24px/800, mobile 22px (file 00 mục 2 + file 02 B1) */}
        <h1 className="text-[22px] md:text-2xl font-extrabold leading-[1.25] tracking-[-0.015em] text-ink">
          {title}
        </h1>
        {subtitle && (
          /* Sub 14px dùng --muted-strong 5,01:1 thay --muted 3,46:1 (file 00 mục 7.2) */
          <p className="mt-1 text-sm leading-relaxed text-muted-strong">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "info",
  reveal = false,
  revealDelay = 0,
}: {
  children: ReactNode;
  /** Tone hiển thị. Tên cũ (portal/emerald/amber/red/violet/slate) giữ lại làm
      bí danh để 3 trang ngoài phạm vi (Settings/Evaluations/Overview) không vỡ. */
  tone?: "portal" | "emerald" | "amber" | "red" | "violet" | "slate" | "success" | "info" | "warn" | "danger" | "muted";
  reveal?: boolean;
  revealDelay?: number;
}) {
  const tones: Record<string, string> = {
    // Tone mới file 03 G2 (cao 24, chữ 12/600, tương phản đã đối chiếu).
    success: "bg-[#ECFDF5] text-[#047857]",
    info: "bg-[#EFF6FF] text-[#1D4ED8]",
    warn: "bg-[#FFF7ED] text-[#9A3412]",
    danger: "bg-[#FEF2F2] text-[#B91C1C]",
    muted: "bg-canvas-soft text-muted-strong border border-line-strong",
    // Bí danh cũ → màu mới tương đương (giữ để không vỡ caller hiện có).
    portal: "bg-portal-soft text-portal-dark",
    emerald: "bg-[#ECFDF5] text-[#047857]",
    amber: "bg-[#FFF7ED] text-[#9A3412]",
    red: "bg-[#FEF2F2] text-[#B91C1C]",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-canvas-soft text-muted-strong border border-line-strong",
  };
  const revealClass = reveal ? "reveal-fade" : "";
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${tones[tone]} ${revealClass}`}
      style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}
    >
      {children}
    </span>
  );
}

export function Loading({ label = "Đang tải...", reveal = false, revealDelay = 0 }: { label?: string; reveal?: boolean; revealDelay?: number }) {
  const revealClass = reveal ? "reveal-fade" : "";
  return (
    <div className={`flex items-center justify-center py-16 text-sm text-muted transition-responsive ${revealClass}`} aria-live="polite" aria-busy="true" style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}>
      <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-line-strong border-t-portal" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorBox({
  message,
  retryLabel,
  onRetry,
  reveal = false,
  revealDelay = 0,
}: {
  message: string;
  /** Nhãn + hàm cho nút "Thử lại" (file 00 mục 4.10). Không truyền thì không hiện nút. */
  retryLabel?: string;
  onRetry?: () => void;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const revealClass = reveal ? "reveal-up" : "";
  return (
    <div
      className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-ink transition-responsive ${revealClass}`}
      style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}
      role="alert"
    >
      {/* Chữ chính --ink (không đỏ toàn câu), icon đỏ 18px kèm tín hiệu chữ (mục 4.10 + 7.7) */}
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 text-red-700" aria-hidden="true" />
        <p className="min-w-0 flex-1">{message}</p>
      </div>
      {retryLabel && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary mt-3 h-9 px-3.5 text-[13px]"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function Empty({
  text = "Chưa có dữ liệu",
  icon,
  action,
  reveal = false,
  revealDelay = 0,
}: {
  text?: string;
  /** Icon 32px phía trên (file 00 mục 4.8). Không truyền thì không hiện. */
  icon?: ReactNode;
  /** Nút hành động dưới chữ (secondary sm, mt-4). Không truyền thì không hiện. */
  action?: ReactNode;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const revealClass = reveal ? "reveal-fade" : "";
  return (
    <div
      className={`rounded-2xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-10 text-center transition-responsive ${revealClass}`}
      style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}
    >
      {icon && <div className="mb-2 flex justify-center text-muted" aria-hidden="true">{icon}</div>}
      {/* Dòng chính 14/600 --ink-soft (mục 4.8); giữ prop text cũ để caller hiện tại không vỡ */}
      <p className="text-sm font-semibold text-ink-soft">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Khung xương chờ tải (file 00 mục 4.9): chỉ là div shimmer, caller tự xếp đúng bố cục trang thật. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}