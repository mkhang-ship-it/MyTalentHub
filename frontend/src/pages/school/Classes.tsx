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

const GRADE_STYLES: Record<number, { badge: string; bar: string; icon: string; border: string }> = {
  10: { badge: "bg-orange-100 text-orange-600", bar: "hero-gradient", icon: "bg-gradient-to-br from-orange-400 to-orange-600", border: "border-b-orange-400" },
  11: { badge: "bg-violet-100 text-violet-700", bar: "bg-violet-600", icon: "bg-gradient-to-br from-violet-500 to-purple-700", border: "border-b-violet-500" },
  12: { badge: "bg-pink-100 text-pink-600", bar: "bg-pink-500", icon: "bg-gradient-to-br from-rose-500 to-pink-600", border: "border-b-pink-500" },
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
    <div>
      <PageHeader
        title="Lớp & Khối"
        subtitle="Tổng quan từng khối và các lớp đang theo dõi (slide 27)."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {data.grades.map((grade) => {
          const classes = data.classes.filter((c) => c.grade === grade);
          const students = classes.reduce((s, c) => s + c.count, 0);
          const avg = classes.length
            ? Math.round((classes.reduce((s, c) => s + c.avg_score * c.count, 0) / Math.max(students, 1)) * 10) / 10
            : 0;
          const style = GRADE_STYLES[grade] ?? { badge: "bg-canvas-soft text-muted", bar: "bg-line-strong", icon: "bg-canvas-soft", border: "border-b-line-strong" };
          return (
            <Card key={grade} className={`!border-b-4 ${style.border}`} >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg ${style.badge}`}>
                  Khối {grade}
                </span>
                <span className={`h-9 w-9 rounded-full ${style.icon} text-white flex items-center justify-center`}>
                  <School size={18} />
                </span>
              </div>
              <div className="flex items-end justify-between text-center">
                <div className="flex-1">
                  <div className="text-2xl font-bold text-ink">{classes.length}</div>
                  <div className="text-xs text-muted-light">Lớp</div>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-ink">{students}</div>
                  <div className="text-xs text-muted-light">Học sinh</div>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold text-pink-600">{avg}</div>
                  <div className="text-xs text-muted-light">Điểm TB</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-portal" />
          <h2 className="font-bold text-portal-dark uppercase text-sm tracking-wide">Top 5 lớp xuất sắc</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-light text-xs uppercase tracking-wider bg-canvas-soft">
                <th className="px-4 py-2.5 rounded-l-lg">#</th>
                <th className="px-4 py-2.5">Lớp</th>
                <th className="px-4 py-2.5">Giáo viên chủ nhiệm</th>
                <th className="px-4 py-2.5 text-right rounded-r-lg">Điểm trung bình</th>
              </tr>
            </thead>
            <tbody>
              {data.top_classes.map((c, i) => (
                <tr key={c.name} className="border-b border-line">
                  <td className="px-4 py-3">
                    <span
                      className={`h-6 w-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.homeroom}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <span className="font-bold text-pink-600">{c.avg_score}</span>
                      <div className="w-28 h-1.5 rounded-full bg-pink-100 overflow-hidden">
                        <div className="h-full rounded-full bg-pink-500" style={{ width: `${Math.min(100, c.avg_score)}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.grades.map((grade) => {
        const classes = data.classes.filter((c) => c.grade === grade);
        return (
          <div key={grade} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <School size={18} className="text-portal" />
              <h2 className="text-lg font-semibold text-ink">Khối {grade}</h2>
              <span className="text-sm text-muted-light">{classes.reduce((s, c) => s + c.count, 0)} học sinh</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((c) => (
                <Card key={c.name}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold text-ink">{c.name}</div>
                      <div className="text-sm text-muted mt-1">
                        {c.count} học sinh · GVCN: {c.homeroom}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-portal">{c.avg_score}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-canvas-soft overflow-hidden">
                    <div
                      className="h-full rounded-full hero-gradient"
                      style={{ width: `${c.completion_rate}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-light">
                    <span>Tỷ lệ hoàn thành hoạt động</span>
                    <span>{c.completion_rate}%</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-light">
                    <span>Điểm TB năng lực</span>
                    <span>{c.total_hours}h trải nghiệm</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
