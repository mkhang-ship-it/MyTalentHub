import { useMemo } from "react";
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

function PassportFallback({ data }: { data?: PassportData }) {
  if (!data) {
    return (
      <div role="img" aria-label="Talent Passport chưa có dữ liệu" className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
        <div className="flex h-16 w-12 items-center justify-center rounded-xl border-2 border-portal/40 bg-portal-soft text-portal">
          <span className="text-xl font-extrabold">ID</span>
        </div>
        <p className="text-sm font-semibold text-ink">Đang chờ hồ sơ năng lực</p>
        <p className="text-xs text-muted">Dữ liệu sẽ xuất hiện khi hồ sơ khả dụng.</p>
      </div>
    );
  }

  const skills = data.skills?.slice(0, 4) ?? [];
  return (
    <div role="img" aria-label={`Talent Passport hologram của ${data.student.full_name}`} className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#1B2A5E] to-[#284B8C] p-5 text-white shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-portal to-orange-400 font-extrabold">
            {data.student.full_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{data.student.full_name}</p>
            <p className="text-[11px] text-white/70">{data.student.class_name} · Khối {data.student.grade}</p>
          </div>
          <span className="ml-auto rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold">{data.qr_code}</span>
        </div>
        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.name} className="flex items-center gap-2 text-[11px]">
              <span className="w-20 truncate text-white/80">{skill.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-gradient-to-r from-portal to-orange-400" style={{ width: `${Math.min(100, Math.max(0, skill.level) * 10)}%` }} /></span>
              <span className="w-7 text-right font-semibold">{skill.level}/10</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-white/65">Talent Passport · cập nhật {data.updated_at ?? "—"}</p>
      </div>
    </div>
  );
}

export function PassportHoloCard({ data, className = "" }: PassportHoloCardProps) {
  const hasData = Boolean(data);
  const buildScene = useMemo<SceneBuilder | undefined>(
    () => hasData && data ? (three) => createPassportScene(three, data) : undefined,
    [data, hasData]
  );

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: 360, minHeight: 320 }}>
      <SceneCanvas
        className="absolute inset-0"
        config={{ sceneId: "passport-holo-scene", dprCap: 1.5, failIfMajorPerformanceCaveat: true, prefersReducedMotion: true }}
        buildScene={buildScene}
        fallback={<PassportFallback data={data} />}
        ariaLabel="Holographic Talent Passport"
        decorative={false}
      />
    </div>
  );
}
