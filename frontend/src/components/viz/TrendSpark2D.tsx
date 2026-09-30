// TrendSpark2D — đường xu hướng nhỏ (sparkline) SVG thuần, không thư viện.

export interface TrendPoint {
  /** Nhãn thời điểm, ví dụ "T9". */
  nhan: string;
  diem: number;
}

export interface TrendSpark2DProps {
  tieuDe: string;
  tomTat?: string;
  diem: TrendPoint[];
  thongBaoRong?: string;
}

const W = 320;
const H = 96;
const PAD = 10;

export default function TrendSpark2D({ tieuDe, tomTat, diem, thongBaoRong }: TrendSpark2DProps) {
  const ds = diem.slice(0, 12);
  const nhanAria = `${tieuDe}. ${ds.map((d) => `${d.nhan}: ${d.diem} điểm`).join("; ")}.`;

  if (ds.length === 0) {
    return (
      <figure
        data-viz="trend-spark-2d"
        className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
        aria-label={tieuDe}
      >
        <h3 className="text-base font-bold text-ink sm:text-lg">{tieuDe}</h3>
        <p role="status" className="mt-4 rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-xs font-semibold text-ink-soft sm:text-sm">
          {thongBaoRong ?? "Chưa đủ dữ liệu để vẽ xu hướng."}
        </p>
      </figure>
    );
  }

  const giaTri = ds.map((d) => d.diem);
  const min = Math.min(...giaTri);
  const max = Math.max(...giaTri);
  const bien = max - min || 1;
  const stepX = ds.length === 1 ? 0 : (W - PAD * 2) / (ds.length - 1);
  const pts = ds.map((d, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((d.diem - min) / bien) * (H - PAD * 2);
    return { x, y, ...d };
  });
  const duong = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dau = pts[0];
  const cuoi = pts[pts.length - 1];
  const xuHuong = cuoi.diem === dau.diem ? "đi ngang" : cuoi.diem > dau.diem ? "tăng" : "giảm";

  return (
    <figure
      data-viz="trend-spark-2d"
      className="mx-auto w-full max-w-[720px] overflow-hidden rounded-[20px] border border-line bg-white p-4 sm:p-5"
      aria-label={nhanAria}
    >
      <h3 className="text-base font-bold text-ink sm:text-lg">{tieuDe}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft sm:text-sm">
        {tomTat ?? `Xu hướng ${xuHuong}: từ ${dau.diem} lên ${cuoi.diem} điểm.`}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H + 22}`}
        role="img"
        aria-labelledby="spark-title spark-desc"
        className="mt-3 block h-auto w-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <title id="spark-title">{tieuDe}</title>
        <desc id="spark-desc">{`Biểu đồ xu hướng điểm số theo thời gian, xu hướng ${xuHuong}. ${nhanAria}`}</desc>
        <path d={duong} fill="none" stroke="#1B2A5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <g key={p.nhan}>
            <circle cx={p.x} cy={p.y} r="7" fill="transparent">
              <title>{`${p.nhan}: ${p.diem} điểm`}</title>
            </circle>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#C44296" stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y={H + 16} textAnchor="middle" fontSize="12" fill="#6F6C8A">
              {p.nhan}
            </text>
          </g>
        ))}
      </svg>
      <ul className="sr-only">
        {ds.map((d) => (
          <li key={d.nhan}>{`${d.nhan}: ${d.diem} điểm`}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs tabular-nums text-muted-strong">
        {dau.nhan}: {dau.diem} → {cuoi.nhan}: {cuoi.diem} điểm ({xuHuong})
      </p>
    </figure>
  );
}
