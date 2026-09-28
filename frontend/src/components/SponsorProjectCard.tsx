/** Thẻ dự án kêu gọi tài trợ — cao bằng nhau, nút nằm chân thẻ, nhãn tiếng Việt. */

interface DuAnTaiTro {
  id: number;
  title: string;
  field: string;
  owner_name: string;
  member_count: number;
  sponsored_total: number;
  funding_goal: number;
}

/** Định dạng tiền rõ ràng: dấu phân cách nghìn + "đ", không dùng "M" rút gọn. */
export function dinhDangTien(vnd: number): string {
  const so = Number.isFinite(vnd) ? Math.max(0, Math.round(vnd)) : 0;
  return `${new Intl.NumberFormat("vi-VN").format(so)} đ`;
}

/** Phần trăm đã tài trợ so với MỤC TIÊU của chính dự án (làm tròn, kẹp 0–100). */
export function tinhPhanTram(daTaiTro: number, mucTieu: number): number {
  if (!Number.isFinite(daTaiTro) || !Number.isFinite(mucTieu) || mucTieu <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((daTaiTro / mucTieu) * 100)));
}

export type NhanNutTaiTro = "tai_tro_ngay" | "tiep_tuc" | "dat_muc_tieu";

/** Nghiệp vụ nút theo tiến độ: 0% → tài trợ ngay; 1–99% → tiếp tục; 100% → không tài trợ thêm. */
export function nhanNutTaiTro(pct: number): NhanNutTaiTro {
  if (pct >= 100) return "dat_muc_tieu";
  if (pct > 0) return "tiep_tuc";
  return "tai_tro_ngay";
}

interface TheDuAnProps {
  duAn: DuAnTaiTro;
  onChon: (id: number) => void;
}

export default function SponsorProjectCard({ duAn, onChon }: TheDuAnProps) {
  const pct = tinhPhanTram(duAn.sponsored_total, duAn.funding_goal);
  const nhan = nhanNutTaiTro(pct);
  const conThieu = Math.max(0, duAn.funding_goal - duAn.sponsored_total);
  // Dòng phụ giữ chiều cao cố định để mọi chân thẻ thẳng hàng nhau.
  const dongPhu =
    nhan === "tiep_tuc"
      ? `Còn thiếu ${dinhDangTien(conThieu)}`
      : duAn.sponsored_total > 0
        ? `Đã nhận ${dinhDangTien(duAn.sponsored_total)}`
        : "Chưa nhận tài trợ nào";

  return (
    <article role="listitem" className="h-full" aria-label={`Dự án ${duAn.title}`}>
      <div className="card-surface flex h-full flex-col rounded-xl p-5 transition-responsive hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(51_50_77/0.08)]">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-ink">{duAn.title}</h3>
              <div className="mt-0.5 text-xs text-muted">
                {duAn.owner_name} · Nhóm {duAn.member_count} thành viên
              </div>
            </div>
            <span
              className="shrink-0 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-600"
              aria-label="Dự án tiềm năng"
            >
              ✨ Tiềm năng
            </span>
          </div>

          <div className="mt-auto pt-3">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold tabular-nums text-ink">
                {dinhDangTien(duAn.sponsored_total)} / {dinhDangTien(duAn.funding_goal)}
              </span>
              <span className="font-bold tabular-nums text-emerald-600">{pct}%</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-soft shadow-inner"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ tài trợ của dự án ${duAn.title}: ${pct} phần trăm`}
            >
              <div
                className="h-full rounded-full hero-gradient transition-all duration-700 ease-out hover:brightness-110"
                style={{ width: `${pct}%` }}
              />
            </div>

            {nhan === "dat_muc_tieu" ? (
              <div className="mt-3">
                <p role="status" className="rounded-full bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-700">
                  Đã đạt mục tiêu
                </p>
                <button
                  type="button"
                  onClick={() => onChon(duAn.id)}
                  aria-label={`Xem chi tiết dự án ${duAn.title}`}
                  className="mt-2 w-full rounded-full border border-line py-2 text-sm font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                >
                  Xem chi tiết
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="mb-1.5 min-h-5 text-center text-xs text-muted">{dongPhu}</p>
                <button
                  type="button"
                  onClick={() => onChon(duAn.id)}
                  aria-label={`${nhan === "tiep_tuc" ? "Tiếp tục tài trợ" : "Tài trợ ngay"} cho dự án ${duAn.title}`}
                  className="w-full rounded-full cta-gradient py-2 text-sm font-semibold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                >
                  {nhan === "tiep_tuc" ? "Tiếp tục tài trợ" : "Tài trợ ngay"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
