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

// Tên lĩnh vực tiếng Việt cho chip thẻ (đồng bộ với trang danh sách).
const TEN_LINH_VUC: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

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
      <div className="card-surface flex h-full flex-col rounded-[20px] p-6 transition-responsive hover:-translate-y-1 hover:shadow-[0_10px_30px_rgb(51_50_77/0.08)]">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[17px] md:text-lg font-bold text-ink">{duAn.title}</h3>
              <div className="mt-0.5 text-xs text-muted-strong">
                {duAn.owner_name} · Nhóm {duAn.member_count} thành viên
              </div>
            </div>
            {/* Chip lĩnh vực từ dữ liệu thật (thay nhãn "Tiềm năng" dán mọi thẻ). */}
            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line-strong bg-canvas-soft px-2.5 text-xs font-semibold text-ink-soft">
              {TEN_LINH_VUC[duAn.field] ?? duAn.field}
            </span>
          </div>

          <div className="mt-auto pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold tabular-nums text-ink-soft">
                {dinhDangTien(duAn.sponsored_total)} / {dinhDangTien(duAn.funding_goal)}
              </span>
              <span className="text-[13px] font-bold tabular-nums text-ink">{pct}%</span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tiến độ tài trợ của dự án ${duAn.title}: ${pct} phần trăm`}
            >
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#EC4899,#8B5CF6)" }}
              />
            </div>

            {nhan === "dat_muc_tieu" ? (
              <div className="mt-3">
                <p role="status" className="inline-flex h-6 w-full items-center justify-center rounded-full bg-[#ECFDF5] px-3 text-xs font-semibold text-[#047857]">
                  Đã đạt mục tiêu
                </p>
                <button
                  type="button"
                  onClick={() => onChon(duAn.id)}
                  aria-label={`Xem chi tiết dự án ${duAn.title}`}
                  className="mt-2 h-11 w-full rounded-[12px] border border-line-control text-sm font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                >
                  Xem chi tiết
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="mb-1.5 min-h-5 text-center text-xs text-muted-strong">{dongPhu}</p>
                <button
                  type="button"
                  onClick={() => onChon(duAn.id)}
                  aria-label={`${nhan === "tiep_tuc" ? "Tiếp tục tài trợ" : "Tài trợ ngay"} cho dự án ${duAn.title}`}
                  className="btn-primary h-11 w-full"
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
