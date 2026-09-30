// ProgressBar2D — thanh tiến độ 2D thuần, role="progressbar".

export interface ProgressBar2DProps {
  /** Nhãn, ví dụ "Tiến độ học kỳ". */
  nhan: string;
  /** Giá trị hiện tại. */
  giaTri: number;
  /** Giá trị tối đa. */
  toiDa?: number;
  /** Chuỗi hiển thị, ví dụ "6/10 buổi". */
  nhanGiaTri?: string;
  moTa?: string;
}

export default function ProgressBar2D({ nhan, giaTri, toiDa = 100, moTa }: ProgressBar2DProps) {
  const max = toiDa > 0 ? toiDa : 100;
  const clamped = Math.max(0, Math.min(max, giaTri));
  const pct = (clamped / max) * 100;
  const hienThi = moTa ?? `${clamped} trên ${max}`;

  return (
    <figure
      data-viz="progress-bar-2d"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
      aria-label={`${nhan}. ${hienThi}.`}
    >
      <div className="flex min-h-[44px] flex-wrap items-baseline justify-between gap-2">
        <h3 className="min-w-0 flex-1 break-words text-base font-bold text-ink sm:text-lg">{nhan}</h3>
        <span className="shrink-0 text-xs font-bold tabular-nums text-ink sm:text-sm">
          {moTa ?? `${clamped}/${max}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${nhan}: ${hienThi}`}
        className="mt-2 h-3 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-[#1B2A5E]" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-strong">{hienThi}</p>
    </figure>
  );
}
