// SkillLevels2D — danh sách kỹ năng + mức độ, 2D thuần (thay SkillOrbit 3D).
// Mỗi kỹ năng là 1 nút cao ≥44px, chạm để mở chi tiết. Chữ nhỏ nhất 12px.

import { useState } from "react";

export interface SkillLevelItem {
  /** Tên kỹ năng, hiện đầy đủ không cắt. */
  ten: string;
  /** Mức 0–10. */
  muc: number;
  /** Mô tả ngắn, hiện khi mở rộng. */
  moTa?: string;
}

export interface SkillLevels2DProps {
  tieuDe: string;
  tomTat?: string;
  kyNang: SkillLevelItem[];
  thongBaoRong?: string;
}

function kẹpMuc(muc: number): number {
  if (Number.isNaN(muc)) return 0;
  return Math.max(0, Math.min(10, muc));
}

export default function SkillLevels2D({ tieuDe, tomTat, kyNang, thongBaoRong }: SkillLevels2DProps) {
  const [mo, setMo] = useState<string | null>(null);
  const danhSach = kyNang.slice(0, 8);
  const nhanAria = `${tieuDe}. ${danhSach.map((k) => `${k.ten}: ${kẹpMuc(k.muc)} trên 10`).join("; ")}.`;

  return (
    <figure
      data-viz="skill-levels-2d"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
      aria-label={nhanAria}
    >
      <h3 className="text-base font-bold text-ink sm:text-lg">{tieuDe}</h3>
      {tomTat && <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">{tomTat}</p>}
      {danhSach.length === 0 ? (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-xs font-semibold text-ink-soft sm:text-sm">
          {thongBaoRong ?? "Chưa đủ dữ liệu để hiển thị kỹ năng."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {danhSach.map((k) => {
            const muc = kẹpMuc(k.muc);
            const dangMo = mo === k.ten;
            return (
              <li key={k.ten} className="min-w-0">
                <button
                  type="button"
                  onClick={() => setMo(dangMo ? null : k.ten)}
                  aria-expanded={dangMo}
                  aria-label={`${k.ten}: mức ${muc} trên 10. Chạm để ${dangMo ? "thu gọn" : "xem chi tiết"}.`}
                  className="flex min-h-[44px] w-full min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-left transition-colors hover:border-portal focus-visible:outline-portal"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-ink sm:text-sm">{k.ten}</span>
                    <span
                      className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-line"
                      role="img"
                      aria-label={`${k.ten}: ${muc} trên 10`}
                    >
                      <span
                        className="block h-full rounded-full bg-[#1B2A5E]"
                        style={{ width: `${(muc / 10) * 100}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-ink sm:text-sm">
                    {muc}<span className="font-normal text-muted-strong">/10</span>
                  </span>
                </button>
                {dangMo && (
                  <p className="mt-1 rounded-xl bg-canvas-soft/70 px-3 py-2 text-xs leading-relaxed text-ink-soft">
                    {k.moTa ?? `${k.ten}: mức ${muc}/10. Tiếp tục luyện tập để tăng mức.`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}
