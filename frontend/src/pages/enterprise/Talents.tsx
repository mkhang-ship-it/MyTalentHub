import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { get, post } from "../../api/client";
import DataNetwork, { type DataNode, type DataLink } from "../../components/three/DataNetwork";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";

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
  // Lỗi mời của từng dòng (tách khỏi lỗi trang — bấm mời lỗi không mất trang).
  const [loiMoiId, setLoiMoiId] = useState<number | null>(null);

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
    setError("");
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
    setLoiMoiId(null);
    try {
      await post("/enterprise/invite", { student_id: studentId, message: "" });
      setInviteSuccess(studentId);
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch {
      // Lỗi mời chỉ hiện trong dòng, không đụng lỗi trang.
      setLoiMoiId(studentId);
    } finally {
      setInvitingId(null);
    }
  };

  // Xóa cả 6 điều kiện lọc rồi về trang 1.
  const xoaBoLoc = () => {
    setQ("");
    setClassFilter("");
    setGrade("");
    setField("");
    setMinScore("");
    setMinTechnicalScore("");
    setPage(1);
  };
  const coBoLoc = q !== "" || classFilter !== "" || grade !== "" || field !== "" || minScore !== "" || minTechnicalScore !== "";

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

  // 5 nhân tài điểm cao nhất trong kết quả + kỹ năng THẬT của từng người (không nối đồ thị đầy đủ).
  const items = data?.items ?? [];
  const top5 = [...items].sort((a, b) => b.talent_score - a.talent_score).slice(0, 5);
  const demKyNangPhoBien = new Map<string, number>();
  for (const t of items) {
    for (const skill of t.top_skills.slice(0, 3)) {
      demKyNangPhoBien.set(skill, (demKyNangPhoBien.get(skill) ?? 0) + 1);
    }
  }
  const kyNangPhoBienNhat = [...demKyNangPhoBien.entries()].sort((a, b) => b[1] - a[1])[0];
  const diemTrungBinh = items.length > 0
    ? items.reduce((tong, t) => tong + t.talent_score, 0) / items.length
    : 0;
  const tomTatNhanTai = items.length > 0
    ? `Trong ${items.length} hồ sơ đang hiện (tổng ${data?.total} hồ sơ phù hợp): ` +
      `điểm năng lực trung bình ${diemTrungBinh.toFixed(1)}` +
      `${kyNangPhoBienNhat ? `; kỹ năng phổ biến nhất: ${kyNangPhoBienNhat[0]} (${kyNangPhoBienNhat[1]} người)` : ""}. ` +
      `Biểu đồ dưới hiện 5 nhân tài điểm cao nhất và kỹ năng thật của từng người — ` +
      `đường nối nghĩa là "người này thực sự có kỹ năng đó".`
    : "Chưa có hồ sơ nào để tóm tắt.";
  const kyNangTop5 = [...new Set(top5.flatMap((t) => t.top_skills.slice(0, 3)))];

  // Nút mời dùng chung 2 cỡ: 36 ở bảng ≥768, 44 ở thẻ <768 (đặc tả 02 B4-10/11).
  const nutMoiLop = "text-white font-semibold disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-150";
  const nenNutMoi = { backgroundImage: "linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.12)), var(--cta-gradient)" } as const;

  // Ô thao tác của một hồ sơ (dùng chung cho hàng bảng và thẻ mobile).
  const oThaoTac = (t: Talent, trenMobile: boolean) => (
    <div className={`flex ${trenMobile ? "flex-row" : "flex-col sm:flex-row"} gap-2`}>
      <Link
        to={`/passport/${t.id}`}
        className={`inline-flex items-center justify-center font-semibold text-ink border border-line-control hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors ${
          trenMobile ? "h-11 flex-1 rounded-[12px] px-4 text-sm" : "h-9 rounded-[10px] px-3 text-[13px]"
        }`}
      >
        Xem hồ sơ
      </Link>
      {inviteSuccess === t.id ? (
        <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#ECFDF5] px-3 text-xs font-semibold text-[#047857] h-6" aria-live="polite">
          <CheckCircle2 size={12} aria-hidden="true" /> Đã mời
        </span>
      ) : (
        <button
          type="button"
          onClick={() => handleInvite(t.id)}
          disabled={invitingId === t.id}
          style={nenNutMoi}
          className={`${nutMoiLop} inline-flex items-center justify-center ${
            trenMobile ? "h-11 flex-1 rounded-[12px] px-4 text-sm" : "h-9 rounded-[10px] px-3 text-[13px]"
          }`}
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
  );

  // Chip lỗi mời trong dòng (không mất trang, đặc tả 02 A2).
  const chipLoiMoi = (t: Talent) =>
    loiMoiId === t.id ? (
      <span role="alert" className="mt-2 inline-flex h-6 items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 text-xs font-semibold text-[#B91C1C]">
        <AlertTriangle size={12} aria-hidden="true" />
        Mời chưa thành công, bạn thử lại nhé.
      </span>
    ) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tìm kiếm nhân tài"
        subtitle="Tra cứu hồ sơ học sinh theo tên, lớp, khối, lĩnh vực, điểm năng lực — để tuyển thực tập hoặc tài trợ tài năng."
      />

      <div>
        <Card className="mb-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
              <Filter size={16} className="text-muted-strong" aria-hidden="true" /> <span>Bộ lọc</span>
            </div>
            {coBoLoc && (
              <button
                type="button"
                onClick={xoaBoLoc}
                className="btn-secondary h-11 px-5"
              >
                Bỏ bộ lọc
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="flex h-11 items-center gap-2 rounded-[12px] border border-line-control bg-white px-3">
              <label htmlFor="search-input" className="sr-only">Tìm kiếm theo tên hoặc sở thích</label>
              <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
              <input
                id="search-input"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tên / sở thích..."
                className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-strong"
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
                className="input-control"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="grade-filter" className="sr-only">Lọc theo khối</label>
              <select
                id="grade-filter"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="input-control"
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
                className="input-control"
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
                className="input-control"
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
                className="input-control"
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
      </div>

      {error && (
        <ErrorBox message={error} retryLabel="Thử lại" onRetry={load} />
      )}

      {!data ? (
        <div aria-busy="true" aria-label="Đang tải danh sách nhân tài">
          <div className="skeleton mx-auto h-7 w-[260px] rounded" aria-hidden="true" />
          <div className="skeleton mx-auto mt-2 h-3.5 w-full rounded" aria-hidden="true" />
          <div className="skeleton mt-8 h-[140px] rounded-[20px]" aria-hidden="true" />
          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="skeleton h-5 w-[280px] rounded" aria-hidden="true" />
            <div className="skeleton h-11 w-[120px] rounded-[12px]" aria-hidden="true" />
          </div>
          <div className="skeleton mt-4 h-[44px] rounded-[12px]" aria-hidden="true" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton mt-2 h-12 rounded-[12px]" aria-hidden="true" />
          ))}
          <div className="skeleton mt-8 h-[320px] rounded-[20px]" aria-hidden="true" />
          <p className="mt-4 text-center text-sm text-muted-strong">Đang tải danh sách nhân tài…</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-strong" aria-live="polite">
              {data.total} hồ sơ phù hợp · Trang {data.page} / {data.total_pages}
            </p>
            <div>
              <label htmlFor="page-size" className="sr-only">Số mục mỗi trang</label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="input-control"
                style={{ width: "auto" }}
              >
                <option value={10}>10/trang</option>
                <option value={20}>20/trang</option>
                <option value={50}>50/trang</option>
                <option value={100}>100/trang</option>
              </select>
            </div>
          </div>

          {data.items.length === 0 ? (
            <Empty
              text={coBoLoc ? "Không tìm thấy hồ sơ phù hợp với bộ lọc." : "Chưa có hồ sơ nhân tài nào."}
              icon={<Search size={32} aria-hidden="true" />}
              action={
                coBoLoc ? (
                  <button type="button" onClick={xoaBoLoc} className="btn-secondary h-9 px-3.5 text-[13px]">
                    Bỏ bộ lọc
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              {/* Bảng kết quả từ 768px trở lên. */}
              <div className="hidden md:block overflow-x-auto" role="region" aria-label="Kết quả tìm kiếm nhân tài" tabIndex={0}>
                <table className="w-full min-w-[600px] text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted-strong border-b border-line-strong">
                      <th className="px-3 py-2.5" scope="col">Họ tên</th>
                      <th className="px-3 py-2.5" scope="col">Lớp</th>
                      <th className="px-3 py-2.5" scope="col">Khối</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Năng lực</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Kỹ thuật</th>
                      <th className="px-3 py-2.5" scope="col">Kỹ năng nổi bật</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((t) => (
                      <tr key={t.id} className="border-b border-line min-h-[44px] hover:bg-portal-soft/40 transition-colors duration-150 ease-out">
                        <td className="px-3 py-3 text-sm font-semibold text-ink max-w-[180px] truncate" title={t.full_name}>{t.full_name}</td>
                        <td className="px-3 py-3 text-sm text-ink whitespace-nowrap">{t.class_name}</td>
                        <td className="px-3 py-3 text-sm text-ink whitespace-nowrap">Khối {t.grade}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-ink whitespace-nowrap" aria-label={`Điểm năng lực ${t.talent_score}`}>{t.talent_score}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-ink whitespace-nowrap" aria-label={`Điểm kỹ thuật ${t.technical_score}`}>{t.technical_score}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5" aria-label={`Kỹ năng: ${t.top_skills.slice(0, 3).join(", ")}`}>
                            {t.top_skills.slice(0, 3).map((skill, i) => (
                              <span
                                key={i}
                                className="inline-flex h-6 items-center rounded-full bg-portal-soft px-2.5 text-xs font-semibold text-portal-dark whitespace-nowrap"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          {oThaoTac(t, false)}
                          {chipLoiMoi(t)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Danh sách thẻ dọc dưới 768px (00/4.7). */}
              <div className="space-y-3 md:hidden" role="list" aria-label="Danh sách hồ sơ nhân tài">
                {data.items.map((t) => (
                  <div key={t.id} role="listitem" className="rounded-2xl border border-line bg-white p-4">
                    <div className="text-sm font-semibold text-ink">{t.full_name}</div>
                    <dl className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Lớp</dt>
                        <dd className="text-sm font-semibold text-ink">{t.class_name}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Khối</dt>
                        <dd className="text-sm font-semibold text-ink">Khối {t.grade}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Điểm năng lực</dt>
                        <dd className="text-sm font-bold tabular-nums text-ink">{t.talent_score}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Điểm kỹ thuật</dt>
                        <dd className="text-sm font-bold tabular-nums text-ink">{t.technical_score}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Kỹ năng nổi bật</dt>
                        <dd className="flex flex-wrap justify-end gap-1.5">
                          {t.top_skills.slice(0, 3).map((skill, i) => (
                            <span
                              key={i}
                              className="inline-flex h-6 items-center rounded-full bg-portal-soft px-2.5 text-xs font-semibold text-portal-dark whitespace-nowrap"
                            >
                              {skill}
                            </span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      {oThaoTac(t, true)}
                      {chipLoiMoi(t)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {data.total_pages > 1 && (
            <nav aria-label="Phân trang kết quả tìm kiếm" className="mt-4">
              <div className="flex items-center justify-center gap-1" aria-live="polite">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page === 1}
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-control text-muted-strong hover:bg-canvas-soft disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-150"
                  aria-label="Trang trước"
                  aria-disabled={data.page === 1}
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-3 py-1.5 text-muted-strong" aria-hidden="true">…</span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(p as number)}
                      className={`h-11 w-11 rounded-[12px] text-sm font-semibold transition hover:shadow-sm ${
                        data.page === p
                          ? "bg-portal text-white"
                          : "border border-line-control hover:bg-canvas-soft"
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
                  className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-control text-muted-strong hover:bg-canvas-soft disabled:opacity-55 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-150"
                  aria-label="Trang sau"
                  aria-disabled={data.page === data.total_pages}
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
          {data.items.length > 0 ? (
            <section className="mt-8" aria-label="Mạng nhân tài và kỹ năng thật">
              <div className="mx-auto w-full max-w-[560px]">
                <DataNetwork
                  mode="enterprise"
                  ariaLabel="Mạng 5 nhân tài điểm cao nhất và kỹ năng thật của từng người"
                  tieuDe="Ai giỏi kỹ năng nào"
                  tomTat={tomTatNhanTai}
                  nodes={[
                    ...top5.map((t) => ({ id: `talent-${t.id}`, label: t.full_name, group: "talent", size: 2 } as DataNode)),
                    ...kyNangTop5.map((skill) => ({ id: `skill-${String(skill)}`, label: String(skill), group: "skill", size: 1 } as DataNode)),
                  ]}
                  links={top5.flatMap((t) =>
                    t.top_skills.slice(0, 3).map((skill) => ({ source: `talent-${t.id}`, target: `skill-${String(skill)}` } as DataLink))
                  )}
                  height={280}
                />
              </div>
            </section>
          ) : (
            <p className="mt-8 text-sm text-muted-strong">Mạng kỹ năng sẽ hiện khi có hồ sơ phù hợp.</p>
          )}
        </>
      )}
    </div>
  );
}
