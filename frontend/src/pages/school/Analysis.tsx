import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface Analysis {
  skill_map: { name: string; code: string; avg_score: number }[];
  grade_ranking: { grade: number; avg_score: number; count: number; hours: number }[];
  top_students: {
    id: number;
    full_name: string;
    class_name: string;
    grade: number;
    talent_score: number;
    hours: number;
  }[];
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 100;

function polar(i: number, n: number, r: number): [number, number] {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

export default function Analysis() {
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    get<Analysis>("/school/analysis").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const n = Math.max(data.skill_map.length, 3);
  const rings = [0.25, 0.5, 0.75, 1];
  const valuePts = data.skill_map
    .map((s, i) => polar(i, n, (Math.min(100, s.avg_score) / 100) * RADIUS).join(","))
    .join(" ");

  // Accessibility description for radar chart
  const radarAriaLabel = `Bản đồ radar năng khiếu toàn trường: ${data.skill_map.map(s => `${s.name} ${s.avg_score} điểm`).join(", ")}`;

  return (
    <div>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${
              t.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle size={18} className="shrink-0" />
            ) : (
              <AlertCircle size={18} className="shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <PageHeader
        title="Phân tích năng lực học sinh"
        subtitle="So sánh năng khiếu theo khối, lớp và các nhóm ngành (slide 25)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">Bản đồ năng khiếu toàn trường</h2>
          </div>
          <div className="sr-only" aria-live="polite" id="radar-chart-desc">{radarAriaLabel}</div>
          <svg 
            viewBox={`0 0 ${SIZE} ${SIZE}`} 
            className="w-full max-w-[340px] mx-auto" 
            role="img" 
            aria-label={radarAriaLabel}
            aria-describedby="radar-chart-desc"
            tabIndex={0}
          >
            <title>Bản đồ radar năng khiếu toàn trường</title>
            <desc>{radarAriaLabel}</desc>
            {rings.map((r) => (
              <polygon
                key={r}
                points={data.skill_map.map((_, i) => polar(i, n, RADIUS * r).join(",")).join(" ")}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            ))}
            {data.skill_map.map((s, i) => {
              const [x, y] = polar(i, n, RADIUS);
              let [lx, ly] = polar(i, n, RADIUS + 32);
              const align = lx < CENTER - 20 ? "end" : lx > CENTER + 20 ? "start" : "middle";
              lx = Math.max(56, Math.min(SIZE - 56, lx));
              ly = Math.max(14, Math.min(SIZE - 14, ly));
              return (
                <g key={s.code}>
                  <line x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <circle cx={x} cy={y} r="2.5" fill="#ec4899" />
                  <text x={lx} y={ly - 2} textAnchor={align} fontSize="10" fill="#64748b">{s.name}</text>
                  <text x={lx} y={ly + 11} textAnchor={align} fontSize="12" fontWeight="bold" fill="#db2777">{s.avg_score}</text>
                </g>
              );
            })}
            <polygon points={valuePts} fill="rgba(236, 72, 153, 0.25)" stroke="#ec4899" strokeWidth="2" />
          </svg>
          <p className="text-xs text-muted-light text-center mt-1">Điểm trung bình thang 100 từ dữ liệu kỹ năng học sinh.</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink mb-4">Bảng xếp hạng khối</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line bg-canvas-soft">
                  <th scope="col" className="px-4 py-2.5 rounded-l-lg">#</th>
                  <th scope="col" className="px-4 py-2.5">Khối</th>
                  <th scope="col" className="px-4 py-2.5">Hoạt động & HS</th>
                  <th scope="col" className="px-4 py-2.5 text-right rounded-r-lg">Điểm TB</th>
                </tr>
              </thead>
              <tbody>
                {data.grade_ranking.map((g, i) => (
                  <tr key={g.grade} className="border-b border-line">
                    <td className="px-4 py-3">
                      <span
                        className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-pink-500 text-white" : i === 1 ? "bg-orange-400 text-white" : "bg-violet-500 text-white"
                        }`}
                        aria-label={`Hạng ${i + 1}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">Khối {g.grade}</td>
                    <td className="px-4 py-3 text-muted">{g.hours}h hoạt động · {g.count} học sinh</td>
                    <td className="px-4 py-3 text-right">
                      <div className={`font-bold ${i === 0 ? "text-pink-600" : i === 1 ? "text-orange-500" : "text-violet-600"}`}>
                        {g.avg_score}
                      </div>
                      <div className="text-[11px] text-muted-light">điểm</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right">
            <Link to="/school/classes" className="text-sm text-portal hover:underline">
              Xem chi tiết bảng xếp hạng →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-portal-dark" />
          <h2 className="font-semibold text-ink">Top học sinh nổi bật</h2>
          <span className="text-xs text-muted-light ml-auto">Bấm để xem Talent Passport</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line bg-canvas-soft">
                <th scope="col" className="px-4 py-2.5 rounded-l-lg">#</th>
                <th scope="col" className="px-4 py-2.5">Học sinh</th>
                <th scope="col" className="px-4 py-2.5">Lớp</th>
                <th scope="col" className="px-4 py-2.5 text-center">Điểm năng lực</th>
                <th scope="col" className="px-4 py-2.5 text-center">Giờ trải nghiệm</th>
                <th scope="col" className="px-4 py-2.5 text-right rounded-r-lg"></th>
              </tr>
            </thead>
            <tbody>
              {data.top_students.map((s, i) => (
                <tr key={s.id} className="border-b border-line">
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-muted-light w-4" aria-label={`Hạng ${i + 1}`}>{i + 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-portal to-portal-dark text-white flex items-center justify-center text-xs font-bold" aria-hidden="true">
                        {s.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-ink">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{s.class_name} · Khối {s.grade}</td>
                  <td className="px-4 py-3 text-center font-bold text-portal-dark">{s.talent_score}</td>
                  <td className="px-4 py-3 text-center">{s.hours}h</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/passport/${s.id}`} className="text-xs text-portal hover:underline">
                      Xem passport →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
