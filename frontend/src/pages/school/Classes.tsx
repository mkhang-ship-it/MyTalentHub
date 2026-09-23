import { useEffect, useState } from "react";
import { School, Trophy } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface ClassInfo {
  name: string;
  grade: number;
  count: number;
  avg_score: number;
  total_hours: number;
  homeroom: string;
  completion_rate: number;
}

interface ClassesResponse {
  grades: number[];
  classes: ClassInfo[];
  top_classes: ClassInfo[];
}

const GRADE_STYLES: Record<number, { badge: string; bar: string; iconBg: string; border: string; text: string }> = {
  10: { badge: "bg-orange-100 text-orange-700", bar: "from-orange-400 to-orange-600", iconBg: "bg-gradient-to-br from-orange-400 to-orange-600", border: "border-b-orange-400", text: "text-orange-700" },
  11: { badge: "bg-violet-100 text-violet-700", bar: "from-violet-500 to-purple-700", iconBg: "bg-gradient-to-br from-violet-500 to-purple-700", border: "border-b-violet-500", text: "text-violet-700" },
  12: { badge: "bg-rose-100 text-rose-700", bar: "from-rose-500 to-pink-600", iconBg: "bg-gradient-to-br from-rose-500 to-pink-600", border: "border-b-rose-500", text: "text-rose-700" },
};

export default function Classes() {
  const [data, setData] = useState<ClassesResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<ClassesResponse>("/school/classes").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div className="relative">
      <PageHeader
        title="Lớp & Khối"
        subtitle="Tổng quan từng khối và các lớp đang theo dõi (slide 27)."
      />

      {/* Grade overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {data.grades.map((grade) => {
          const classes = data.classes.filter((c) => c.grade === grade);
          const students = classes.reduce((s, c) => s + c.count, 0);
          const avg =
            classes.length && students > 0
              ? Math.round((classes.reduce((s, c) => s + c.avg_score * c.count, 0) / students) * 10) / 10
              : 0;
          const style = GRADE_STYLES[grade] ?? { badge: "bg-canvas-soft text-muted", bar: "bg-canvas-soft", iconBg: "bg-canvas-soft", border: "border-b-line-strong", text: "text-muted" };
          return (
            <Card
              key={grade}
              className={`relative overflow-hidden border-b-4 ${style.border} transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(51,50,77,0.08)]`}
            >
              <div className="absolute top-0 right-0 h-24 w-24 -translate-y-1/4 translate-x-1/3 rounded-full opacity-[0.05]" style={{ background: `radial-gradient(circle, ${grade === 10 ? "#FB923C" : grade === 11 ? "#8B5CF6" : "#F43F5E"} 0%, transparent 70%)` }} aria-hidden />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm ${style.badge}`}>
                  Khối {grade}
                </span>
                <span className={`h-10 w-10 rounded-xl ${style.iconBg} text-white flex items-center justify-center shadow-md`} aria-hidden>
                  <School size={20} strokeWidth={2.2} />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center relative z-10">
                <div className="group min-w-0">
                  <div className="text-2xl sm:text-xl font-extrabold text-ink transition-transform duration-200 group-hover:scale-110 truncate">{classes.length}</div>
                  <div className="text-[10px] text-muted font-medium mt-0.5">Lớp</div>
                </div>
                <div className="group min-w-0">
                  <div className="text-2xl sm:text-xl font-extrabold text-ink transition-transform duration-200 group-hover:scale-110 truncate">{students}</div>
                  <div className="text-[10px] text-muted font-medium mt-0.5">Học sinh</div>
                </div>
                <div className="group min-w-0">
                  <div className={`text-2xl sm:text-xl font-extrabold transition-transform duration-200 group-hover:scale-110 ${style.text} truncate`}>{avg}</div>
                  <div className="text-[10px] text-muted font-medium mt-0.5">Điểm TB</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Top 5 classes */}
      <Card className="mb-8 overflow-hidden">
        <div className="flex items-center gap-2.5 mb-5">
          <span className={`h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-white flex items-center justify-center shadow-lg`} aria-hidden>
            <Trophy size={18} strokeWidth={2.5} />
          </span>
          <h2 className="font-extrabold text-ink uppercase text-sm tracking-wide">Top 5 lớp xuất sắc</h2>
          <span className="ml-auto text-[10px] text-muted bg-canvas-soft px-2 py-0.5 rounded-full font-semibold">Sắp xếp theo điểm TB</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table" aria-label="Top 5 lớp xuất sắc">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest bg-canvas-soft text-muted">
                <th scope="col" className="px-4 py-3 rounded-l-lg">#</th>
                <th scope="col" className="px-4 py-3">Lớp</th>
                <th scope="col" className="px-4 py-3">Giáo viên chủ nhiệm</th>
                <th scope="col" className="px-4 py-3 text-right">Điểm trung bình</th>
                <th scope="col" className="px-4 py-3 rounded-r-lg">Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {data.top_classes.map((c, i) => (
                <tr key={c.name} className={`border-b border-line transition-colors duration-200 hover:bg-canvas-soft/40 ${i === 0 ? "bg-amber-50/30" : i === 1 ? "bg-slate-50/30" : i === 2 ? "bg-orange-50/20" : ""}`}>
                  <td className="px-4 py-3.5">
                    <span
                      className={`h-8 w-8 rounded-full inline-flex items-center justify-center text-xs font-extrabold shadow-sm transition-transform duration-200 hover:scale-110 ${
                        i === 0 ? "bg-amber-400 text-white shadow-amber-200" : i === 1 ? "bg-slate-400 text-white shadow-slate-200" : i === 2 ? "bg-orange-400 text-white shadow-orange-200" : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-ink tracking-tight">{c.name}</td>
                  <td className="px-4 py-3.5 text-muted">{c.homeroom || "—"}</td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-pink-600 tabular-nums">{c.avg_score}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-xs font-semibold text-muted tabular-nums w-8 text-right">{c.avg_score}</span>
                      <div className="w-28 h-2 rounded-full bg-rose-100 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                          style={{ width: `${Math.min(100, c.avg_score)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per grade detail */}
      <div className="space-y-10">
        {data.grades.map((grade) => {
          const classes = data.classes.filter((c) => c.grade === grade);
          return (
            <section key={grade} aria-label={`Khối ${grade}`}>
              <div className="flex items-center gap-2.5 mb-5">
                <span className={`h-2 w-2 rounded-full ${grade === 10 ? "bg-orange-400" : grade === 11 ? "bg-violet-500" : "bg-rose-500"} shadow-sm`} aria-hidden />
                <h2 className="text-xl font-extrabold text-ink tracking-tight">
                  Khối {grade}
                </h2>
                <span className="text-sm text-muted font-medium">{classes.reduce((s, c) => s + c.count, 0)} học sinh · {classes.length} lớp</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((c) => (
                  <Card
                    key={c.name}
                    className="group relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(51,50,77,0.1)]"
                  >
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-300 via-pink-400 to-violet-400 opacity-40" aria-hidden />
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-base font-extrabold text-ink tracking-tight">{c.name}</h3>
                        <p className="text-xs text-muted mt-0.5">
                          {c.count} học sinh · GVCN: <span className="font-semibold text-ink">{c.homeroom || "—"}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-pink-600 tabular-nums leading-none block">{c.avg_score}</span>
                        <span className="text-[10px] text-muted font-medium">Điểm TB</span>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Hoàn thành hoạt động</span>
                          <span className="text-[10px] font-extrabold text-ink">{c.completion_rate}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-canvas-soft overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-rose-400 to-amber-300 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:brightness-110"
                            style={{ width: `${Math.min(100, c.completion_rate)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Trải nghiệm</span>
                          <span className="text-[10px] font-extrabold text-ink">{c.total_hours}h</span>
                        </div>
                        <div className="h-2 rounded-full bg-canvas-soft overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-rose-400 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:brightness-110"
                            style={{ width: `${Math.min(100, (c.total_hours / 200) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
