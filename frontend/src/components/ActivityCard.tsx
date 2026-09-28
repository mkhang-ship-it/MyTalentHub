import { Clock, MapPin, Users } from "lucide-react";

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

// Lớp nút dùng chung cho mọi thẻ để chiều cao, cỡ chữ, bo góc giống hệt nhau.
const NUT_DANG_KY_CLASS =
  "h-10 w-full rounded-full px-4 text-sm font-semibold text-white cta-gradient disabled:opacity-40 shrink-0";

interface Props {
  // Dữ liệu một hoạt động cần hiển thị.
  hoatDong: StudentActivity;
  // Cờ báo thẻ này đang gọi đăng ký (khóa nút tạm thời).
  dangDangKy: boolean;
  // Hàm xử lý khi bấm nút đăng ký.
  khiDangKy: (id: number) => void;
}

// Thẻ hoạt động có chiều cao đều nhau, nút luôn nằm cùng một đường ngang ở đáy.
export default function ActivityCard({ hoatDong, dangDangKy, khiDangKy }: Props) {
  // Số chỗ đã lấy và tỉ lệ lấp đầy thanh tiến trình.
  const daLay = Math.max(0, hoatDong.capacity - hoatDong.slots_left);
  const tiLe = hoatDong.capacity > 0 ? Math.round((daLay / hoatDong.capacity) * 100) : 0;
  // Màu banner theo lĩnh vực: Kỹ thuật/Học thuật dùng nền cam, còn lại dùng nền hồng-tím.
  const lopBanner =
    hoatDong.field === "ky_thuat" || hoatDong.field === "hoc_thuat"
      ? "field-banner-tech"
      : "hero-gradient";
  const nutTat = hoatDong.registered || hoatDong.slots_left <= 0 || dangDangKy;
  // Nhãn nút hiển thị tiếng Việt theo từng trạng thái.
  const nhanNut = dangDangKy
    ? "Đang đăng ký..."
    : hoatDong.registered
      ? "Đã đăng ký ✓"
      : hoatDong.slots_left <= 0
        ? "Đã hết chỗ"
        : "Đăng ký ngay";

  return (
    // Khung thẻ là cột dọc co giãn đầy chiều cao ô lưới để mọi thẻ cao bằng nhau.
    <article
      data-testid="activity-card"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-responsive hover-lift"
    >
      {/* Dải banner trên cùng, cố định chiều cao, không co giãn. */}
      <div className={`shrink-0 px-4 pb-8 pt-3 ${lopBanner}`}>
        <span className="inline-block max-w-full truncate text-[11px] font-medium text-white rounded-full bg-white/25 px-2.5 py-1">
          {ACTIVITY_FIELD_NAMES[hoatDong.field] ?? hoatDong.field}
        </span>
      </div>

      {/* Vùng thân thẻ chiếm hết khoảng trống còn lại để đẩy nút xuống đáy. */}
      <div className="flex flex-1 flex-col p-4">
        {/* Vùng nội dung phía trên, tự giãn để nút dồn xuống dưới. */}
        <div className="flex flex-1 flex-col">
          {/* Tiêu đề giới hạn 2 dòng và giữ sẵn chiều cao 2 dòng cho đều nhau. */}
          <h3
            data-testid="activity-title"
            className="min-h-[3rem] text-[15px] font-bold leading-6 text-ink break-words line-clamp-2"
          >
            {hoatDong.title}
          </h3>
          {/* Cụm thông tin ngày, địa điểm, sĩ số; địa điểm cắt 1 dòng để không vỡ bố cục. */}
          <div className="mt-2 space-y-1 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{hoatDong.start_date ?? "Sắp mở"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {hoatDong.description ?? "Địa điểm cập nhật sau"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {daLay}/{hoatDong.capacity}
              </span>
              <span className="ml-auto shrink-0 font-semibold text-emerald-600">
                {hoatDong.slots_left > 0 ? `Còn ${hoatDong.slots_left} chỗ` : "Hết chỗ"}
              </span>
            </div>
          </div>
          {/* Thanh tiến trình tỉ lệ lấp đầy, chiều cao cố định cho mọi thẻ. */}
          <div className="mt-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-canvas-soft">
            <div
              className="h-full rounded-full hero-gradient transition-all duration-300 ease-out"
              style={{ width: `${tiLe}%` }}
            />
          </div>
        </div>

        {/* Khối nút dính đáy thẻ nhờ mt-auto, mọi nút cùng một đường ngang. */}
        <div className="mt-auto shrink-0 pt-4">
          <button
            type="button"
            data-testid="activity-register-btn"
            onClick={() => khiDangKy(hoatDong.id)}
            disabled={nutTat}
            className={NUT_DANG_KY_CLASS}
          >
            {nhanNut}
          </button>
        </div>
      </div>
    </article>
  );
}
