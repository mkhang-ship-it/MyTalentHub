import { useEffect, useMemo, useRef, useState } from "react";

// Mạng lưỡng phân nhân tài — kỹ năng: chỉ nối cặp CÓ Ý NGHĨA (nhân tài thực sự có
// kỹ năng đó). Bố cục hai cột để cấu trúc đọc được ngay, không phải "búi tóc".

export interface DataNode {
  id: string | number;
  /** Họ tên đầy đủ — component tự xuống dòng, KHÔNG cắt bằng "…". */
  label: string;
  group?: string;
  color?: string;
  size?: number;
}

export interface DataLink {
  source: string | number;
  target: string | number;
  value?: number;
}

export interface DataNetworkProps {
  nodes: DataNode[];
  links: DataLink[];
  mode?: "school" | "enterprise";
  reducedMotion?: boolean;
  height?: number;
  ariaLabel?: string;
  /** Tiêu đề hiện trên biểu đồ (bắt buộc phải có để biết đang xem gì). */
  tieuDe?: string;
  /** Câu tóm tắt bằng chữ — thứ khiến biểu đồ có ý nghĩa. */
  tomTat?: string;
}

/** Nhãn tiếng Việt cho từng nhóm (không hiện tên trường tiếng Anh). */
const NHAN_NHOM: Record<string, string> = {
  talent: "Nhân tài",
  skill: "Kỹ năng",
  project: "Dự án",
  grade: "Khối",
  class: "Lớp",
};

const MAU_NHOM: Record<string, string> = {
  talent: "#C44296",
  skill: "#F97316",
  project: "#EC4899",
  grade: "#8B5CF6",
  class: "#C44296",
  default: "#8A87A3",
};

function nhanNhom(group?: string): string {
  if (!group) return "Dữ liệu";
  return NHAN_NHOM[group] ?? group;
}

function mauNhom(node: DataNode): string {
  return node.color || MAU_NHOM[node.group || "default"] || MAU_NHOM.default;
}

/** Chia nhãn thành tối đa 2 dòng theo từ để không tràn và không cắt. */
function xuongDong(nhan: string): [string, string | null] {
  const tu = nhan.split(" ").filter(Boolean);
  if (tu.length <= 2) return [nhan, null];
  const giua = Math.ceil(tu.length / 2);
  return [tu.slice(0, giua).join(" "), tu.slice(giua).join(" ")];
}

interface NutVe {
  nut: DataNode;
  x: number;
  y: number;
  dong1: string;
  dong2: string | null;
}

export default function DataNetwork({ nodes, links, mode = "school", reducedMotion, height, ariaLabel, tieuDe, tomTat }: DataNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [chiKyNangChung, setChiKyNangChung] = useState(false);
  const isReduced = reducedMotion ?? prefersReduced;
  const label = ariaLabel || (mode === "school" ? "Mạng dữ liệu lớp — kỹ năng" : "Mạng dữ liệu nhân tài — dự án — kỹ năng");

  useEffect(() => {
    const target = containerRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Tối đa 5 nhân tài điểm cao nhất + kỹ năng thật của họ (trang gọi đã lọc sẵn;
  // đây là lưới an toàn cuối để biểu đồ không bao giờ thành "búi tóc").
  const nhanTai = useMemo(() => nodes.filter((n) => (n.group ?? "") === "talent").slice(0, 5), [nodes]);
  const idNhanTai = useMemo(() => new Set(nhanTai.map((n) => n.id)), [nhanTai]);
  const lienKetThat = useMemo(
    () => links.filter((l) => idNhanTai.has(l.source) || idNhanTai.has(l.target)),
    [links, idNhanTai],
  );
  const demKyNang = useMemo(() => {
    const dem = new Map<string | number, number>();
    for (const l of lienKetThat) {
      const idKyNang = idNhanTai.has(l.source) ? l.target : l.source;
      dem.set(idKyNang, (dem.get(idKyNang) ?? 0) + 1);
    }
    return dem;
  }, [lienKetThat, idNhanTai]);
  const kyNang = useMemo(() => {
    const ds = nodes.filter((n) => (n.group ?? "") !== "talent" && demKyNang.has(n.id));
    return chiKyNangChung ? ds.filter((n) => (demKyNang.get(n.id) ?? 0) >= 2) : ds;
  }, [nodes, demKyNang, chiKyNangChung]);
  const idHien = useMemo(() => new Set([...nhanTai.map((n) => n.id), ...kyNang.map((n) => n.id)]), [nhanTai, kyNang]);
  const lienKetHien = useMemo(
    () => lienKetThat.filter((l) => idHien.has(l.source) && idHien.has(l.target)),
    [lienKetThat, idHien],
  );

  const RONG = 300;
  const buocDong = 46;
  const caoSvg = Math.max(180, 56 + Math.max(nhanTai.length, kyNang.length, 1) * buocDong);
  const nutVe: NutVe[] = useMemo(() => {
    const viTri = new Map<string | number, { x: number; y: number }>();
    nhanTai.forEach((n, i) => viTri.set(n.id, { x: 78, y: 34 + i * buocDong }));
    kyNang.forEach((n, i) => viTri.set(n.id, { x: 222, y: 34 + i * buocDong }));
    return [...nhanTai, ...kyNang].map((n) => {
      const p = viTri.get(n.id) ?? { x: 150, y: 30 };
      const [dong1, dong2] = xuongDong(n.label);
      return { nut: n, x: p.x, y: p.y, dong1, dong2 };
    });
  }, [nhanTai, kyNang]);

  const moTa = `${nhanTai.length} nhân tài, ${kyNang.length} kỹ năng, ${lienKetHien.length} liên kết kỹ năng thật.`;
  const nhomHien = useMemo(() => {
    const ds = new Set<string>();
    for (const n of nutVe) ds.add(n.nut.group ?? "");
    return [...ds];
  }, [nutVe]);
  const duLieuRong = nhanTai.length === 0 || lienKetHien.length === 0;

  return (
    <figure
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-line bg-white text-ink p-4 sm:p-5"
      style={height ? { minHeight: height } : undefined}
      aria-label={`${tieuDe ?? label}. ${tomTat ?? ""} ${moTa}`}
    >
      {tieuDe && <h3 className="font-semibold text-ink">{tieuDe}</h3>}
      {tomTat && <p className="mt-1 text-sm text-muted leading-relaxed">{tomTat}</p>}
      {/* Chờ vùng nhìn, KHÔNG phải chờ mạng. Nói đúng việc đang chờ gì: dữ liệu
          đã có sẵn từ props, chỉ là biểu đồ chưa được vẽ cho tới khi người dùng
          cuộn tới. Ghi "Đang tải dữ liệu mạng…" ở đây là sai — nó khiến người
          dùng tưởng đang chờ tải, và nếu họ không cuộn tới thì cứ treo mãi. */}
      {!visible && (
        <div className="flex h-40 items-center justify-center text-xs text-muted">
          Biểu đồ sẽ hiện khi bạn cuộn tới.
        </div>
      )}
      {visible && duLieuRong && (
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-sm text-muted">
          Chưa đủ dữ liệu để vẽ mạng liên kết (cần ít nhất 1 nhân tài có kỹ năng).
        </p>
      )}
      {visible && !duLieuRong && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" aria-label="Chú giải màu">
            {nhomHien.map((g) => (
              <span key={g} className="inline-flex items-center gap-1.5 font-medium text-ink">
                <span
                  className="inline-block h-3 w-3 rounded-full shrink-0"
                  style={{ background: MAU_NHOM[g] ?? MAU_NHOM.default }}
                  aria-hidden="true"
                />
                {nhanNhom(g)}
              </span>
            ))}
            <span className="text-muted-light" aria-hidden="true">—</span>
            <span className="text-muted">{moTa}</span>
          </div>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={chiKyNangChung}
              onChange={(e) => setChiKyNangChung(e.target.checked)}
              className="h-4 w-4 accent-pink-600"
            />
            Chỉ hiện kỹ năng chung của từ 2 nhân tài trở lên
          </label>
          {isReduced ? (
            <ul className="mt-3 space-y-1 text-xs text-muted" aria-label="Danh sách liên kết kỹ năng">
              {lienKetHien.map((l, i) => {
                const tu = nutVe.find((n) => n.nut.id === l.source)?.nut.label ?? String(l.source);
                const den = nutVe.find((n) => n.nut.id === l.target)?.nut.label ?? String(l.target);
                return <li key={i}>{tu} — có kỹ năng {den}</li>;
              })}
            </ul>
          ) : (
            <svg viewBox={`0 0 ${RONG} ${caoSvg}`} className="mt-2 h-auto w-full" role="img" aria-label={label} tabIndex={0}>
              <title>{tieuDe ?? label}</title>
              <desc>{moTa}</desc>
              <g aria-label="Liên kết kỹ năng thật">
                {lienKetHien.map((l, i) => {
                  const tu = nutVe.find((n) => n.nut.id === l.source);
                  const den = nutVe.find((n) => n.nut.id === l.target);
                  if (!tu || !den) return null;
                  return (
                    <line
                      key={`${String(l.source)}-${String(l.target)}-${i}`}
                      x1={tu.x} y1={tu.y} x2={den.x} y2={den.y}
                      stroke="#c7c9d9"
                      strokeOpacity="0.8"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    >
                      <title>{`${tu.nut.label} — có kỹ năng ${den.nut.label}`}</title>
                    </line>
                  );
                })}
              </g>
              <g aria-label="Nút dữ liệu">
                {nutVe.map(({ nut, x, y, dong1, dong2 }) => {
                  const benTrai = x < RONG / 2;
                  return (
                    <g key={nut.id} role="group" aria-label={`${nut.label} — ${nhanNhom(nut.group)}`} tabIndex={0}>
                      <title>{`${nut.label} — ${nhanNhom(nut.group)}`}</title>
                      <circle cx={x} cy={y} r={8} fill={mauNhom(nut)} stroke="#ffffff" strokeWidth="1.5" />
                      <text x={benTrai ? x - 14 : x + 14} y={dong2 ? y - 4 : y + 1} textAnchor={benTrai ? "end" : "start"} fontSize="9.5" fontWeight="600" fill="#2b2a3d">
                        {dong1}
                      </text>
                      {dong2 && (
                        <text x={benTrai ? x - 14 : x + 14} y={y + 8} textAnchor={benTrai ? "end" : "start"} fontSize="9.5" fontWeight="600" fill="#2b2a3d">
                          {dong2}
                        </text>
                      )}
                      <text x={benTrai ? x - 14 : x + 14} y={y + (dong2 ? 19 : 12)} textAnchor={benTrai ? "end" : "start"} fontSize="7.5" fill="#8A87A3">
                        {nhanNhom(nut.group)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
        </>
      )}
    </figure>
  );
}
