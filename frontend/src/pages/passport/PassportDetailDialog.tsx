import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Award,
  Briefcase,
  CalendarDays,
  FileCheck2,
  Lightbulb,
  RotateCcw,
  Star,
  Target,
  X,
} from "lucide-react";
import { PassportHoloCard } from "../../components/three/PassportHoloCard";
import { FIELD_NAMES, type Passport } from "./shared";

export interface PassportDetailDialogProps {
  data: Passport;
  open: boolean;
  onClose: () => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const HOME_ROT = { x: -8, y: 0 };

function qrModules(seed = 0): boolean[] {
  const corners = [0, 4, 20, 24, 2, 22];
  return Array.from({ length: 25 }, (_, i) => {
    const randomish = (i * 7 + seed * 13) % 3 !== 0;
    return corners.includes(i) || randomish;
  });
}

export function PassportDetailDialog({ data, open, onClose }: PassportDetailDialogProps) {
  const s = data.student;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, startRx: HOME_ROT.x, startRy: HOME_ROT.y });
  const [rot, setRot] = useState(HOME_ROT);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Khóa scroll nền + focus vào nút đóng, restore khi đóng
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [open]);

  // Esc đóng
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, startRx: rot.x, startRy: rot.y };
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || reduced) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setRot({
      x: clamp(drag.current.startRx - dy * 0.4, -35, 35),
      y: clamp(drag.current.startRy + dx * 0.4, -35, 35),
    });
  };
  const handlePointerEnd = () => {
    drag.current.active = false;
  };

  const avgSkill =
    data.skills.length > 0
      ? data.skills.reduce((sum, k) => sum + k.level, 0) / data.skills.length
      : 0;
  const interests = (s.interests ?? "").split(", ").filter(Boolean);
  const modules = qrModules(data.qr_code.length);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Talent Passport của ${s.full_name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop làm mờ phần xung quanh */}
      <div className="absolute inset-0 bg-ink/75 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ── Cột trái: thẻ hologram xoay được → panel dọc riêng ── */}
        <div className="flex flex-col gap-4 overflow-y-auto border-b border-line bg-canvas-soft/40 p-5 lg:max-h-[92vh] lg:border-b-0 lg:border-r lg:p-6">
          <div className="micro-slot" style={{ position: "relative", overflow: "hidden" }}>
            <div style={{ perspective: reduced ? "none" : 1200 }}>
              <div
                className="touch-none select-none"
                style={{
                  transform: reduced ? undefined : `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                  transformStyle: "preserve-3d",
                  transition: drag.current.active ? "none" : "transform 200ms ease-out",
                  cursor: reduced ? "default" : "grab",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                <PassportHoloCard data={data} size="dialog" />
                {!reduced && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-5"
                    style={{
                      transform: "translateZ(34px)",
                      background:
                        "radial-gradient(48% 48% at 50% 42%, rgb(196 66 150 / 0.14), transparent 70%)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!reduced ? (
              <>
                <button
                  type="button"
                  onClick={() => setRot(HOME_ROT)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas-soft hover:border-line-strong"
                >
                  <RotateCcw size={13} aria-hidden="true" /> Đặt lại góc
                </button>
                <p className="text-xs text-muted-light">Kéo chuột trên thẻ để xoay.</p>
              </>
            ) : (
              <p className="text-xs text-muted-light">Thẻ hiển thị tĩnh (chế độ giảm chuyển động).</p>
            )}
          </div>

          {/* QR lớn + mã định danh */}
          <div className="rounded-xl border border-line bg-white p-3 text-center">
            <div className="mx-auto grid h-28 w-28 grid-cols-5 gap-px rounded-lg bg-white p-1.5 shadow-inner ring-1 ring-line">
              {modules.map((filled, i) => (
                <div key={i} className={filled ? "rounded-[1px] bg-ink" : "bg-transparent"} />
              ))}
            </div>
            <div className="mt-2.5 break-all font-mono text-xs font-semibold text-ink">{data.qr_code}</div>
            <div className="mt-1 text-[11px] text-muted-light">Cập nhật {data.updated_at}</div>
            <div className="mt-2 text-[11px] leading-snug text-muted">
              Quét mã để xác thực hồ sơ — khi xin học bổng, thực tập hoặc tuyển dụng.
            </div>
          </div>
        </div>

        {/* ── Cột phải: panel chi tiết ── */}
        <div className="max-h-[92vh] space-y-6 overflow-y-auto p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Talent Passport</h2>
              <p className="text-sm text-muted">
                {s.full_name} · Lớp {s.class_name} · Khối {s.grade}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-canvas-soft hover:border-line-strong"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Giới thiệu & Sở thích */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Target size={16} className="text-portal" aria-hidden="true" />
              Giới thiệu & Sở thích
            </h3>
            <p className="text-sm leading-relaxed text-muted">{s.bio ?? "Chưa cập nhật giới thiệu."}</p>
            {interests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {interests.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="rounded-full bg-portal-soft px-2.5 py-1 text-xs font-medium text-portal-dark"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Tổng quan điểm số */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Star size={16} className="text-portal" aria-hidden="true" />
              Điểm số nổi bật
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-portal-soft p-2.5">
                <div className="text-lg font-extrabold text-portal-dark">{s.talent_score}</div>
                <div className="text-[10px] text-muted">Điểm năng lực</div>
              </div>
              <div className="rounded-xl bg-portal-soft p-2.5">
                <div className="text-lg font-extrabold text-portal">{s.experience_hours}h</div>
                <div className="text-[10px] text-muted">Trải nghiệm</div>
              </div>
              <div className="rounded-xl bg-portal-soft p-2.5">
                <div className="text-lg font-extrabold text-portal">{data.badges.length}</div>
                <div className="text-[10px] text-muted">Huy hiệu</div>
              </div>
            </div>
          </section>

          {/* Toàn bộ kỹ năng */}
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <Lightbulb size={16} className="text-portal" aria-hidden="true" />
              Kỹ năng năng lực
              <span className="ml-auto text-xs font-medium text-muted-light">TB: {avgSkill.toFixed(1)}/10</span>
            </h3>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              {data.skills.map((k) => (
                <div key={k.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink-soft">{k.name}</span>
                    <span className="text-muted-light">{k.level}/10</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-canvas-soft">
                    <div
                      className="h-full rounded-full hero-gradient transition-all duration-500"
                      style={{ width: `${Math.min(100, k.level * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Huy hiệu */}
          {data.badges.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                <Award size={16} className="text-portal" aria-hidden="true" />
                Huy hiệu
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.badges.map((b) => (
                  <span
                    key={b.code}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: `${b.color}1A`, color: b.color }}
                  >
                    <span aria-hidden="true">{b.icon}</span>
                    {b.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Chứng chỉ */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <FileCheck2 size={16} className="text-portal-dark" aria-hidden="true" />
              Chứng chỉ & Giấy khen
            </h3>
            <div className="space-y-2.5">
              {data.certificates.length === 0 ? (
                <p className="text-sm text-muted">Chưa có chứng chỉ.</p>
              ) : (
                data.certificates.map((c, i) => (
                  <div key={`${c.title}-${i}`} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                    <div className="text-sm font-medium text-ink">{c.title}</div>
                    <div className="text-xs text-muted-light">
                      {c.issuer}
                      {c.issued_at ? ` · ${c.issued_at}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Dự án */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Briefcase size={16} className="text-portal" aria-hidden="true" />
              Dự án cá nhân
            </h3>
            <div className="space-y-2.5">
              {data.projects.length === 0 ? (
                <p className="text-sm text-muted">Chưa tham gia dự án.</p>
              ) : (
                data.projects.map((p, i) => (
                  <div key={`${p.title}-${i}`} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                    <div className="text-sm font-medium text-ink">{p.title}</div>
                    <div className="text-xs text-muted-light capitalize">
                      {FIELD_NAMES[p.field] ?? p.field} · {p.status === "active" ? "Đang triển khai" : p.status}
                    </div>
                    {p.description && <div className="mt-1 text-xs leading-relaxed text-muted">{p.description}</div>}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Hoạt động */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <CalendarDays size={16} className="text-portal" aria-hidden="true" />
              Hoạt động trải nghiệm
            </h3>
            <div className="space-y-2.5">
              {data.activities.length === 0 ? (
                <p className="text-sm text-muted">Chưa tham gia hoạt động nào.</p>
              ) : (
                data.activities.map((a, i) => (
                  <div
                    key={`${a.title}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-ink">{a.title}</div>
                      <div className="text-xs text-muted-light capitalize">
                        {FIELD_NAMES[a.field] ?? a.field}
                        {a.role ? ` · ${a.role}` : ""}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-portal">{a.hours}h</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}