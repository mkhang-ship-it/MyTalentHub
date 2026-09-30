// TalentNetwork2D — mạng kỹ năng 2D thật, SVG thuần, KHÔNG dùng thư viện 3D.
// role="img" + <desc> tiếng Việt, đổi màu được qua prop `mau`.

import { useState } from "react";

export interface TalentNode {
  id: string;
  /** Tên hiện trong node. */
  ten: string;
  /** Nhóm để tô màu, ví dụ "kỹ thuật" / "mềm". */
  nhom?: string;
}

export interface TalentLink {
  tu: string;
  den: string;
}

export interface TalentNetwork2DProps {
  tieuDe: string;
  nut: TalentNode[];
  lienKet?: TalentLink[];
  /** Bảng màu theo nhóm. */
  mau?: Record<string, string>;
  thongBaoRong?: string;
}

const MAU_MAC_DINH: Record<string, string> = {
  "kỹ thuật": "#1B2A5E",
  "mềm": "#C44296",
  chung: "#6F6C8A",
};

const W = 360;
const H = 240;

export default function TalentNetwork2D({ tieuDe, nut, lienKet = [], mau = {} }: TalentNetwork2DProps) {
  const [chon, setChon] = useState<string | null>(null);
  const ds = nut.slice(0, 8);
  const bangMau = { ...MAU_MAC_DINH, ...mau };
  const moTa = `Mạng kỹ năng gồm ${ds.length} kỹ năng: ${ds.map((n) => n.ten).join(", ")}.`;

  if (ds.length === 0) {
    return (
      <figure
        data-viz="talent-network-2d"
        className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
        aria-label={tieuDe}
      >
        <h3 className="text-base font-bold text-ink sm:text-lg">{tieuDe}</h3>
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-xs font-semibold text-ink-soft sm:text-sm">
          Chưa đủ dữ liệu để vẽ mạng kỹ năng.
        </p>
      </figure>
    );
  }

  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 44;
  const toaDo = new Map<string, { x: number; y: number }>();
  ds.forEach((n, i) => {
    const goc = (Math.PI * 2 * i) / ds.length - Math.PI / 2;
    toaDo.set(n.id, { x: cx + Math.cos(goc) * r, y: cy + Math.sin(goc) * r });
  });

  return (
    <figure
      data-viz="talent-network-2d"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
      aria-label={`${tieuDe}. ${moTa}`}
    >
      <h3 className="text-base font-bold text-ink sm:text-lg">{tieuDe}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">{moTa}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="net-title net-desc"
        className="mt-2 block h-auto w-full max-w-full"
      >
        <title id="net-title">{tieuDe}</title>
        <desc id="net-desc">{`Sơ đồ mạng kỹ năng 2D: ${moTa} Chạm vào từng kỹ năng để xem nhóm của nó.`}</desc>
        {lienKet.map((l, i) => {
          const a = toaDo.get(l.tu);
          const b = toaDo.get(l.den);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e2d9d0" strokeWidth="1.5" />;
        })}
        {ds.map((n) => {
          const p = toaDo.get(n.id);
          if (!p) return null;
          const fill = bangMau[n.nhom ?? "chung"] ?? bangMau.chung;
          const dangChon = chon === n.id;
          return (
            <g key={n.id} onClick={() => setChon(dangChon ? null : n.id)} role="button" tabIndex={0}
              aria-label={`${n.ten}${n.nhom ? `, nhóm ${n.nhom}` : ""}. Chạm để ${dangChon ? "bỏ chọn" : "xem nhóm"}.`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setChon(dangChon ? null : n.id);
                }
              }}
              style={{ cursor: "pointer" }}>
              {/* Vùng chạm vô hình ≥44px quanh node */}
              <circle cx={p.x} cy={p.y} r="26" fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={dangChon ? 22 : 18}
                fill={fill}
                opacity={chon && !dangChon ? 0.45 : 1}
              />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
                {n.ten.slice(0, 3)}
              </text>
              <text x={p.x} y={p.y + 34} textAnchor="middle" fontSize="12" fill="#33324d">
                {n.ten.length > 12 ? `${n.ten.slice(0, 12)}…` : n.ten}
              </text>
            </g>
          );
        })}
      </svg>
      <p aria-live="polite" className="mt-1 min-h-[44px] text-xs leading-relaxed text-ink-soft">
        {chon
          ? (() => {
              const n = ds.find((d) => d.id === chon);
              return n ? `Đang chọn: ${n.ten}${n.nhom ? ` — nhóm ${n.nhom}` : ""}.` : "";
            })()
          : "Chạm vào từng điểm để xem nhóm kỹ năng."}
      </p>
      <ul className="sr-only">
        {ds.map((n) => (
          <li key={n.id}>{`${n.ten}${n.nhom ? `, nhóm ${n.nhom}` : ""}`}</li>
        ))}
      </ul>
    </figure>
  );
}
