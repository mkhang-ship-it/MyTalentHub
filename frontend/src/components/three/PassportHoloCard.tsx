import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { QrCode } from "../qr/QrCode";

export interface PassportData {
  qr_code: string;
  updated_at?: string;
  student: {
    full_name: string;
    class_name: string;
    grade: number;
    talent_score?: number;
    experience_hours?: number;
  };
  skills?: Array<{ name: string; level: number }>;
  badges?: Array<{ name: string; color: string; unlocked?: boolean; icon?: string }>;
  certificates?: Array<{ title: string; issuer: string; issued_at?: string | null }>;
}

export interface PassportHoloCardProps {
  data?: PassportData;
  className?: string;
  /** "thumb" – thẻ trên trang (bấm để mở chi tiết); "dialog" – thẻ trong popup chi tiết (tĩnh). */
  size?: "thumb" | "dialog";
  /** Chỉ dùng với size="thumb": gọi khi bấm thẻ để mở popup chi tiết. */
  onRequestOpen?: () => void;
}

// Chú thích tiếng Việt: thẻ 2D thuần CSS, không dùng three.js để nhẹ GPU.

function PassportCardFace({ data, size, interactive }: { data?: PassportData; size: "thumb" | "dialog"; interactive?: boolean }) {
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
    // Chú thích tiếng Việt: cột flex co giãn để mọi thẻ trong lưới cao bằng nhau.
    <div className="flex h-full w-full flex-1 flex-col justify-between gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-portal to-orange-400 font-extrabold text-white shadow-lg ${dialog ? "h-14 w-14 text-xl" : "h-12 w-12 text-lg"}`}>
          {s.full_name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className={`truncate font-bold text-white ${dialog ? "text-lg" : "text-base"}`}>{s.full_name}</p>
          <p className={`text-white/70 ${dialog ? "text-sm" : "text-xs"}`}>{s.class_name} · Khối {s.grade}</p>
        </div>
        <span className="ml-auto hidden shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/80 sm:block">
          FTalent
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((st) => (
          <div key={st.label} className="rounded-xl bg-white/10 px-1 py-2.5 text-center backdrop-blur-sm">
            <div className={`font-extrabold text-white ${dialog ? "text-xl" : "text-lg"}`}>{st.value}</div>
            <div className="text-[10px] leading-tight text-white/70">{st.label}</div>
          </div>
        ))}
      </div>

      {/* QR thật quét được (dùng chung bộ mã hoá với trang check-in) */}
      <div className={`flex items-center gap-3 rounded-xl bg-white/95 p-2.5 ${dialog ? "max-w-sm" : ""}`}>
        <QrCode
          ma={data.qr_code}
          kichThuoc={dialog ? 88 : 72}
          className="shrink-0"
          nhan={`Mã QR Talent Passport ${data.qr_code} — dùng camera điện thoại để quét xác thực`}
        />
        <div className="min-w-0">
          <p className="break-all font-mono text-[11px] font-semibold text-ink">{data.qr_code}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-ink-soft">
            Quét mã để xác thực hồ sơ — học bổng, thực tập, tuyển dụng.
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Cập nhật {data.updated_at ?? "—"}</p>
        </div>
      </div>

      {/* Chú thích tiếng Việt: chân thẻ luôn nằm đáy nhờ mt-auto */}
      <div className="mt-auto flex items-center justify-between text-[10px] text-white/55">
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

export function PassportHoloCard({ data, className = "", size = "thumb", onRequestOpen }: PassportHoloCardProps) {
  const hasData = Boolean(data);
  const dialog = size === "dialog";

  const interactive = !dialog && hasData && Boolean(onRequestOpen);

  // Chú thích tiếng Việt: chỉ bấm/phím để mở chi tiết, không xoay 3D theo chuột.
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
          {/* Chú thích tiếng Việt: thẻ 2D — nền gradient navy, bóng đổ nhiều lớp, viền sáng trong */}
          <div className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1B2A5E] via-[#284B8C] to-[#1B2A5E] shadow-[0_24px_60px_rgb(30_27_46/0.35),0_8px_20px_rgb(196_66_150/0.12),inset_0_1px_0_rgb(255_255_255/0.15)] transition-shadow duration-300 group-hover:shadow-[0_30px_70px_rgb(30_27_46/0.45),0_10px_24px_rgb(196_66_150/0.16),inset_0_1px_0_rgb(255_255_255/0.2)]">
            {/* Chú thích tiếng Việt: điểm sáng trang trí đặt sau nội dung, không che chữ */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <span className="absolute -top-16 left-1/4 h-40 w-72 rounded-full bg-[#C44296]/20 blur-2xl" />
              <span className="absolute -bottom-20 right-0 h-44 w-64 rounded-full bg-[#F97316]/15 blur-2xl" />
            </div>
            {/* Chú thích tiếng Việt: vệt sáng chạy khi rê chuột, chỉ dịch chuyển 2D */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <span className="absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/15 to-transparent motion-safe:transition-transform motion-safe:duration-700 group-hover:translate-x-[320%]" />
            </div>
            {/* Chú thích tiếng Việt: nội dung thẻ luôn đọc được, không dùng aria-hidden */}
            <div className={`relative z-10 flex h-full flex-1 flex-col ${dialog ? "p-6" : "p-5"}`}>
              <PassportCardFace data={data} size={size} interactive={interactive} />
            </div>
            {/* Viền sáng trong */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] rounded-2xl ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}