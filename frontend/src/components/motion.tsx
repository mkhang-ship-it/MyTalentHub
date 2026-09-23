import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

/* ═══════════════════════════════════════════════════
   FTalentHub — Motion primitives (CSS-first, no framer-motion)
   Attio + Awwwards style: reveal, stagger, hover, count, reduced-motion safe
   ═══════════════════════════════════════════════════ */

/* ─── Page transition wrapper (applies on every route change) ─── */
export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className={`page-transition ${className}`.trim()} data-page-transition={pathname}>
      {children}
    </div>
  );
}

/* ─── Reveal wrapper (CSS keyframe-based) ─── */
export function MotionReveal({
  children,
  variant = "up",
  delay = 0,
  duration = 0.55,
  className = "",
}: {
  children: ReactNode;
  variant?: "up" | "fade" | "scale";
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const base = variant === "up" ? "reveal-up" : variant === "scale" ? "reveal-scale" : "reveal-fade";
  return (
    <div
      className={`${base} ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Stagger container ─── */
export function MotionStagger({
  children,
  delay = 0.06,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`stagger-children ${className}`}
      style={
        {
          "--stagger-delay": `${delay}s`,
          "--stagger-duration": `${duration}s`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

/* ─── Hover lift wrapper ─── */
export function MotionHoverLift({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`hover-lift ${className}`}>{children}</div>;
}

/* ─── Animated number (requestAnimationFrame, reduced-motion safe) ─── */
export function CountUp({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    let start: number | null = null;
    let rafId = 0;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(Math.round(value * eased * Math.pow(10, decimals)) / Math.pow(10, decimals));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration, decimals, prefersReduced]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : display.toString();

  return (
    <span className={`animated-number ${className}`} aria-live="polite">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/* ─── Responsive-safe transition wrapper component ─── */
export function TransitionResponsive({
  children,
  className = "",
  enabled = true,
}: {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
}) {
  return (
    <div className={`${enabled ? "transition-responsive" : ""} ${className}`}>
      {children}
    </div>
  );
}
