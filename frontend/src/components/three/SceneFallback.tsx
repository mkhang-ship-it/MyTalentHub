import type { ReactNode } from "react";

export interface SceneFallbackProps {
  message?: string;
  className?: string;
  children?: ReactNode;
  label?: string;
}

/** CSS/SVG identity-preserving fallback for a WebGL scene. */
export function SceneFallback({
  message = "3D scene unavailable",
  className = "",
  children,
  label = "3D scene fallback",
}: SceneFallbackProps) {
  return (
    <div
      className={className}
      role="img"
      aria-label={label}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        color: "#1B2A5E",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <svg
        width={72}
        height={72}
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden="true"
        style={{ opacity: 0.7 }}
      >
        <rect x="16" y="16" width="40" height="40" rx="4" stroke="#1B2A5E" strokeWidth="2" />
        <rect x="24" y="24" width="24" height="24" rx="2" stroke="#F5A623" strokeWidth="2" />
        <line x1="36" y1="16" x2="36" y2="56" stroke="#1B2A5E" strokeWidth="1" strokeDasharray="4 4" />
        <line x1="16" y1="36" x2="56" y2="36" stroke="#F5A623" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{message}</p>
      {children}
    </div>
  );
}
