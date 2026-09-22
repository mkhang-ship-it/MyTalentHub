import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Question {
  id: number;
  test_type: string;
  order: number;
  text: string;
  options: string[];
  scoring: { poles: string[]; reverse: boolean };
}

interface ComputeResult {
  test_type: string;
  result: { type: string; score: number; poles: Record<string, number>; holland: string };
  label: string;
  detail: string;
}

const TESTS: { key: string; name: string; desc: string; chip: string; icon: string }[] = [
  { key: "holland", name: "Holland", desc: "Định hướng nghề nghiệp RIASEC", chip: "bg-gradient-to-br from-orange-400 to-orange-600", icon: "🌿" },
  { key: "mbti", name: "MBTI", desc: "16 loại nhân cách", chip: "bg-gradient-to-br from-violet-500 to-purple-700", icon: "🧠" },
  { key: "disc", name: "DISC", desc: "Hành vi & phong cách giao tiếp", chip: "bg-gradient-to-br from-pink-500 to-rose-600", icon: "💬" },
  { key: "mi", name: "Multiple Intelligence", desc: "8 dạng trí thông minh", chip: "bg-gradient-to-br from-amber-400 to-orange-600", icon: "⭐" },
];

const LIKERT = ["Hoàn toàn không đúng", "Không đúng", "Không chắc", "Đúng", "Hoàn toàn đúng"];
const POLE_LABEL: Record<string, string> = {
  "Kỹ thuật": "Kỹ thuật", "Nghệ thuật": "Nghệ thuật", "Xã hội": "Xã hội",
  "Doanh nghiệp": "Doanh nghiệp", "Tự nhiên": "Tự nhiên", "Học thuật": "Học thuật",
  "I": "Nội tâm - Sáng tạo", "C": "Chặt chẽ - Phân tích", "D": "Dũng cảm - Lãnh đạo",
  "S": "Chăm sóc - Hỗ trợ", "E": "Hướng ngoại - Năng động", "N": "Tưởng tượng - Trừu tượng",
  "T": "Logic - Phân tích", "F": "Cảm xúc - Đồng cảm", "J": "Có tổ chức - Kiên định",
  "P": "Linh hoạt - Mở cửa",
};
const POLE_COLOR: Record<string, string> = {
  "Kỹ thuật": "#F97316", "Nghệ thuật": "#EC4899", "Xã hội": "#8B5CF6",
  "Doanh nghiệp": "#06B6D4", "Tự nhiên": "#14B8A6", "Học thuật": "#FBBF24",
  "I": "#8B5CF6", "C": "#3B82F6", "D": "#EF4444", "S": "#10B981",
  "E": "#F59E0B", "N": "#A855F7", "T": "#2563EB", "F": "#EC4899",
  "J": "#D97706", "P": "#6366F1",
};

export default function Discover() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assessments, setAssessments] = useState<{ test_type: string; result: string; date: string }[] | null>(null);

  const loadAssessments = () => {
    get<{ test_type: string; result: string; date: string }[]>("student/assessments")
      .then(setAssessments)
      .catch(() => {});
  };

  useEffect(() => { loadAssessments(); }, []);

  const startTest = async (key: string) => {
    setError(""); setResult(null); setSaved(false);
    try {
      const q = await get<Question[]>(`student/assessments/questions?test_type=${key}`);
      setQuestions(q);
      setActiveTest(key);
      setQIdx(0);
      setAnswers(new Array(q.length).fill(-1));
    } catch (e) { setError(String((e as Error).message || e)); }
  };

  const goNext = () => {
    if (answers[qIdx] === -1 || !questions) return;
    if (qIdx < questions.length - 1) setQIdx(qIdx + 1);
    else submitTest();
  };

  const goPrev = () => {
    if (qIdx > 0) setQIdx(qIdx - 1);
  };

  const submitTest = async () => {
    setBusy(true);
    try {
      const payload = { test_type: activeTest, answers };
      const ans = answers.map((a) => (a === -1 ? 0 : a));
      const res = await post<ComputeResult>("student/assessments/compute", {
        test_type: activeTest, answers: ans,
      });
      setResult(res);
      // Lưu kết quả
      await post("student/assessments", {
        test_type: activeTest,
        result: JSON.stringify(res.result),
      });
      setSaved(true);
      loadAssessments();
    } catch (e) { setError(String((e as Error).message || e)); }
    finally { setBusy(false); }
  };

  if (error) return <ErrorBox message={error} />;

  // ── View: chọn test
  if (!questions || (questions && activeTest === null)) {
    return (
      <div>
        <PageHeader title="Khám phá năng khiếu" subtitle="Bộ test khoa học giúp bạn hiểu chính mình hơn (slide 12)." />
        <section aria-labelledby="tests-heading">
          <h2 id="tests-heading" className="sr-only">Chọn bài test năng khiếu</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" role="list">
            {TESTS.map((t) => {
              const done = assessments?.some((a) => a.test_type === t.key);
              return (
                <article key={t.key} className="text-center" role="listitem">
                  <Card className="h-full">
                    <div className={`mx-auto h-14 w-14 rounded-2xl ${t.chip} text-white flex items-center justify-center text-2xl shadow`} aria-hidden="true">{t.icon}</div>
                    <h3 className="mt-2 font-bold text-ink">{t.name}</h3>
                    <div className="text-xs text-muted mt-1">{t.desc}</div>
                    {done && <span className="mt-2 inline-block text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium" aria-label={`${t.name} đã hoàn thành`}>✓ Đã làm</span>}
                    <button onClick={() => startTest(t.key)} className="mt-3 w-full text-xs px-3 py-2 rounded-full cta-gradient text-white font-semibold" aria-label={done ? `Làm lại bài test ${t.name}` : `Bắt đầu bài test ${t.name}`}>
                      {done ? "Làm lại" : "Bắt đầu"}
                    </button>
                  </Card>
                </article>
              );
            })}
          </div>
          {assessments && assessments.length > 0 && (
            <Card>
              <h2 className="font-bold text-ink mb-2 flex items-center gap-2">
                <GraduationCap size={18} className="text-portal" aria-hidden="true" /> Kết quả đã có
              </h2>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Kết quả test đã hoàn thành">
                {assessments.map((a, i) => {
                  const r = JSON.parse(a.result);
                  const t = TESTS.find((x) => x.key === a.test_type);
                  return (
                    <span key={i} role="listitem" className="text-xs px-3 py-1.5 rounded-full bg-portal-soft text-portal-dark font-medium">
                      {t?.name ?? a.test_type}: {r.holland ?? r.type} — {r.score}/100
                    </span>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      </div>
    );
  }

  // ── View: làm bài
  const q = questions[qIdx];
  const answered = answers.filter((a) => a !== -1).length;
  const progress = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title={`Test ${TESTS.find((t) => t.key === activeTest)?.name}`}
        subtitle={`Câu ${qIdx + 1}/${questions.length} — chọn mức phù hợp nhất (slide 12).`}
      />
      {/* Progress bar */}
      <div className="mb-6" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ làm bài test">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>{qIdx + 1}/{questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-canvas-soft overflow-hidden">
          <div className="h-full rounded-full hero-gradient" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Câu hỏi */}
      <Card className="mb-6">
        <div className="text-xs text-muted uppercase tracking-wider mb-2">Câu {qIdx + 1}</div>
        <h2 className="text-lg font-bold text-ink mb-5">{q.text}</h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Chọn một đáp án</legend>
          <div role="radiogroup" aria-label={q.text}>
            {q.options.map((opt, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={answers[qIdx] === i}
                onClick={() => {
                  const a = [...answers]; a[qIdx] = i; setAnswers(a);
                }}
                className={`w-full text-left rounded-xl px-4 py-3 text-sm border transition ${
                  answers[qIdx] === i ? "cta-gradient text-white border-transparent shadow" : "border-line bg-white hover:bg-canvas-soft text-ink"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      {/* Nút điều hướng */}
      <div className="flex justify-between" role="group" aria-label="Điều hướng bài test">
        <button onClick={goPrev} disabled={qIdx === 0} className="text-sm px-4 py-2 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft disabled:opacity-40" aria-label="Câu trước">
          ← Quay lại
        </button>
        {qIdx < questions.length - 1 ? (
          <button onClick={goNext} disabled={answers[qIdx] === -1} className="text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold disabled:opacity-40" aria-label="Câu tiếp theo">
            Tiếp theo →
          </button>
        ) : (
          <button onClick={goNext} disabled={answers[qIdx] === -1 || busy} className="text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold disabled:opacity-40" aria-label={busy ? "Đang tính kết quả" : "Xem kết quả"}>
            {busy ? "Đang tính..." : "Xem kết quả ✓"}
          </button>
        )}
      </div>

      {/* Kết quả */}
      {result && (
        <Card className="mt-6 hero-gradient text-white">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-white/75">Kết quả</div>
            <h2 className="text-2xl font-extrabold mt-1">{result.label}</h2>
            <div className="mt-2 text-sm text-white/85">{result.detail}</div>
            {saved && <span className="mt-3 inline-block text-xs px-3 py-1 rounded-full bg-white/20 text-white">✓ Đã lưu</span>}
          </div>
          {/* Radar poles */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(result.result.poles).map(([pole, pts]) => (
              <div key={pole} className="bg-white/15 rounded-lg p-2">
                <div className="flex justify-between text-xs">
                  <span>{POLE_LABEL[pole] ?? pole}</span>
                  <span className="font-bold">{pts}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, pts)}%`, backgroundColor: POLE_COLOR[pole] ?? "#fff" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
