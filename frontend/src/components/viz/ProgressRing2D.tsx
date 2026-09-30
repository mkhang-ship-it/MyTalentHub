// ProgressRing2D — vòng tiến độ SVG thuần, chữ ≥12px, role="img" + <desc> tiếng Việt.

export interface ProgressRing2DProps {
  nhan: string;
  /** Phần trăm 0–100. */
  phanTram: number;
  moTa?: string;
}

export default function ProgressRing2D({ nhan, phanTram, moTa }: ProgressRing2DProps) {
  const pct = Math.max(0, Math.min(100, phanTram));
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <figure
      data-viz="progress-ring-2d"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
      aria-label={`${nhan}. Đạt ${Math.round(pct)} phần trăm.`}
    >
      <div className="flex min-h-[44px] items-center gap-4">
        <svg
          width="88"
          height="88"
          viewBox="0 0 88 88"
          role="img"
          aria-labelledby="ring-title ring-desc"
          className="shrink-0"
        >
          <title id="ring-title">{nhan}</title>
          <desc id="ring-desc">{`Vòng tiến độ ${nhan}: đạt ${Math.round(pct)} phần trăm.`}</desc>
          <circle cx="44" cy="44" r={R} fill="none" strokeWidth="10" className="stroke-line" stroke="#ede7e1" />
          <circle
            cx="44"
            cy="44"
            r={R}
            fill="none"
            stroke="#1B2A5E"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (pct / 100) * C}
            transform="rotate(-90 44 44)"
          />
          <text x="44" y="49" textAnchor="middle" fontSize="14" fontWeight="700" fill="#33324d">
            {Math.round(pct)}%
          </text>
        </svg>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-bold text-ink sm:text-lg">{nhan}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
            {moTa ?? `Đã đạt ${Math.round(pct)}%.`}
          </p>
        </div>
      </div>
    </figure>
  );
}
