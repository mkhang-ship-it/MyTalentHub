import { useEffect, useState } from "react";
import { Check, GraduationCap, Loader2 } from "lucide-react";
import { get, post } from "../../api/client";
import { Badge } from "../../components/ui";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";
import { DiscoverScene } from "../../components/three/DiscoverScene";

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

/** Dịch lỗi API sang tiếng Việt theo ngữ cảnh mở bài / nộp bài (đặc tả 01 B9). */
function loiTiengViet(e: unknown, nhom: "mo" | "nop"): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("→ 401"))
    return nhom === "mo"
      ? "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để làm bài test."
      : "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại rồi nộp lại bài.";
  if (msg.includes("→ 403")) return "Bạn cần đăng nhập bằng tài khoản học sinh để làm bài test.";
  if (nhom === "mo" && (msg.includes("Failed to fetch") || msg.includes("Network") || msg.includes("timeout")))
    return "Không tải được câu hỏi, bạn thử lại sau nhé.";
  return `Có lỗi xảy ra: ${msg}`;
}

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
  // Lỗi tải lịch sử làm bài (riêng với lỗi mở/nộp bài — trang vẫn dùng được, đặc tả 01 B2).
  const [loiLichSu, setLoiLichSu] = useState(false);
  // Bài đang mở (để nút hiện "Đang mở bài…") và khóa bài mở lỗi để thử lại (đặc tả 01 B9).
  const [dangMo, setDangMo] = useState<string | null>(null);
  const [khoaLoi, setKhoaLoi] = useState<string | null>(null);

  const loadAssessments = () => {
    get<{ test_type: string; result: string; date: string }[]>("/student/assessments")
      .then((danhSach) => {
        setAssessments(danhSach);
        setLoiLichSu(false);
      })
      .catch(() => {
        setAssessments([]);
        setLoiLichSu(true);
      });
  };

  useEffect(() => { loadAssessments(); }, []);

  const startTest = async (key: string) => {
    setError(""); setResult(null); setSaved(false); setKhoaLoi(null);
    setDangMo(key);
    try {
      const q = await get<Question[]>(`/student/assessments/questions?test_type=${key}`);
      setQuestions(q);
      setActiveTest(key);
      setQIdx(0);
      setAnswers(new Array(q.length).fill(-1));
    } catch (e) {
      setError(loiTiengViet(e, "mo"));
      setKhoaLoi(key);
    } finally {
      setDangMo(null);
    }
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
    setError("");
    try {
      const ans = answers.map((a) => (a === -1 ? 0 : a));
      const res = await post<ComputeResult>("/student/assessments/compute", {
        test_type: activeTest, answers: ans,
      });
      setResult(res);
      // Lưu kết quả
      await post("/student/assessments", {
        test_type: activeTest,
        result: JSON.stringify(res.result),
      });
      setSaved(true);
      loadAssessments();
    } catch (e) {
      setError(loiTiengViet(e, "nop"));
    } finally {
      setBusy(false);
    }
  };

  // Khung chip kết quả 4 trạng thái (đặc tả 01 B2): tải / rỗng / có / lỗi tải.
  const chipKetQua = () => {
    if (assessments === null)
      return <Badge tone="muted">Đang tải…</Badge>;
    if (loiLichSu)
      return (
        <Badge tone="warn">
          <span aria-hidden="true">⚠</span> Chưa tải được kết quả
        </Badge>
      );
    if (assessments.length > 0) return <Badge tone="portal">{assessments.length} bài đã làm</Badge>;
    return <Badge tone="portal">Chưa có kết quả</Badge>;
  };

  // ── Nhánh A: chọn test ──
  if (!questions || (questions && activeTest === null)) {
    return (
      <div>
        <PageHeader title="Khám phá năng khiếu" subtitle="Bộ test khoa học giúp bạn hiểu chính mình hơn." />
        {/* Bản đồ kết quả 3D từ endpoint /student/assessments có sẵn */}
        <Card className="mb-8 overflow-hidden">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">Bản đồ kết quả 3D</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-strong">Mỗi cột là một bài test bạn đã làm, cao dần theo điểm số.</p>
            </div>
            {chipKetQua()}
          </div>
          <DiscoverScene assessments={assessments} className="w-full" />
        </Card>
        <section aria-labelledby="tests-heading">
          <h2 id="tests-heading" className="sr-only">Chọn bài test năng khiếu</h2>
          {error && (
            <div className="mb-4">
              <ErrorBox message={error} />
              <button
                type="button"
                onClick={() => khoaLoi && startTest(khoaLoi)}
                disabled={dangMo !== null}
                className="btn-secondary mt-3 h-11 px-5 disabled:opacity-55"
              >
                Thử lại
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-stretch stagger-children mb-6" role="list">
            {TESTS.map((t, idx) => {
              const done = assessments?.some((a) => a.test_type === t.key);
              const dangMoTheNay = dangMo === t.key;
              return (
                <article key={t.key} className="text-center reveal-up h-full" role="listitem" style={{ animationDelay: `${0.06 * (idx + 1)}s` }}>
                  <Card interactive reveal revealDelay={0.05} className="flex h-full flex-col text-center">
                    <div className={`mx-auto h-14 w-14 rounded-2xl ${t.chip} text-white flex items-center justify-center text-2xl shadow`} aria-hidden="true">{t.icon}</div>
                    <h3 className="mt-2 text-base font-bold text-ink">{t.name}</h3>
                    {/* Mô tả 12px chiếm chỗ linh hoạt để mọi card cao bằng nhau */}
                    <div className="text-xs text-muted-strong mt-1 min-h-[2rem] flex-1">{t.desc}</div>
                    {/* Ô badge cao 24 giữ chỗ để nút thẳng hàng (bất biến, không xóa) */}
                    <div className="mt-2 flex h-6 items-center justify-center">
                      {done ? (
                        <Badge tone="success">
                          <Check size={12} aria-hidden="true" /> Đã làm
                        </Badge>
                      ) : (
                        <span className="invisible inline-flex h-6 items-center px-2.5 text-xs" aria-hidden="true">Đã làm</span>
                      )}
                    </div>
                    {/* Nút cao 44 bo 12, disabled khi đang mở bài khác */}
                    <div className="mt-auto pt-3">
                      <button
                        onClick={() => startTest(t.key)}
                        disabled={dangMo !== null || busy}
                        aria-busy={dangMoTheNay}
                        className="btn-primary w-full disabled:opacity-55"
                        aria-label={done ? `Làm lại bài test ${t.name}` : `Bắt đầu bài test ${t.name}`}
                      >
                        {dangMoTheNay ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            Đang mở bài…
                          </span>
                        ) : done ? "Làm lại" : "Bắt đầu"}
                      </button>
                    </div>
                  </Card>
                </article>
              );
            })}
          </div>
          {assessments && assessments.length > 0 && (
            <Card>
              <h3 className="text-base font-bold text-ink mb-3 flex items-center gap-2">
                <GraduationCap size={18} className="text-portal" aria-hidden="true" /> Kết quả đã có
              </h3>
              <div className="flex flex-wrap gap-2" role="list" aria-label="Kết quả test đã hoàn thành">
                {assessments.map((a, i) => {
                  const r = JSON.parse(a.result);
                  const t = TESTS.find((x) => x.key === a.test_type);
                  return (
                    <Badge key={i} tone="portal">
                      <span role="listitem">
                        {t?.name ?? a.test_type}: {r.holland ?? r.type} — {r.score}/100
                      </span>
                    </Badge>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      </div>
    );
  }

  // ── Nhánh rỗng: bài không có câu hỏi (chặn crash q.text, đặc tả 01 B9) ──
  if (questions.length === 0) {
    return (
      <div>
        <PageHeader
          title={`Test ${TESTS.find((t) => t.key === activeTest)?.name}`}
          subtitle="Bộ test khoa học giúp bạn hiểu chính mình hơn."
        />
        <Empty
          text="Bài test này chưa có câu hỏi, bạn quay lại sau nhé."
          action={
            <button
              type="button"
              onClick={() => { setQuestions(null); setActiveTest(null); }}
              className="btn-secondary h-11 px-5"
            >
              Quay lại danh sách test
            </button>
          }
        />
      </div>
    );
  }

  // ── Nhánh B: làm bài ──
  const q = questions[qIdx];
  const answered = answers.filter((a) => a !== -1).length;
  const progress = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  const cauCuoi = qIdx === questions.length - 1;

  return (
    <div>
      <PageHeader
        title={`Test ${TESTS.find((t) => t.key === activeTest)?.name}`}
        subtitle={`Câu ${qIdx + 1}/${questions.length} — chọn mức phù hợp nhất.`}
      />
      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
          <button
            type="button"
            onClick={submitTest}
            disabled={busy}
            className="btn-secondary mt-3 h-11 px-5 disabled:opacity-55"
          >
            Thử lại
          </button>
        </div>
      )}
      {/* Thanh tiến độ: nhãn 12/600, track --line cao 8 (đặc tả 01 B5) */}
      <div className="mb-6" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ làm bài test">
        <div className="flex justify-between text-xs font-semibold text-muted-strong mb-2">
          <span>{qIdx + 1}/{questions.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-line overflow-hidden">
          <div className="h-full rounded-full hero-gradient transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Câu hỏi: eyebrow 12/700, H3 18/700, đáp án min-h 48 viền control (đặc tả 01 B6) */}
      <Card className="mb-6">
        <div className="text-xs font-bold uppercase tracking-[0.1em] text-muted-strong mb-2">Câu {qIdx + 1}</div>
        <h3 className="text-lg font-bold text-ink mb-5">{q.text}</h3>
        <fieldset className="space-y-2">
          <legend className="sr-only">Chọn một đáp án</legend>
          <div role="radiogroup" aria-label={q.text} className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              const dangChon = answers[qIdx] === i;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={dangChon}
                  disabled={busy}
                  onClick={() => {
                    const a = [...answers]; a[qIdx] = i; setAnswers(a);
                  }}
                  className={`flex w-full min-h-[48px] items-center gap-3 rounded-[12px] px-4 py-3 text-left text-sm transition-responsive disabled:opacity-55 ${
                    dangChon
                      ? "border border-transparent text-white shadow hover:shadow-lg"
                      : "border border-line-control bg-white hover:bg-canvas-soft text-ink hover:border-portal"
                  }`}
                  style={dangChon ? { backgroundImage: "linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)" } : undefined}
                >
                  <span className="min-w-0 flex-1">{opt}</span>
                  {dangChon && <Check size={16} className="shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>
      </Card>

      {/* Nút điều hướng: h44, mobile chia đều (đặc tả 01 B7) */}
      <div className="flex justify-between gap-3" role="group" aria-label="Điều hướng bài test">
        <button
          onClick={goPrev}
          disabled={qIdx === 0 || busy}
          className="btn-secondary h-11 flex-1 px-5 sm:flex-none disabled:opacity-55"
          aria-label="Câu trước"
        >
          ← Quay lại
        </button>
        {!cauCuoi ? (
          <button
            onClick={goNext}
            disabled={answers[qIdx] === -1 || busy}
            className="btn-primary h-11 flex-1 px-5 sm:flex-none disabled:opacity-55"
            aria-label="Câu tiếp theo"
          >
            Tiếp theo →
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={answers[qIdx] === -1 || busy}
            className="btn-primary h-11 flex-1 px-5 sm:flex-none disabled:opacity-55"
            aria-label={busy ? "Đang tính kết quả" : "Xem kết quả"}
            aria-busy={busy}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Đang tính…
              </span>
            ) : "Xem kết quả ✓"}
          </button>
        )}
      </div>
      {cauCuoi && answers[qIdx] === -1 && !busy && (
        <p className="mt-2 text-xs text-muted-strong">Chọn một đáp án để tiếp tục.</p>
      )}

      {/* Card kết quả: scrim + chữ trắng toàn phần (đặc tả 01 B8) */}
      {result && (
        <Card interactive reveal revealDelay={0.1} className="mt-6 p-6 md:p-8 text-center text-white transition-responsive bg-[linear-gradient(105deg,rgba(27,42,94,.62)_0%,rgba(27,42,94,.40)_55%,rgba(27,42,94,.18)_100%),var(--hero-gradient)]">
          {/* Lớp scrim phủ lên nền card để chữ nhỏ đạt tương phản */}
          <div className="scrim-navy pointer-events-none absolute inset-0 rounded-[inherit]" aria-hidden="true" />
          <div className="relative">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-white">Kết quả</div>
            <h2 className="text-[26px] md:text-[32px] font-extrabold leading-[1.2] mt-1">{result.label}</h2>
            <div className="mt-2 text-[15px] leading-relaxed text-white max-w-[640px] mx-auto">{result.detail}</div>
            {saved && (
              <span className="mt-4 inline-flex h-6 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-portal-dark">✓ Đã lưu</span>
            )}
          </div>
          {/* Lưới cực: 2 cột mobile, 3 cột desktop, ô nền navy-50 */}
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            {Object.entries(result.result.poles).map(([pole, pts]) => (
              <div key={pole} className="rounded-[12px] border border-[rgba(255,255,255,.22)] bg-[rgba(27,42,94,.50)] p-3">
                <div className="flex justify-between gap-2 text-xs font-semibold text-white">
                  <span className="min-w-0 truncate">{POLE_LABEL[pole] ?? pole}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-white">{pts}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[rgba(255,255,255,.25)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, pts)}%`,
                      backgroundColor: POLE_COLOR[pole] ?? "#fff",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,.55)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
