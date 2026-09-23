import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Award,
  Briefcase,
  CalendarDays,
  FileCheck2,
  Lightbulb,
  Maximize2,
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

type Rot = { x: number; y: number };
const HOME_ROT: Rot = { x: -8, y: 0 };

function qrModules(seed = 0): boolean[] {
  const corners = [0, 4, 20, 24, 2, 22];
  return Array.from({ length: 25 }, (_, i) => {
    const randomish = (i * 7 + seed * 13) % 3 !== 0;
    return corners.includes(i) || randomish;
  });
}

/** Mặt sau thẻ — hiện khi xoay qua 180°, thiết kế riêng (thẻ vật lý kiểu xác thực). */
function PassportCardBack({ data }: { data: Passport }) {
  const modules = qrModules(data.qr_code.length);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1B2A5E] via-[#284B8C] to-[#1B2A5E] p-6 shadow-[0_24px_60px_rgb(30_27_46/0.35)]">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-portal to-orange-400 text-sm font-extrabold text-white shadow">
          F
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">FTalentHub</p>
          <p className="text-[10px] text-white/60">Hồ sơ năng lực số</p>
        </div>
      </div>

      {/* Trung tâm: tiêu đề + QR + mã */}
      <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-base font-extrabold tracking-wide text-white">Talent Passport</p>
        <div className="grid h-28 w-28 grid-cols-5 gap-px rounded-lg bg-white p-1.5 ring-1 ring-white/40 shadow-inner">
          {modules.map((filled, i) => (
            <div key={i} className={filled ? "rounded-[1px] bg-ink" : "bg-transparent"} />
          ))}
        </div>
        <p className="break-all font-mono text-xs font-semibold text-white/90">{data.qr_code}</p>
        <p className="max-w-[260px] text-[11px] leading-snug text-white/70">
          Quét mã để xác thực hồ sơ — khi xin học bổng, thực tập hoặc tuyển dụng.
        </p>
      </div>

      {/* Chân thẻ */}
      <div className="mt-4 border-t border-white/15 pt-3 text-center text-[10px] text-white/60">
        Xác thực bởi trường THPT FTI Cần Thơ · Cập nhật {data.updated_at}
      </div>
    </div>
  );
}

interface RotatableCardProps {
  data: Passport;
  rot: Rot;
  onRotate: (rot: Rot) => void;
  reduced: boolean;
  /** Bấm (không kéo) vào thẻ → phóng to toàn màn hình. */
  onActivate?: () => void;
  /** Glow holo phía sau thẻ. */
  glow?: boolean;
  /** Nhãn trợ năng khi thẻ bấm được. */
  label?: string;
}

/** Thẻ xoay 360° 2 mặt — dùng trong popup chi tiết lẫn chế độ toàn màn hình. */
function RotatableCard({ data, rot, onRotate, reduced, onActivate, glow = true, label }: RotatableCardProps) {
  const drag = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startRx: HOME_ROT.x,
    startRy: HOME_ROT.y,
  });

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRx: rot.x,
      startRy: rot.y,
    };
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active || reduced) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    onRotate({
      x: clamp(drag.current.startRx - dy * 0.4, -90, 90),
      y: drag.current.startRy + dx * 0.4,
    });
  };
  const handlePointerEnd = () => {
    drag.current.active = false;
  };
  const handleClick = () => {
    if (drag.current.moved) return;
    onActivate?.();
  };

  return (
    <div className="micro-slot w-full" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ perspective: reduced ? "none" : 1200 }}>
        <div
          className="touch-none select-none"
          role={onActivate ? "button" : undefined}
          tabIndex={onActivate ? 0 : undefined}
          aria-label={label}
          onClick={handleClick}
          onKeyDown={
            onActivate
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActivate();
                  }
                }
              : undefined
          }
          style={{
            position: "relative",
            transform: reduced ? undefined : `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transformStyle: "preserve-3d",
            transition: drag.current.active ? "none" : "transform 200ms ease-out",
            cursor: reduced ? "default" : onActivate ? "zoom-in" : "grab",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {/* Mặt trước */}
          <div className="[backface-visibility:hidden]" style={{ transformStyle: "preserve-3d" }}>
            <PassportHoloCard data={data} size="dialog" />
          </div>
          {/* Mặt sau — hiện khi lật 180° */}
          <div
            aria-hidden="true"
            className="absolute inset-0 [backface-visibility:hidden]"
            style={{ transform: "rotateY(180deg)", transformStyle: "preserve-3d" }}
          >
            <PassportCardBack data={data} />
          </div>
          {!reduced && glow && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-5"
              style={{
                transform: "translateZ(34px)",
                background: "radial-gradient(48% 48% at 50% 42%, rgb(196 66 150 / 0.14), transparent 70%)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function PassportDetailDialog({ data, open, onClose }: PassportDetailDialogProps) {
  const s = data.student;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const focusCloseRef = useRef<HTMLButtonElement | null>(null);
  const [rot, setRot] = useState<Rot>(HOME_ROT);
  const [reduced, setReduced] = useState(false);
  const [focus, setFocus] = useState(false);

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

  // Esc: thoát chế độ toàn màn hình trước, đóng popup sau
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (focus) setFocus(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, focus, onClose]);

  // Chế độ toàn màn hình mở: focus nút thoát, restore khi quay lại chi tiết
  useEffect(() => {
    if (!focus) return;
    const previous = document.activeElement as HTMLElement | null;
    focusCloseRef.current?.focus();
    return () => previous?.focus?.();
  }, [focus]);

  if (!open) return null;

  const avgSkill =
    data.skills.length > 0
      ? data.skills.reduce((sum, k) => sum + k.level, 0) / data.skills.length
      : 0;
  const interests = (s.interests ?? "").split(", ").filter(Boolean);
  const modules = qrModules(data.qr_code.length);

  return createPortal(
    <Fragment>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Talent Passport của ${s.full_name}`}
        className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6"
      >
        {/* Backdrop làm mờ phần xung quanh */}
        <div className="absolute inset-0 bg-ink/75 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

        <div className="relative z-10 grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* ── Cột trái: thẻ hologram xoay được → panel dọc riêng ── */}
          <div className="flex flex-col gap-4 overflow-y-auto border-b border-line bg-canvas-soft/40 p-5 lg:max-h-[92vh] lg:border-b-0 lg:border-r lg:p-6">
            <RotatableCard
              data={data}
              rot={rot}
              onRotate={setRot}
              reduced={reduced}
              onActivate={() => setFocus(true)}
              label={`Talent Passport của ${s.full_name} — bấm để xem toàn màn hình`}
            />

            <div className="flex flex-wrap items-center gap-2">
              {!reduced && (
                <button
                  type="button"
                  onClick={() => setRot(HOME_ROT)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas-soft hover:border-line-strong"
                >
                  <RotateCcw size={13} aria-hidden="true" /> Đặt lại góc
                </button>
              )}
              <button
                type="button"
                onClick={() => setFocus(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-canvas-soft hover:border-line-strong"
              >
                <Maximize2 size={13} aria-hidden="true" /> Xem toàn màn hình
              </button>
              {!reduced ? (
                <p className="text-xs text-muted-light">Kéo để xoay 360° — lật thẻ để xem mặt sau.</p>
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
      </div>

      {/* ── Chế độ toàn màn hình: chỉ còn thẻ lớn ở chính giữa, xoay 360° ── */}
      {focus &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Talent Passport của ${s.full_name} — chế độ toàn màn hình`}
            className="fixed inset-0 z-[100] overflow-y-auto"
            onClick={() => setFocus(false)}
          >
            <div className="pointer-events-none absolute inset-0 bg-ink/85 backdrop-blur-lg" aria-hidden="true" />
            <div className="pointer-events-none relative z-10 flex min-h-full flex-col items-center justify-center gap-5 p-4 sm:p-6">
              <div
                className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="truncate text-xs font-semibold text-white/70">
                  Talent Passport · {s.full_name} · {data.qr_code}
                </p>
                <button
                  ref={focusCloseRef}
                  type="button"
                  onClick={() => setFocus(false)}
                  aria-label="Quay lại chi tiết"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="pointer-events-auto w-full max-w-[460px]" onClick={(e) => e.stopPropagation()}>
                <RotatableCard data={data} rot={rot} onRotate={setRot} reduced={reduced} />
              </div>
              {!reduced && (
                <p
                  className="pointer-events-auto text-center text-xs text-white/60"
                  onClick={(e) => e.stopPropagation()}
                >
                  Kéo để xoay 360° — lật thẻ để xem mặt sau.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </Fragment>,
    document.body
  );
}