import { useEffect, useState } from "react";
import { Star, Award, User, CalendarDays, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, Empty, PageHeader, Badge } from "../../components/ui";

interface Evaluation {
  id: number;
  activity: string;
  reviewer: string;
  reviewer_role?: "coach" | "teacher";
  criteria: { name: string; score: number; max: number }[];
  total: number;
  xep_loai: string;
  comment: string | null;
  date: string;
}

const CRITERIA_ORDER = ["Chuyên môn", "Sáng tạo", "Làm việc nhóm", "Kỷ luật"];
const CRITERIA_ICONS: Record<string, React.ReactNode> = {
  "Chuyên môn": <Award size={14} className="text-amber-500" />,
  "Sáng tạo": <Star size={14} className="text-violet-500" />,
  "Làm việc nhóm": <User size={14} className="text-emerald-500" />,
  "Kỷ luật": <CalendarDays size={14} className="text-rose-500" />,
};

const XEP_LOAI_TONES: Record<string, "portal" | "emerald" | "amber" | "red" | "violet" | "slate"> = {
  "Xuất sắc": "emerald",
  "Tốt": "portal",
  "Khá": "amber",
  "Đạt": "slate",
};

export default function Evaluations() {
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Evaluation[]>("/student/evaluations")
      .then(setEvals)
      .catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (evals === null) return <Loading />;

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      <PageHeader
        title="Đánh giá năng lực"
        subtitle="Chi tiết điểm tiêu chí rubric 40/20/20/20 từ giáo viên và huấn luyện viên (slide 15)."
        reveal
      />

      <div className="space-y-4">
        {evals.length === 0 ? (
          <Card reveal>
            <Empty text="Chưa có đánh giá nào được công bố." reveal />
          </Card>
        ) : (
          evals.map((ev, idx) => (
            <Card key={ev.id} reveal revealDelay={idx * 0.05} className="overflow-hidden transition-all duration-200 hover:shadow-lift">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl hero-gradient flex items-center justify-center">
                    <Star size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">{ev.activity}</h3>
                    <p className="text-sm text-muted flex items-center gap-1.5 flex-wrap">
                      <span>{ev.reviewer}</span>
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-canvas-soft text-muted font-semibold">
                        {ev.reviewer_role === "coach" ? "Huấn luyện viên" : "Giáo viên"}
                      </span>
                      <span>· {ev.date}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={XEP_LOAI_TONES[ev.xep_loai] || "slate"}>{ev.xep_loai}</Badge>
                  <span className="text-sm font-extrabold text-ink tabular-nums">{ev.total}/100</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4" role="list" aria-label="Tiêu chí đánh giá">
                {CRITERIA_ORDER.map((name) => {
                  const c = ev.criteria.find((cr) => cr.name === name);
                  if (!c) return null;
                  const pct = c.max > 0 ? Math.min(100, Math.round((c.score / c.max) * 100)) : 0;
                  return (
                    <div key={name} className="rounded-xl border border-line bg-canvas-soft/50 p-3" role="listitem">
                      <div className="flex items-center gap-2 mb-2">
                        {CRITERIA_ICONS[name]}
                        <span className="font-medium text-ink">{name}</span>
                        <span className="ml-auto text-sm font-bold text-ink tabular-nums">{c.score}/{c.max}</span>
                      </div>
                      <div className="h-2 rounded-full bg-canvas-soft overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${name}: ${pct}%`}>
                        <div
                          className="h-full rounded-full hero-gradient transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {ev.comment && (
                <div className="rounded-xl bg-white border border-line p-4 flex items-start gap-3">
                  <MessageSquare size={20} className="text-portal/60 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Nhận xét</p>
                    <p className="mt-1 text-sm text-muted italic leading-relaxed">“{ev.comment}”</p>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/student/profile"
          className="inline-flex items-center gap-1.5 text-sm text-portal font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded"
        >
          ← Quay lại hồ sơ
        </Link>
      </div>
    </div>
  );
}