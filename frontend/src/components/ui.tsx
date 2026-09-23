import { ReactNode } from "react";

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
      className={`card-surface rounded-xl p-5 ${revealClass} ${interactiveClass} ${className}`}
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
  delta?: string;
  icon?: ReactNode;
  accent?: boolean;
  color?: string;
  animated?: boolean;
  reveal?: boolean;
  revealDelay?: number;
}) {
  const valueClass = animated ? "animated-number" : "";
  return (
    <Card interactive reveal={reveal} revealDelay={revealDelay}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted">{label}</div>
          <div className={`mt-1 text-[28px] font-extrabold leading-tight text-ink tabular-nums ${valueClass}`}>
            {value}
          </div>
          {delta && (
            <div className="mt-1 text-xs font-semibold text-emerald-600">
              {delta}
            </div>
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "portal",
  reveal = false,
  revealDelay = 0,
}: {
  children: ReactNode;
  tone?: "portal" | "emerald" | "amber" | "red" | "violet" | "slate";
  reveal?: boolean;
  revealDelay?: number;
}) {
  const tones: Record<string, string> = {
    portal: "bg-portal-soft text-portal",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-canvas-soft text-muted",
  };
  const revealClass = reveal ? "reveal-fade" : "";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${revealClass}`}
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

export function ErrorBox({ message, reveal = false, revealDelay = 0 }: { message: string; reveal?: boolean; revealDelay?: number }) {
  const revealClass = reveal ? "reveal-up" : "";
  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 transition-responsive ${revealClass}`} style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}>
      {message}
    </div>
  );
}

export function Empty({ text = "Chưa có dữ liệu", reveal = false, revealDelay = 0 }: { text?: string; reveal?: boolean; revealDelay?: number }) {
  const revealClass = reveal ? "reveal-fade" : "";
  return (
    <div className={`rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-10 text-center text-sm text-muted transition-responsive ${revealClass}`} style={reveal ? { animationDelay: `${revealDelay}s` } : undefined}>
      {text}
    </div>
  );
}