import { Check, Clock, Loader2, MapPin, Users } from "lucide-react";

// Kiểu dữ liệu hoạt động cho trang sinh viên (giữ đồng bộ với trang danh sách).
export interface StudentActivity {
  id: number;
  title: string;
  field: string;
  description: string | null;
  capacity: number;
  start_date: string | null;
  registered: boolean;
  slots_left: number;
}

// Tên lĩnh vực hiển thị tiếng Việt (dùng chung cho thẻ).
export const ACTIVITY_FIELD_NAMES: Record<string, string> = {
  nghe_thuat: "Nghệ thuật",
  the_thao: "Thể thao",
  kinh_doanh: "Kinh doanh",
  ky_thuat: "Kỹ thuật",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

// Hình học chung của nút (cao 44, bo 12, chữ 14/600) — 4 trạng thái cùng dùng
// nên đáy nút luôn thẳng hàng (bất biến 6, đặc tả 02 B9g). Màu theo trạng thái riêng.
const NUT_CHUNG =
  "h-11 w-full rounded-[12px] px-5 text-sm font-semibold text-center transition-all duration-200 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2";

// Nền nút mặc định: cta-gradient phủ 12% đen để chữ trắng đạt 4,61:1 (file 00 mục 7.4).
const NEN_NUT_CHINH =
  "linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)";

interface Props {
  // Dữ liệu một hoạt động cần hiển thị.
  hoatDong: StudentActivity;
  // Cờ báo thẻ này đang gọi đăng ký (khóa nút tạm thời).
  dangDangKy: boolean;
  // Hàm xử lý khi bấm nút đăng ký.
  khiDangKy: (id: number) => void;
}

// Thẻ hoạt động: giữ 6 bất biến nút thẳng hàng (đặc tả 02 đầu file), số đo theo B9.
export default function ActivityCard({ hoatDong, dangDangKy, khiDangKy }: Props) {
  // Số chỗ đã lấy và tỉ lệ lấp đầy thanh tiến trình.
  const daLay = Math.max(0, hoatDong.capacity - hoatDong.slots_left);
  const tiLe = hoatDong.capacity > 0 ? Math.round((daLay / hoatDong.capacity) * 100) : 0;
  // Màu banner theo lĩnh vực: Kỹ thuật/Học thuật dùng nền cam, còn lại dùng nền hồng-tím.
  const lopBanner =
    hoatDong.field === "ky_thuat" || hoatDong.field === "hoc_thuat"
      ? "field-banner-tech"
      : "hero-gradient";
  const hetCho = hoatDong.slots_left <= 0;
  // Lớp màu theo trạng thái (hình học đã chung ở NUT_CHUNG).
  const lopNutTrangThai = dangDangKy
    ? "text-white opacity-90"
    : hoatDong.registered
      ? "bg-portal-soft border border-portal text-portal-dark"
      : hetCho
        ? "bg-canvas-soft border border-line-control text-muted-strong"
        : "text-white hover:brightness-[1.08] hover:-translate-y-px";
  const nenNut =
    dangDangKy || (!hoatDong.registered && !hetCho)
      ? { backgroundImage: NEN_NUT_CHINH }
      : undefined;

  return (
    // Khung thẻ: cột dọc co giãn đầy ô lưới; radius 20 viết rõ (rounded-2xl chỉ = 16px).
    // Bỏ hover-lift: thẻ không phải vùng bấm, chỉ nút mới hover (file 00 mục 4.1).
    <article
      data-testid="activity-card"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_1px_2px_rgba(51,50,77,.05),0_4px_12px_rgba(51,50,77,.06)] transition-responsive"
    >
      {/* Banner cao 84px cố định, không co giãn (bất biến 3). */}
      <div className={`shrink-0 px-4 py-3 h-[84px] ${lopBanner}`}>
        <span className="inline-flex h-6 max-w-full items-center truncate rounded-full bg-white px-2.5 text-xs font-semibold text-portal-dark">
          {ACTIVITY_FIELD_NAMES[hoatDong.field] ?? hoatDong.field}
        </span>
      </div>

      {/* Thân thẻ tự giãn để đẩy nút xuống đáy (bất biến 4). */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col">
          {/* Tiêu đề 16/700, giữ sẵn 2 dòng 48px (bất biến 5). */}
          <h3
            data-testid="activity-title"
            className="min-h-[3rem] text-base font-bold leading-6 text-ink break-words line-clamp-2"
          >
            {hoatDong.title}
          </h3>
          {/* 3 dòng meta 12px, cách nhau 4px, cách dưới 8px. */}
          <div className="mb-2 mt-2 space-y-1 text-xs text-muted-strong">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{hoatDong.start_date ?? "Sắp mở"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {hoatDong.description ?? "Địa điểm cập nhật sau"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} className="shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {daLay}/{hoatDong.capacity}
              </span>
              <span
                className={`ml-auto shrink-0 text-xs font-bold ${
                  hetCho ? "text-[#B91C1C]" : "text-[#047857]"
                }`}
              >
                {hetCho ? "Hết chỗ" : `Còn ${hoatDong.slots_left} chỗ`}
              </span>
            </div>
          </div>
          {/* Thanh tiến độ cao 8, track --line; chữ đã có ở dòng 3 nên ẩn với SR. */}
          <div
            className="mt-2 h-2 shrink-0 overflow-hidden rounded-full bg-line"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full hero-gradient transition-all duration-300 ease-out"
              style={{ width: `${tiLe}%` }}
            />
          </div>
        </div>

        {/* Khối nút dính đáy nhờ mt-auto (bất biến 6). */}
        <div className="mt-auto shrink-0 pt-4">
          <button
            type="button"
            data-testid="activity-register-btn"
            onClick={() => khiDangKy(hoatDong.id)}
            disabled={hoatDong.registered || hetCho || dangDangKy}
            aria-busy={dangDangKy}
            aria-label={
              dangDangKy
                ? `Đang đăng ký ${hoatDong.title}`
                : hoatDong.registered
                  ? `Đã đăng ký ${hoatDong.title}`
                  : hetCho
                    ? `${hoatDong.title} đã hết chỗ`
                    : `Đăng ký ${hoatDong.title}`
            }
            style={nenNut}
            className={`${NUT_CHUNG} ${lopNutTrangThai}`}
          >
            {dangDangKy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Đang đăng ký…
              </span>
            ) : hoatDong.registered ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Check size={16} aria-hidden="true" />
                Đã đăng ký
              </span>
            ) : hetCho ? (
              "Đã hết chỗ"
            ) : (
              "Đăng ký ngay"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
