import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { QrCode } from "../../components/qr/QrCode";
import type { Passport } from "./shared";

export interface PassportCard2DProps {
  data?: Passport;
  className?: string;
  /** "thumb" – thẻ trên trang (bấm để mở chi tiết); "dialog" – thẻ trong popup (tĩnh). */
  size?: "thumb" | "dialog";
  /** Chỉ dùng với size="thumb": gọi khi bấm thẻ để mở popup chi tiết. */
  onRequestOpen?: () => void;
}

// Thẻ 2D thuần CSS — thay thế PassportHoloCard (three/) bằng bản nội bộ trong
// pages/passport để P5 có thể xoá three/ mà không hỏng hộ chiếu. Không canvas,
// không WebGL, không import three. Giữ nguyên số đo: minHeight 400 (trang) /
// 460 (hộp), QR hiển thị 82px (ô module 2px — sàn quét được, xem r4-out).

function MatTruoc({ data, size, interactive }: { data?: Passport; size: "thumb" | "dialog"; interactive?: boolean }) {
  if (!data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-white">
        <div className="flex h-16 w-12 items-center justify-center rounded-xl border-2 border-portal/50 bg-portal-soft text-portal">
          <span className="text-xl font-extrabold text-portal-dark">ID</span>
        </div>
        <p className="text-sm font-semibold text-white">Đang chờ hồ sơ năng lực</p>
        <p className="text-xs text-white/70">Dữ liệu sẽ xuất hiện khi hồ sơ khả dụng.</p>
      </div>
    );
  }

  const s = data.student;
  const dialog = size === "dialog";
  const stats = [
    { label: "Điểm năng lực", value: s.talent_score ?? 0 },
    { label: "Trải nghiệm", value: `${s.experience_hours ?? 0}h` },
    { label: "Huy hiệu", value: data.badges?.length ?? 0 },
  ];

  return (
    <div className="flex h-full w-full flex-1 flex-col justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-portal to-orange-400 font-extrabold text-white shadow-lg ${dialog ? "h-14 w-14 text-xl" : "h-12 w-12 text-lg"}`}>
          {s.full_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className={`truncate font-bold text-white ${dialog ? "text-lg" : "text-base"}`}>{s.full_name}</p>
          <p className={`text-white/70 ${dialog ? "text-sm" : "text-xs"}`}>{s.class_name} · Khối {s.grade}</p>
        </div>
        <span className="ml-auto hidden shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/80 sm:block">
          FTalent
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((st) => (
          <div key={st.label} className="rounded-xl bg-white/10 px-1 py-2.5 text-center backdrop-blur-sm">
            <div className={`font-extrabold text-white ${dialog ? "text-xl" : "text-lg"}`}>{st.value}</div>
            <div className="text-xs font-medium leading-tight text-white">{st.label}</div>
          </div>
        ))}
      </div>

      {/* QR thật quét được, nền trắng đặc để camera đọc được.
          kichThuoc=82 → với nội dung URL passport (phiên bản 4, n=33, tổng 41
          module incl. lề) ô = 82/41 = 2px đúng sàn quét được. Mọi giá trị
          72/88/112 trước đây cũng render ra 82 vì Math.max(2, floor(...)). */}
      <div className={`flex items-center gap-3 rounded-xl bg-white p-2.5 ${dialog ? "max-w-sm" : ""}`}>
        <QrCode
          ma={data.qr_code}
          kichThuoc={82}
          className="shrink-0"
          nhan={`Mã QR Talent Passport ${data.qr_code} — dùng camera điện thoại để quét xác thực`}
        />
        <div className="min-w-0">
          <p className="break-all font-mono text-xs font-semibold text-ink">{data.qr_code}</p>
          <p className="mt-0.5 text-xs leading-snug text-ink-soft">
            Quét mã để xác thực hồ sơ — học bổng, thực tập, tuyển dụng.
          </p>
          <p className="mt-1 text-xs text-muted-strong">Cập nhật {data.updated_at ?? "—"}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between text-xs text-white">
        <span>Talent Passport</span>
        {interactive ? (
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white/90">
            <span aria-hidden="true">✦</span> Bấm để xem chi tiết
          </span>
        ) : (
          <span>Cập nhật {data.updated_at ?? "—"}</span>
        )}
      </div>
    </div>
  );
}

export function PassportCard2D({ data, className = "", size = "thumb", onRequestOpen }: PassportCard2DProps) {
  const hasData = Boolean(data);
  const dialog = size === "dialog";
  const interactive = !dialog && hasData && Boolean(onRequestOpen);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRequestOpen?.();
    }
  };

  return (
    <div className={className} style={{ position: "relative", width: "100%", minHeight: dialog ? 460 : 400, display: "flex", flexDirection: "column" }}>
      <div
        className={interactive ? "group flex h-full flex-1 cursor-pointer flex-col rounded-2xl select-none touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2" : "flex h-full flex-1 flex-col"}
        style={{ position: "relative" }}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-haspopup={interactive ? "dialog" : undefined}
        aria-label={interactive && data ? `Talent Passport của ${data.student.full_name} — bấm để xem chi tiết` : undefined}
        onClick={interactive ? () => onRequestOpen?.() : undefined}
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-full flex-1 flex-col">
          <div className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1B2A5E] via-[#284B8C] to-[#1B2A5E] shadow-[0_24px_60px_rgb(30_27_46/0.35),0_8px_20px_rgb(196_66_150/0.12),inset_0_1px_0_rgb(255_255_255/0.15)] transition-shadow duration-300 group-hover:shadow-[0_30px_70px_rgb(30_27_46/0.45),0_10px_24px_rgb(196_66_150/0.16),inset_0_1px_0_rgb(255_255_255/0.2)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <span className="absolute -top-16 left-1/4 h-40 w-72 rounded-full bg-[#C44296]/20 blur-2xl" />
              <span className="absolute -bottom-20 right-0 h-44 w-64 rounded-full bg-[#F97316]/15 blur-2xl" />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <span className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent motion-safe:transition-transform motion-safe:duration-700 group-hover:translate-x-[320%]" />
            </div>
            <div className={`relative z-10 flex h-full flex-1 flex-col ${dialog ? "p-6" : "p-5"}`}>
              <MatTruoc data={data} size={size} interactive={interactive} />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] rounded-2xl ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
