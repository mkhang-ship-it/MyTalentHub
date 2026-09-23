import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneBuildResult, SceneBuilder } from "./types";

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
  /** "thumb" – thẻ trên trang (lơ lửng + nghiêng theo chuột); "dialog" – thẻ trong popup chi tiết (tĩnh). */
  size?: "thumb" | "dialog";
  /** Chỉ dùng với size="thumb": gọi khi bấm thẻ để mở popup chi tiết. */
  onRequestOpen?: () => void;
}

function createPassportScene(three: typeof import("three"), data: PassportData): SceneBuildResult {
  const { Group, Mesh, PlaneGeometry, MeshStandardMaterial, BoxGeometry, SphereGeometry, RingGeometry, MeshBasicMaterial, Color, DoubleSide } = three;
  const root = new Group();
  const card = new Mesh(
    new PlaneGeometry(3.1, 2.05),
    new MeshStandardMaterial({ color: 0x284b8c, roughness: 0.2, metalness: 0.18, emissive: new Color(0x1b2a5e), emissiveIntensity: 0.32, side: DoubleSide })
  );
  card.rotation.x = -0.06;
  root.add(card);

  const halo = new Mesh(
    new RingGeometry(1.12, 1.16, 64),
    new MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.45, side: DoubleSide })
  );
  halo.position.z = 0.02;
  root.add(halo);

  const skills = data.skills?.slice(0, 5) ?? [];
  skills.forEach((skill, index) => {
    const level = Math.max(0, Math.min(10, skill.level));
    const bar = new Mesh(
      new BoxGeometry(Math.max(0.04, (level / 10) * 1.25), 0.07, 0.025),
      new MeshStandardMaterial({ color: 0xc44296, emissive: new Color(0xf97316), emissiveIntensity: 0.22 })
    );
    bar.position.set(-0.15 + (level / 10) * 0.62, 0.47 - index * 0.28, 0.03);
    root.add(bar);
  });

  const qrGroup = new Group();
  const qrSeed = data.qr_code.length;
  for (let x = 0; x < 5; x += 1) {
    for (let y = 0; y < 5; y += 1) {
      const corner = (x === 0 && y === 0) || (x === 4 && y === 0) || (x === 0 && y === 4);
      if (!corner && (x + y + qrSeed) % 3 === 0) continue;
      const module = new Mesh(new BoxGeometry(0.06, 0.06, 0.025), new MeshBasicMaterial({ color: 0x1b2a5e }));
      module.position.set(-1.18 + x * 0.08, 0.78 - y * 0.08, 0.04);
      qrGroup.add(module);
    }
  }
  root.add(qrGroup);

  const badge = new Mesh(
    new SphereGeometry(0.1, 16, 16),
    new MeshStandardMaterial({ color: 0xffc107, emissive: new Color(0xf97316), emissiveIntensity: 0.3 })
  );
  badge.position.set(1.15, 0.72, 0.06);
  root.add(badge);

  return {
    root,
    update: (delta, time) => {
      root.rotation.y = Math.sin(time * 0.42) * 0.045;
      root.rotation.x = Math.sin(time * 0.28) * 0.018;
      halo.rotation.z += delta * 0.08;
      badge.position.y = 0.72 + Math.sin(time * 0.8) * 0.035;
    },
  };
}

function qrModules(seed = 0): boolean[] {
  const corners = [0, 4, 20, 24, 2, 22];
  return Array.from({ length: 25 }, (_, i) => {
    const randomish = (i * 7 + seed * 13) % 3 !== 0;
    return corners.includes(i) || randomish;
  });
}

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
  const modules = qrModules(data.qr_code.length);

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4">
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

      {/* QR compact */}
      <div className={`flex items-center gap-3 rounded-xl bg-white/95 p-2.5 ${dialog ? "max-w-sm" : ""}`}>
        <div className={`grid shrink-0 grid-cols-5 gap-px rounded-md bg-white p-1 ${dialog ? "h-24 w-24" : "h-20 w-20"}`}>
          {modules.map((filled, i) => (
            <div key={i} className={filled ? "rounded-[1px] bg-ink" : "bg-transparent"} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="break-all font-mono text-[11px] font-semibold text-ink">{data.qr_code}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted">
            Quét mã để xác thực hồ sơ — học bổng, thực tập, tuyển dụng.
          </p>
          <p className="mt-1 text-[10px] text-muted-light">Cập nhật {data.updated_at ?? "—"}</p>
        </div>
      </div>

      {/* Brand row */}
      <div className="flex items-center justify-between text-[10px] text-white/55">
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
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const buildScene = useMemo<SceneBuilder | undefined>(
    () => (hasData && data ? (three) => createPassportScene(three, data) : undefined),
    [data, hasData]
  );

  const interactive = !dialog && hasData && Boolean(onRequestOpen);

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || !interactive) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const y = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    el.style.transform = `perspective(1000px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-5px)`;
    el.style.transition = "transform 80ms ease-out";
  };
  const handlePointerLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.currentTarget.style.transform = "";
    e.currentTarget.style.transition = "transform 300ms ease";
  };
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
        className={interactive ? "group flex flex-1 cursor-pointer flex-col rounded-2xl select-none touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2" : "flex flex-1 flex-col"}
        style={{ position: "relative", transformStyle: "preserve-3d", willChange: "transform" }}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-haspopup={interactive ? "dialog" : undefined}
        aria-label={interactive && data ? `Talent Passport của ${data.student.full_name} — bấm để xem chi tiết` : undefined}
        onClick={interactive ? () => onRequestOpen?.() : undefined}
        onKeyDown={handleKeyDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="card-float flex flex-1 flex-col">
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1B2A5E] via-[#284B8C] to-[#1B2A5E] shadow-[0_24px_60px_rgb(30_27_46/0.35)] transition-shadow duration-300 group-hover:shadow-[0_30px_70px_rgb(30_27_46/0.45)]">
            {/* Lớp nền hologram 3D */}
            <div className="absolute inset-0 opacity-70">
              <SceneCanvas
                className="h-full w-full"
                config={{
                  sceneId: dialog ? "passport-holo-dialog" : "passport-holo-scene",
                  dprCap: 1.4,
                  failIfMajorPerformanceCaveat: true,
                  prefersReducedMotion: true,
                }}
                buildScene={buildScene}
                decorative
              />
            </div>
            {/* Vừa giữ nổi 3D vừa đảm bảo chữ đọc rõ */}
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#1B2A5E]/60 via-[#284B8C]/30 to-[#1B2A5E]/60" />
            {/* Thông tin */}
            <div className={`relative z-10 flex h-full flex-col ${dialog ? "p-6" : "p-5"}`} aria-hidden={interactive || dialog ? true : undefined}>
              <PassportCardFace data={data} size={size} interactive={interactive} />
            </div>
            {/* Viền sáng trong */}
            <div className="pointer-events-none absolute inset-0 z-[2] rounded-2xl ring-1 ring-inset ring-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}