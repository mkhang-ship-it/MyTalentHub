import { useMemo } from "react";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneBuildResult, SceneBuilder } from "./types";

export interface SkillDataItem {
  name: string;
  level: number;
}

export interface BadgeDataItem {
  name: string;
  color: string;
  unlocked?: boolean;
}

export interface SkillOrbitData {
  skills: SkillDataItem[];
  badges?: BadgeDataItem[];
  talent_score?: number;
  experience_hours?: number;
}

export interface SkillOrbitProps {
  data?: SkillOrbitData;
  className?: string;
}

function createOrbitScene(three: typeof import("three"), data: SkillOrbitData): SceneBuildResult {
  const { Group, Mesh, SphereGeometry, MeshStandardMaterial, RingGeometry, MeshBasicMaterial, BoxGeometry, Color, DoubleSide } = three;
  const root = new Group();
  const talent = Math.max(0, Math.min(100, data.talent_score ?? 0));
  const center = new Mesh(
    new SphereGeometry(0.36 + (talent / 100) * 0.12, 24, 24),
    new MeshStandardMaterial({
      color: 0xc44296,
      roughness: 0.28,
      metalness: 0.12,
      emissive: new Color(0x1b2a5e),
      emissiveIntensity: 0.4,
    })
  );
  root.add(center);

  const orbitRadius = 1.15 + Math.min(0.5, (data.experience_hours ?? 0) / 300);
  const ring = new Mesh(
    new RingGeometry(orbitRadius + 0.12, orbitRadius + 0.22, 64),
    new MeshBasicMaterial({ color: 0x284b8c, transparent: true, opacity: 0.45, side: DoubleSide })
  );
  root.add(ring);

  const glowRing = new Mesh(
    new RingGeometry(orbitRadius + 0.62, orbitRadius + 0.66, 64),
    new MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.16, side: DoubleSide })
  );
  root.add(glowRing);

  const accentRing = new Mesh(
    new RingGeometry(orbitRadius - 0.03, orbitRadius + 0.03, 64),
    new MeshBasicMaterial({ color: 0xc44296, transparent: true, opacity: 0.25, side: DoubleSide })
  );
  root.add(accentRing);

  const skills = data.skills.slice(0, 8);
  skills.forEach((skill, index) => {
    const level = Math.max(0, Math.min(10, skill.level));
    const angle = (Math.PI * 2 * index) / Math.max(1, skills.length) - Math.PI / 2;
    const radius = orbitRadius + (level / 10) * 0.42;
    const hue = 0.82 - (level / 10) * 0.12;
    const node = new Mesh(
      new SphereGeometry(0.1 + (level / 10) * 0.13, 16, 16),
      new MeshStandardMaterial({
        color: new Color().setHSL(hue, 0.72, 0.55),
        emissive: new Color().setHSL(hue, 0.85, 0.45),
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.08,
      })
    );
    node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    root.add(node);
  });

  data.badges?.filter((badge) => badge.unlocked).slice(0, 4).forEach((badge, index, unlocked) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, unlocked.length) + Math.PI / 4;
    const marker = new Mesh(
      new BoxGeometry(0.18, 0.18, 0.045),
      new MeshStandardMaterial({ color: new Color(badge.color || 0xf97316), emissive: new Color(badge.color || 0xf97316), emissiveIntensity: 0.45 })
    );
    marker.position.set(Math.cos(angle) * 1.9, 0.2, Math.sin(angle) * 1.9);
    marker.rotation.y = angle;
    root.add(marker);
  });

  return {
    root,
    update: (delta, time) => {
      root.rotation.y += delta * 0.18;
      center.position.y = Math.sin(time * 0.8) * 0.04;
    },
  };
}

function SkillOrbitFallback({ data }: { data?: SkillOrbitData }) {
  const skills = data?.skills?.slice(0, 6) ?? [];
  if (skills.length === 0) {
    return (
      <div role="img" aria-label="Skill Orbit chưa có dữ liệu" className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <circle cx="36" cy="36" r="25" stroke="#C44296" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="36" cy="36" r="11" fill="#F97316" opacity="0.35" />
        </svg>
        <p className="text-sm font-semibold text-ink">Skill Orbit đang chờ dữ liệu</p>
        <p className="text-xs text-muted">Hoàn thành đánh giá để xem kỹ năng của bạn.</p>
      </div>
    );
  }

  return (
    <div role="img" aria-label={`Skill Orbit với ${skills.length} kỹ năng`} className="relative flex h-full items-center justify-center p-4">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 shadow-[0_12px_40px_rgb(51_50_77/0.12)] backdrop-blur-sm" />
      <div className="relative h-[220px] w-[220px]">
        <div className="absolute inset-0 rounded-full border border-dashed border-portal/30" />
        <div className="absolute inset-7 rounded-full border border-line-strong/60" />
        <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-portal to-portal-dark text-sm font-bold text-white shadow-lg">
          {data?.talent_score ?? "—"}
        </div>
        {skills.map((skill, index) => {
          const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2;
          const radius = 82 + Math.max(0, Math.min(10, skill.level)) * 2;
          return (
            <div
              key={skill.name}
              className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-portal/30 bg-portal-soft text-center text-[8px] font-semibold leading-tight text-portal-dark"
              style={{ left: `${110 + Math.cos(angle) * radius}px`, top: `${110 + Math.sin(angle) * radius}px` }}
              title={`${skill.name}: ${skill.level}/10`}
            >
              {skill.name.slice(0, 6)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SkillOrbit({ data, className = "" }: SkillOrbitProps) {
  const hasData = Boolean(data && (data.skills.length > 0 || (data.badges?.length ?? 0) > 0));
  const buildScene = useMemo<SceneBuilder | undefined>(
    () => hasData && data ? (three) => createOrbitScene(three, data) : undefined,
    [data, hasData]
  );

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: 320, minHeight: 280 }}>
      <SceneCanvas
        className="absolute inset-0 z-0 opacity-70"
        config={{ sceneId: "skill-orbit-scene", dprCap: 1.5, failIfMajorPerformanceCaveat: true, prefersReducedMotion: true }}
        buildScene={buildScene}
        decorative
      />
      <div className="absolute inset-0 z-10">
        <SkillOrbitFallback data={data} />
      </div>
    </div>
  );
}
