// Thanh ngang xếp hạng: tên đầy đủ + GIÁ TRỊ thật, số thứ hạng bằng chữ số (không chỉ dựa vào màu).

export interface HangDuLieu {
  ten: string;
  diem: number;
}

export interface ThanhXepHangProps {
  tieuDe: string;
  tomTat: string;
  hang: HangDuLieu[];
  /** Đơn vị sau giá trị, ví dụ "điểm". */
  donVi: string;
  /** Điểm tối đa của thang (để tính độ dài thanh). */
  thangToiDa: number;
  thongBaoRong?: string;
}

export default function ThanhXepHang({ tieuDe, tomTat, hang, donVi, thangToiDa, thongBaoRong }: ThanhXepHangProps) {
  const daSapXep = [...hang].sort((a, b) => b.diem - a.diem);
  const nhanAria = `${tieuDe}. ${tomTat} ${daSapXep.map((h, i) => `Hạng ${i + 1}: ${h.ten} ${h.diem} ${donVi}`).join("; ")}.`;

  return (
    <figure className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-label={nhanAria}>
      <h3 className="font-semibold text-ink">{tieuDe}</h3>
      <p className="mt-1 text-sm text-muted leading-relaxed">{tomTat}</p>
      {daSapXep.length === 0 ? (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-sm text-muted">
          {thongBaoRong ?? "Chưa đủ dữ liệu để vẽ biểu đồ."}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {daSapXep.map((h, i) => (
            <li key={h.ten}>
              <div className="flex items-baseline gap-2">
                <span
                  className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-portal-soft text-xs font-bold text-portal-dark"
                  aria-label={`Hạng ${i + 1}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-ink leading-snug">{h.ten}</span>
                <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                  {h.diem} <span className="text-xs font-normal text-muted-light">{donVi}</span>
                </span>
                <span className="sr-only">{`Hạng ${i + 1}: ${h.ten}, ${h.diem} ${donVi}`}</span>
              </div>
              <div
                className="ml-8 mt-1 h-2.5 overflow-hidden rounded-full bg-canvas-soft"
                role="img"
                aria-label={`${h.ten}: ${h.diem} trên ${thangToiDa} ${donVi}`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                  style={{ width: `${Math.max(2, Math.min(100, (h.diem / thangToiDa) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
