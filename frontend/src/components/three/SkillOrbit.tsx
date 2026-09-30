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

// Chú thích tiếng Việt: màu huy hiệu theo tên (DB trả "blue", "violet", …).
// Bản cũ truyền thẳng tên màu cho three.Color → "blue" ra xanh dương tuyệt đối
// 0x0000ff (ô vuông chói trên nền sáng); "amber"/"emerald" thì three không hiểu.
// Map sang hex để ô marker 3D và chú thích dưới ảnh luôn giống nhau.
const MAU_HUY_HIEU: Record<string, string> = {
  blue: "#3B82F6",
  violet: "#8B5CF6",
  amber: "#F59E0B",
  emerald: "#10B981",
};

function mauHuyHieu(color?: string): string {
  if (!color) return "#F97316";
  if (color.startsWith("#")) return color;
  return MAU_HUY_HIEU[color] ?? "#F97316";
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

  // Chú thích tiếng Việt: huy hiệu đặt NGAY NGOÀI quả trung tâm, gắn trên một
  // vòng riêng cùng mặt phẳng XY với các vòng kia. Bản cũ đặt marker ở bán
  // kính 1.9 — xa hơn vòng cam ngoài cùng (1.873) và ở lệch sang mặt phẳng XZ
  // — nên ô vuông lơ lửng tách rời, không bám vào đâu và không có nhãn.
  const badgeRingRadius = 0.7;
  const huyHieu = (data.badges ?? []).filter((badge) => badge.unlocked).slice(0, 4);
  if (huyHieu.length > 0) {
    const badgeRing = new Mesh(
      new RingGeometry(badgeRingRadius - 0.02, badgeRingRadius + 0.02, 48),
      new MeshBasicMaterial({ color: 0x284b8c, transparent: true, opacity: 0.5, side: DoubleSide })
    );
    root.add(badgeRing);
    huyHieu.forEach((badge, index) => {
      const angle = (Math.PI * 2 * index) / huyHieu.length + Math.PI / 4;
      const mau = new Color(mauHuyHieu(badge.color));
      const marker = new Mesh(
        new BoxGeometry(0.18, 0.18, 0.045),
        new MeshStandardMaterial({ color: mau, emissive: mau, emissiveIntensity: 0.45 })
      );
      marker.position.set(Math.cos(angle) * badgeRingRadius, Math.sin(angle) * badgeRingRadius, 0);
      marker.rotation.z = angle;
      root.add(marker);
    });
  }

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
        <p className="text-xs text-muted-strong">Hoàn thành đánh giá để xem kỹ năng của bạn.</p>
      </div>
    );
  }

  // Chú thích tiếng Việt: khung dự phòng 2D, mọi node nằm gọn trong khung tròn.
  return (
    <div role="img" aria-label={`Skill Orbit với ${skills.length} kỹ năng`} className="relative flex h-full items-center justify-center p-4">
      {/* Nền trắng giới hạn đúng bằng khung trong, không tràn ra ngoài */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 shadow-[0_12px_40px_rgb(51_50_77/0.12)]" />
      <div className="relative h-[220px] w-[220px]">
        <div className="absolute inset-0 rounded-full border border-dashed border-portal/30" aria-hidden="true" />
        <div className="absolute inset-7 rounded-full border border-line-strong/60" aria-hidden="true" />
        <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-portal to-portal-dark text-sm font-bold text-white shadow-lg">
          {data?.talent_score ?? "—"}
        </div>
        {/* Danh sách kỹ năng: bán kính tính theo % để không tràn khung ở mọi level */}
        <div role="list" aria-label="Danh sách kỹ năng" className="absolute inset-0">
          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / skills.length - Math.PI / 2;
            // Bán kính tâm 36% + nửa node 56/2 = 12,7% → 48,7% < 50% nên luôn nằm trong khung
            const orbitPct = 30 + (Math.max(0, Math.min(10, skill.level)) / 10) * 6;
            const leftPct = 50 + Math.cos(angle) * orbitPct;
            const topPct = 50 + Math.sin(angle) * orbitPct;
            return (
              <div
                key={skill.name}
                role="listitem"
                aria-label={`${skill.name}: ${skill.level}/10`}
                className="absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-portal/30 bg-portal-soft text-center text-xs font-semibold leading-tight text-portal-dark"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                title={`${skill.name}: ${skill.level}/10`}
              >
                {skill.name}
              </div>
            );
          })}
        </div>
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

  // Chú thích tiếng Việt: chú thích BẰNG CHỮ ngay dưới khối 3D — cảnh 3D không
  // đủ chỗ cho label, nên tên kỹ năng/huy hiệu hiện ở đây (dữ liệu nào hiện
  // tên đó, không bịa thêm). Nền trắng + chữ --ink để đọc được trên thẻ sáng.
  const skillsHien = (data?.skills ?? []).slice(0, 8);
  const huyHieuHien = (data?.badges ?? []).filter((b) => b.unlocked).slice(0, 4);

  // Chú thích tiếng Việt: 3D hiện qua SceneCanvas, 2D chỉ hiện khi WebGL hỏng (prop fallback).
  return (
    <div className={className} style={{ width: "100%" }}>
      <div style={{ position: "relative", width: "100%", height: 320, minHeight: 280 }}>
        <SceneCanvas
          className="absolute inset-0"
          config={{ sceneId: "skill-orbit-scene", dprCap: 1.5, failIfMajorPerformanceCaveat: true, prefersReducedMotion: true }}
          buildScene={buildScene}
          fallback={<SkillOrbitFallback data={data} />}
          decorative
        />
      </div>
      {(skillsHien.length > 0 || huyHieuHien.length > 0) && (
        <ul role="list" aria-label="Chú thích tên kỹ năng và huy hiệu trong Skill Orbit" className="mt-3 flex flex-wrap items-center gap-2">
          {skillsHien.map((skill) => {
            const level = Math.max(0, Math.min(10, skill.level));
            // Cùng công thức màu với node 3D (hue = 0.82 - level/10 × 0.12) để
            // chấm tròn trong ảnh khớp chip chữ bên dưới.
            const mau = `hsl(${Math.round((0.82 - (level / 10) * 0.12) * 360)} 72% 55%)`;
            return (
              <li
                key={skill.name}
                role="listitem"
                aria-label={`${skill.name}: ${level}/10`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-xs font-semibold text-ink shadow-sm"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: mau }} aria-hidden="true" />
                <span className="whitespace-nowrap">{skill.name}</span>
                <span className="tabular-nums text-muted-strong">{level}/10</span>
              </li>
            );
          })}
          {huyHieuHien.map((badge) => (
            <li
              key={badge.name}
              role="listitem"
              aria-label={`Huy hiệu ${badge.name}`}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-xs font-semibold text-ink shadow-sm"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: mauHuyHieu(badge.color) }} aria-hidden="true" />
              <span className="whitespace-nowrap">Huy hiệu {badge.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
