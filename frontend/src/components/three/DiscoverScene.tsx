import { useMemo } from "react";
import { SceneCanvas } from "./SceneCanvas";
import type { SceneBuildResult, SceneBuilder } from "./types";

// Kiểu dữ liệu thô từ endpoint /student/assessments của vai trò student
export interface DiscoverAssessment {
  test_type: string;
  result: string;
  date: string;
}

export interface DiscoverSceneProps {
  assessments?: DiscoverAssessment[] | null;
  className?: string;
}

interface KetQuaDaGom {
  khoa: string;
  nhan: string;
  diem: number;
  mau: number;
}

// Màu theo từng loại test, trùng với bảng màu trang Discover
const MAU_THEO_TEST: Record<string, { nhan: string; mau: number }> = {
  holland: { nhan: "Holland", mau: 0xf97316 },
  mbti: { nhan: "MBTI", mau: 0x8b5cf6 },
  disc: { nhan: "DISC", mau: 0xec4899 },
  mi: { nhan: "Trí thông minh", mau: 0xfbbf24 },
};

// Chú thích tiếng Việt: gom kết quả test thành điểm 0–100 để vẽ 3D
function gomKetQua(assessments: DiscoverAssessment[] | null | undefined): KetQuaDaGom[] {
  if (!assessments || assessments.length === 0) return [];
  const ketQua: KetQuaDaGom[] = [];
  for (const bai of assessments) {
    const meta = MAU_THEO_TEST[bai.test_type] ?? { nhan: bai.test_type, mau: 0xc44296 };
    try {
      const parsed = JSON.parse(bai.result) as { type?: string; score?: number; holland?: string };
      const diem = Math.max(0, Math.min(100, Number(parsed.score ?? 0) || 0));
      const nhanChiTiet = typeof parsed.holland === "string" && parsed.holland
        ? `${meta.nhan}: ${parsed.holland}`
        : typeof parsed.type === "string" && parsed.type
          ? `${meta.nhan}: ${parsed.type}`
          : meta.nhan;
      ketQua.push({ khoa: bai.test_type, nhan: nhanChiTiet, diem, mau: meta.mau });
    } catch {
      // Dữ liệu cũ không đọc được thì bỏ qua bài đó, không làm hỏng scene
    }
  }
  return ketQua.slice(0, 4);
}

// Chú thích tiếng Việt: dựng scene cột kết quả xếp vòng tròn quanh tâm
function taoSceneKetQua(three: typeof import("three"), duLieu: KetQuaDaGom[]): SceneBuildResult {
  const { Group, Mesh, SphereGeometry, MeshStandardMaterial, RingGeometry, MeshBasicMaterial, BoxGeometry, Color, DoubleSide } = three;
  const goc = new Group();

  // Quả cầu trung tâm tượng trưng cho hồ sơ năng lực
  const tam = new Mesh(
    new SphereGeometry(0.34, 24, 24),
    new MeshStandardMaterial({
      color: 0x1b2a5e,
      roughness: 0.3,
      metalness: 0.15,
      emissive: new Color(0xc44296),
      emissiveIntensity: 0.35,
    })
  );
  goc.add(tam);

  // Vòng quỹ đạo chung
  const vong = new Mesh(
    new RingGeometry(1.28, 1.36, 64),
    new MeshBasicMaterial({ color: 0x284b8c, transparent: true, opacity: 0.45, side: DoubleSide })
  );
  goc.add(vong);

  const danhSach = duLieu.length > 0
    ? duLieu
    : [
      { khoa: "holland", nhan: "Holland", diem: 0, mau: 0x8a87a3 },
      { khoa: "mbti", nhan: "MBTI", diem: 0, mau: 0x8a87a3 },
      { khoa: "disc", nhan: "DISC", diem: 0, mau: 0x8a87a3 },
      { khoa: "mi", nhan: "Trí thông minh", diem: 0, mau: 0x8a87a3 },
    ];

  danhSach.forEach((muc, chiSo) => {
    const gocQuay = (Math.PI * 2 * chiSo) / danhSach.length - Math.PI / 2;
    const banKinh = 1.32;
    const x = Math.cos(gocQuay) * banKinh;
    const z = Math.sin(gocQuay) * banKinh;
    // Chiều cao cột theo điểm 0–100, tối thiểu vẫn thấy được
    const chieuCao = 0.25 + (muc.diem / 100) * 1.15;
    const cot = new Mesh(
      new BoxGeometry(0.26, chieuCao, 0.26),
      new MeshStandardMaterial({
        color: new Color(muc.mau),
        emissive: new Color(muc.mau),
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.1,
      })
    );
    cot.position.set(x, chieuCao / 2 - 0.45, z);
    goc.add(cot);

    // Viên ngọc trên đỉnh cột, to dần theo điểm
    const ngoc = new Mesh(
      new SphereGeometry(0.09 + (muc.diem / 100) * 0.08, 16, 16),
      new MeshStandardMaterial({
        color: new Color(muc.mau),
        emissive: new Color(muc.mau),
        emissiveIntensity: 0.5,
        roughness: 0.25,
      })
    );
    ngoc.position.set(x, chieuCao - 0.45 + 0.14, z);
    goc.add(ngoc);
  });

  return {
    root: goc,
    update: (delta, time) => {
      goc.rotation.y += delta * 0.22;
      tam.position.y = Math.sin(time * 0.8) * 0.04;
    },
  };
}

// Chú thích tiếng Việt: khung 2D khi WebGL hỏng, liệt kê kết quả dạng danh sách
function KhungDuPhongDiscover({ duLieu }: { duLieu: KetQuaDaGom[] }) {
  if (duLieu.length === 0) {
    return (
      <div role="img" aria-label="Chưa có kết quả test nào" className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center">
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
          <circle cx="36" cy="36" r="25" stroke="#C44296" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="36" cy="36" r="11" fill="#F97316" opacity="0.35" />
        </svg>
        <p className="text-sm font-semibold text-ink">Hãy làm bài test đầu tiên</p>
        <p className="text-xs text-muted">Kết quả của bạn sẽ hiện thành bản đồ 3D ở đây.</p>
      </div>
    );
  }
  return (
    <div role="img" aria-label={`Bản đồ kết quả với ${duLieu.length} bài test`} className="flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white/80 p-4">
        <p className="text-sm font-bold text-ink">Kết quả đã có</p>
        <ul role="list" aria-label="Danh sách kết quả test" className="mt-2 space-y-2">
          {duLieu.map((muc) => (
            <li key={muc.khoa} role="listitem" aria-label={`${muc.nhan}: ${muc.diem} trên 100`} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs font-semibold text-ink">{muc.nhan}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas-soft" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${muc.diem}%`, backgroundColor: `#${muc.mau.toString(16).padStart(6, "0")}` }} />
              </span>
              <span className="w-12 shrink-0 text-right text-xs font-bold tabular-nums text-ink">{muc.diem}/100</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DiscoverScene({ assessments, className = "" }: DiscoverSceneProps) {
  // Chú thích tiếng Việt: lấy dữ liệu có sẵn của student, không gọi endpoint lạ
  const duLieu = useMemo(() => gomKetQua(assessments), [assessments]);
  const xayScene = useMemo<SceneBuilder>(
    () => (three) => taoSceneKetQua(three, duLieu),
    [duLieu]
  );

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: 300, minHeight: 280 }}>
      <SceneCanvas
        className="h-full w-full"
        config={{ sceneId: "discover-assessment-scene", dprCap: 1.5, failIfMajorPerformanceCaveat: true, prefersReducedMotion: true }}
        buildScene={xayScene}
        fallback={<KhungDuPhongDiscover duLieu={duLieu} />}
        decorative
      />
    </div>
  );
}
