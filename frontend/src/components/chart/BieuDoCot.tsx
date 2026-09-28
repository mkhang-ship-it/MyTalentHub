// Biểu đồ cột HTML: mỗi cột trả lời "bao nhiêu" bằng số thật, nhãn đầy đủ không cắt.

export interface CotDuLieu {
  /** Nhãn đầy đủ dưới mỗi cột (không cắt bằng "…"). */
  nhan: string;
  /** Giá trị vẽ chiều cao cột. */
  giaTri: number;
  /** Chuỗi giá trị hiện trên đầu cột, ví dụ "15 HS". */
  nhanGiaTri: string;
  /** Dòng phụ dưới nhãn, ví dụ "Điểm TB 72,8". */
  phuDe?: string;
}

export interface BieuDoCotProps {
  tieuDe: string;
  /** Câu tóm tắt bằng chữ đặt trên biểu đồ — thứ khiến biểu đồ có ý nghĩa. */
  tomTat: string;
  cot: CotDuLieu[];
  /** Nhãn trục dọc, ví dụ "Số học sinh". */
  donViY: string;
  /** Thông báo khi thiếu dữ liệu, thay vì vẽ biểu đồ rỗng. */
  thongBaoRong?: string;
  /** Ghi chú chất lượng dữ liệu, ví dụ khối lạ cần kiểm tra lại. */
  ghiChu?: string;
}

/** Chia nhãn dài thành tối đa 2 dòng theo từ (không cắt ký tự). */
function xuongDong(nhan: string): string[] {
  const tu = nhan.split(" ").filter(Boolean);
  if (tu.length <= 1) return [nhan];
  const giua = Math.ceil(tu.length / 2);
  return [tu.slice(0, giua).join(" "), tu.slice(giua).join(" ")];
}

export default function BieuDoCot({ tieuDe, tomTat, cot, donViY, thongBaoRong, ghiChu }: BieuDoCotProps) {
  const nhanAria = `${tieuDe}. ${tomTat} ${cot.map((c) => `${c.nhan}: ${c.nhanGiaTri}`).join("; ")}.`;
  const lonNhat = Math.max(1, ...cot.map((c) => c.giaTri));

  return (
    <figure className="rounded-2xl border border-line bg-white p-4 sm:p-5" aria-label={nhanAria}>
      <h3 className="font-semibold text-ink">{tieuDe}</h3>
      <p className="mt-1 text-sm text-muted leading-relaxed">{tomTat}</p>
      {cot.length === 0 ? (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-sm text-muted">
          {thongBaoRong ?? "Chưa đủ dữ liệu để vẽ biểu đồ."}
        </p>
      ) : (
        <>
          <div className="mt-2 text-xs text-muted-light" id="bieu-do-cot-don-vi">{donViY}</div>
          <ul className="mt-1 flex items-end gap-2 sm:gap-3" aria-label={`${tieuDe} — số liệu từng nhóm`}>
            {cot.map((c) => (
              <li key={c.nhan} className="flex min-w-0 flex-1 flex-col items-center">
                <span className="text-xs font-bold text-ink tabular-nums" aria-hidden="true">{c.nhanGiaTri}</span>
                <div
                  className="mt-1 w-full max-w-[72px] rounded-t-lg bg-gradient-to-t from-violet-600 to-violet-400"
                  style={{ height: `${Math.max(8, Math.round((c.giaTri / lonNhat) * 140))}px` }}
                  aria-hidden="true"
                />
                <span className="mt-2 text-center text-xs font-semibold text-ink leading-tight">
                  {xuongDong(c.nhan).map((dong, i) => (
                    <span key={i} className="block">{dong}</span>
                  ))}
                </span>
                {c.phuDe && <span className="mt-0.5 text-center text-[11px] text-muted-light leading-tight">{c.phuDe}</span>}
                <span className="sr-only">{`${c.nhan}: ${c.nhanGiaTri}${c.phuDe ? `, ${c.phuDe}` : ""}`}</span>
              </li>
            ))}
          </ul>
          {ghiChu && (
            <p role="note" className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 leading-relaxed">
              {ghiChu}
            </p>
          )}
        </>
      )}
    </figure>
  );
}
