import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, Search, ChevronLeft, ChevronRight, Mail, CheckCircle2 } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Talent {
  id: number;
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  technical_score: number;
  experience_hours: number;
  interests: string | null;
  top_skills: string[];
  avatar_url: string | null;
}

interface TalentsResponse {
  items: Talent[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "ky_thuat", label: "Kỹ thuật" },
  { value: "nghe_thuat", label: "Nghệ thuật" },
  { value: "kinh_doanh", label: "Kinh doanh" },
  { value: "the_thao", label: "Thể thao" },
  { value: "hoc_thuat", label: "Học thuật" },
  { value: "sang_tao", label: "Sáng tạo" },
];

const GRADE_OPTIONS = [10, 11, 12];

export default function Talents() {
  const [data, setData] = useState<TalentsResponse | null>(null);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [grade, setGrade] = useState("");
  const [field, setField] = useState("");
  const [minScore, setMinScore] = useState("");
  const [minTechnicalScore, setMinTechnicalScore] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [error, setError] = useState("");
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classFilter) params.set("class_name", classFilter);
    if (grade) params.set("grade", grade);
    if (field) params.set("field", field);
    if (minScore) params.set("min_score", minScore);
    if (minTechnicalScore) params.set("min_technical_score", minTechnicalScore);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    get<TalentsResponse>(`/enterprise/talents?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(String((e as Error).message || e)));
  }, [q, classFilter, grade, field, minScore, minTechnicalScore, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleInvite = async (studentId: number) => {
    setInvitingId(studentId);
    try {
      await post("/enterprise/invite", { student_id: studentId, message: "" });
      setInviteSuccess(studentId);
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setInvitingId(null);
    }
  };

  const getPageNumbers = () => {
    if (!data) return [];
    const totalPages = data.total_pages;
    const currentPage = data.page;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Tìm kiếm nhân tài"
        subtitle="Tra cứu hồ sơ học sinh theo tên, lớp, khối, lĩnh vực, điểm năng lực — để tuyển thực tập hoặc tài trợ tài năng (slide 29)."
      />

      <Card className="mb-5">
        <div className="flex items-center gap-2 text-xs text-muted-light mb-3 uppercase tracking-wider">
          <Filter size={13} aria-hidden="true" /> <span>Bộ lọc</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-line px-3">
            <label htmlFor="search-input" className="sr-only">Tìm kiếm theo tên hoặc sở thích</label>
            <Search size={15} className="text-muted-light" aria-hidden="true" />
            <input
              id="search-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên / sở thích..."
              className="py-2 text-sm outline-none w-full"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="class-filter" className="sr-only">Lọc theo lớp</label>
            <input
              id="class-filter"
              type="text"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              placeholder="Lớp (VD: 11B1)"
              className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="grade-filter" className="sr-only">Lọc theo khối</label>
            <select
              id="grade-filter"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="px-3 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal w-full"
            >
              <option value="">Tất cả khối</option>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  Khối {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="field-filter" className="sr-only">Lọc theo lĩnh vực</label>
            <select
              id="field-filter"
              value={field}
              onChange={(e) => setField(e.target.value)}
              className="px-3 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal w-full"
            >
              <option value="">Tất cả lĩnh vực</option>
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="min-score-filter" className="sr-only">Lọc theo điểm năng lực tối thiểu</label>
            <select
              id="min-score-filter"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="px-3 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal w-full"
            >
              <option value="">Điểm năng lực ≥ bất kỳ</option>
              <option value="60">≥ 60</option>
              <option value="70">≥ 70</option>
              <option value="80">≥ 80</option>
            </select>
          </div>
          <div>
            <label htmlFor="min-tech-filter" className="sr-only">Lọc theo điểm kỹ thuật tối thiểu</label>
            <select
              id="min-tech-filter"
              value={minTechnicalScore}
              onChange={(e) => setMinTechnicalScore(e.target.value)}
              className="px-3 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal w-full"
            >
              <option value="">Điểm kỹ thuật ≥ bất kỳ</option>
              <option value="5">≥ 5</option>
              <option value="6">≥ 6</option>
              <option value="7">≥ 7</option>
              <option value="8">≥ 8</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted" aria-live="polite">
          {data.total} hồ sơ phù hợp · Trang {data.page} / {data.total_pages}
        </p>
        <div>
          <label htmlFor="page-size" className="sr-only">Số mục mỗi trang</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-line text-sm bg-white outline-none focus:border-portal"
          >
            <option value={10}>10/trang</option>
            <option value={20}>20/trang</option>
            <option value={50}>50/trang</option>
            <option value={100}>100/trang</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums" role="grid">
          <thead>
            <tr className="text-left text-xs text-muted-light uppercase tracking-wider border-b border-line">
              <th className="pb-2 pr-4" scope="col">Họ tên</th>
              <th className="pb-2 pr-4" scope="col">Lớp</th>
              <th className="pb-2 pr-4" scope="col">Khối</th>
              <th className="pb-2 pr-4" scope="col">Năng lực</th>
              <th className="pb-2 pr-4" scope="col">Kỹ thuật</th>
              <th className="pb-2 pr-4" scope="col">Kỹ năng nổi bật</th>
              <th className="pb-2 pr-4" scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted" role="status">
                  Không tìm thấy hồ sơ phù hợp với bộ lọc.
                </td>
              </tr>
            )}
            {data.items.map((t) => (
              <tr key={t.id} className="border-b border-line/50 hover:bg-canvas-soft/50 transition-colors duration-150">
                <td className="py-3 pr-4 font-medium text-ink">{t.full_name}</td>
                <td className="py-3 pr-4 text-muted">{t.class_name}</td>
                <td className="py-3 pr-4 text-muted">Khối {t.grade}</td>
                <td className="py-3 pr-4 font-semibold text-portal" aria-label={`Điểm năng lực ${t.talent_score}`}>{t.talent_score}</td>
                <td className="py-3 pr-4 font-semibold text-amber-600" aria-label={`Điểm kỹ thuật ${t.technical_score}`}>{t.technical_score}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1" aria-label={`Kỹ năng: ${t.top_skills.slice(0, 3).join(", ")}`}>
                    {t.top_skills.slice(0, 3).map((skill, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-portal-soft text-portal-dark font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    <Link
                      to={`/passport/${t.id}`}
                      className="text-xs px-3 py-1.5 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                    >
                      Xem hồ sơ
                    </Link>
                    {inviteSuccess === t.id ? (
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold" aria-live="polite">
                        <CheckCircle2 size={12} aria-hidden="true" /> Đã mời
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInvite(t.id)}
                        disabled={invitingId === t.id}
                        className="text-xs px-3 py-1.5 rounded-full cta-gradient text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-150"
                        aria-busy={invitingId === t.id}
                        aria-label={invitingId === t.id ? "Đang gửi lời mời..." : `Mời ${t.full_name} phỏng vấn`}
                      >
                        {invitingId === t.id ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                            Đang gửi...
                          </>
                        ) : "Mời phỏng vấn"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total_pages > 1 && (
        <nav aria-label="Phân trang kết quả tìm kiếm" className="mt-6">
          <div className="flex items-center justify-center gap-1" role="navigation" aria-live="polite">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page === 1}
              className="p-2 rounded-lg border border-line text-muted-light hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              aria-label="Trang trước"
              aria-disabled={data.page === 1}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-3 py-1.5 text-muted-light" aria-hidden="true">…</span>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(p as number)}
                  className={`w-9 h-9 rounded-lg font-medium transition ${
                    data.page === p
                      ? "bg-portal text-white"
                      : "border border-line hover:bg-canvas-soft"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2`}
                  aria-label={`Trang ${p}`}
                  aria-current={data.page === p ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              disabled={data.page === data.total_pages}
              className="p-2 rounded-lg border border-line text-muted-light hover:bg-canvas-soft disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              aria-label="Trang sau"
              aria-disabled={data.page === data.total_pages}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}