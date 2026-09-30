import { useCallback, useEffect, useRef, useState } from "react";
import { Award, BookOpen, Briefcase, Star, Edit, Trash2, Plus, CheckCircle, AlertCircle, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Profile {
  full_name: string;
  class_name: string;
  grade: number;
  education_level: string;
  talent_score: number;
  experience_hours: number;
  interests: string | null;
  bio: string | null;
  skills: { code: string; name: string; level: number }[];
  badges: { code: string; name: string; icon: string; color: string }[];
  evaluation_count: number;
  certificates: { id: number; title: string; issuer: string; issued_at: string | null }[];
  projects: { id: number; title: string; field: string; status: string; role: string }[];
}

interface Certificate {
  id?: number;
  title: string;
  issuer: string;
  issued_at: string | null;
}

interface GroupRecommendation {
  name: string;
  field: string;
  why: string;
  match_pct: number;
  members: number;
  existing: boolean;
  joined: boolean;
}

interface RecommendationsResponse {
  based_on: {
    top_skills: string[];
    poles: string[];
    field: string | null;
    hours: number;
  };
  suggestions: GroupRecommendation[];
  my_groups: { name: string; field: string; members: number }[];
}

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

const SKILL_BARS = ["skillbar-a", "skillbar-b", "skillbar-c", "skillbar-d"];

const FIELD_LABELS: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

export default function Profile() {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [recs, setRecs] = useState<RecommendationsResponse | null>(null);
  const [recsError, setRecsError] = useState("");
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [certForm, setCertForm] = useState({ title: "", issuer: "", issued_at: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const certFormRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Chuyển lỗi API thành thông điệp tiếng Việt rõ ràng — không hiện thô "API ... → 401".
  const fetchErrorMessage = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để xem hồ sơ năng lực của bạn.";
    if (msg.includes("→ 403")) return "Bạn cần đăng nhập bằng tài khoản học sinh để xem hồ sơ năng lực của bạn.";
    return msg;
  };

  // 401/403 khi bấm thao tác: toast thân thiện thay vì thông điệp kỹ thuật.
  const toastAuthError = (message: string): boolean => {
    if (message.includes("→ 401")) {
      showToast("error", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      return true;
    }
    if (message.includes("→ 403")) {
      showToast("error", "Bạn cần đăng nhập bằng tài khoản học sinh để dùng chức năng này.");
      return true;
    }
    return false;
  };

  const loadProfile = useCallback(() => {
    get<Profile>("/student/profile").then(setData).catch((e) => setError(fetchErrorMessage(e)));
  }, []);

  useEffect(() => {
    loadProfile();
    // Gợi ý nhóm là dữ liệu phụ: lỗi riêng, không làm hỏng cả trang Hồ sơ.
    get<RecommendationsResponse>("/student/recommendations")
      .then(setRecs)
      .catch((e) => setRecsError(String((e as Error).message || e)));
  }, [loadProfile]);

  const validateCertForm = () => {
    if (!certForm.title.trim()) {
      showToast("error", "Tên chứng chỉ không được rỗng");
      return false;
    }
    return true;
  };

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCertForm()) return;

    setSubmitting(true);
    try {
      if (editingCert) {
        await put(`/student/certificates/${editingCert.id}`, certForm);
        showToast("success", "Cập nhật chứng chỉ thành công");
      } else {
        await post("/student/certificates", certForm);
        showToast("success", "Thêm chứng chỉ thành công");
      }
      setShowCertForm(false);
      setEditingCert(null);
      setCertForm({ title: "", issuer: "", issued_at: "" });
      loadProfile();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (toastAuthError(message)) {
        // 401/403 đã có thông điệp tiếng Việt
      } else if (message.includes("validation") || message.includes("Tên chứng chỉ")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCert = (cert: Certificate) => {
    setEditingCert(cert);
    setCertForm({ title: cert.title, issuer: cert.issuer || "", issued_at: cert.issued_at || "" });
    setShowCertForm(true);
    certFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteCert = async (cert: Certificate) => {
    if (!cert.id) return;
    if (!window.confirm(`Xoá chứng chỉ "${cert.title}"?`)) return;
    setSubmitting(true);
    try {
      await del(`/student/certificates/${cert.id}`);
      showToast("success", "Xoá chứng chỉ thành công");
      loadProfile();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (toastAuthError(message)) {
        // 401/403 đã có thông điệp tiếng Việt
      } else if (message.includes("404") || message.includes("422")) {
        showToast("error", "Chứng chỉ không tồn tại hoặc đã bị xoá");
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCert = () => {
    setShowCertForm(false);
    setEditingCert(null);
    setCertForm({ title: "", issuer: "", issued_at: "" });
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-label="Thông báo">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in ${
              t.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle size={18} className="shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <PageHeader title="Hồ sơ năng lực" subtitle="Quản lý thông tin cá nhân, theo dõi năng lực, thành tích, chứng chỉ và dự án (slide 11)." />

      {/* Header card với cover gradient (slide 11) */}
      <Card interactive reveal revealDelay={0.05} className="overflow-hidden !p-0 mb-6 transition-responsive">
        <div className="h-24 hero-gradient" />
        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <div className="-mt-10 h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg border-4 border-white">
                {data.full_name.charAt(0)}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-extrabold text-ink">{data.full_name}</h2>
                <p className="text-sm text-muted">
                  Lớp {data.class_name} · {data.education_level === "CDDH" ? "Khoá" : "Khối"} {data.grade} · {data.education_level}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <button className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-canvas-soft">
                Chia sẻ hồ sơ
              </button>
              <button className="rounded-full cta-gradient px-4 py-1.5 text-xs font-semibold text-white">
                Chỉnh sửa
              </button>
            </div>
          </div>
          {/* Stats cam (slide 11) */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4 stagger-children">
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.talent_score}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Điểm năng lực</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.badges.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Huy hiệu</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.projects.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Dự án</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kỹ năng — 2 cột + thanh gradient (slide 11) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Kỹ năng</h2>
          </div>
          {data.skills.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <BookOpen size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa có kỹ năng được đánh giá.</p>
              <p className="mt-1 text-xs text-muted-light">Hoàn thành bài test hoặc nhận đánh giá từ GV để thấy kỹ năng ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 stagger-children" role="list" aria-label="Danh sách kỹ năng">
              {data.skills.map((s, i) => (
                <div key={s.code} role="listitem">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="text-muted tabular-nums">{s.level * 10}</span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-soft overflow-hidden transition-responsive hover:brightness-105" role="progressbar" aria-valuenow={Math.min(100, s.level * 10)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name}: ${s.level * 10} phần trăm`}>
                    <div
                      className={`h-full rounded-full ${SKILL_BARS[i % SKILL_BARS.length]}`}
                      style={{ width: `${Math.min(100, s.level * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {(data.interests || data.bio) && (
            <div className="mt-4 text-sm text-muted border-t border-line pt-3">
              {data.interests && <p><span className="font-medium text-ink">Sở thích:</span> {data.interests}</p>}
              {data.bio && <p className="mt-1"><span className="font-medium text-ink">Giới thiệu:</span> {data.bio}</p>}
            </div>
          )}
        </Card>

        {/* Chứng chỉ (slide 11) */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Chứng chỉ</h2>
          </div>
          <div ref={certFormRef}>
            {showCertForm && (
            <form onSubmit={handleCertSubmit} className="space-y-3 mb-4 p-3 rounded-xl bg-canvas-soft/50 border border-line" aria-label="Form chứng chỉ">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="cert-title" className="block text-sm font-medium text-ink mb-1">
                    Tên chứng chỉ <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="cert-title"
                    type="text"
                    value={certForm.title}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                    placeholder="VD: Chứng chỉ Lập trình Python"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="cert-issuer" className="block text-sm font-medium text-ink mb-1">
                    Tổ chức cấp
                  </label>
                  <input
                    id="cert-issuer"
                    type="text"
                    value={certForm.issuer}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, issuer: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                    placeholder="VD: FTalentHub, Coursera, Google"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="cert-issued_at" className="block text-sm font-medium text-ink mb-1">
                    Ngày cấp
                  </label>
                  <input
                    id="cert-issued_at"
                    type="date"
                    value={certForm.issued_at}
                    onChange={(e) => setCertForm((prev) => ({ ...prev, issued_at: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelCert}
                  className="px-4 py-2 rounded-xl border border-line text-sm text-muted hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl cta-gradient text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      {editingCert ? "Đang cập nhật..." : "Đang tạo..."}
                    </>
                  ) : (
                    editingCert ? "Cập nhật" : "Thêm chứng chỉ"
                  )}
                </button>
              </div>
            </form>
          )}
          {!showCertForm && (
            <button
              onClick={() => setShowCertForm(true)}
              className="mb-4 flex items-center gap-1.5 text-sm px-3 py-2 rounded-full cta-gradient text-white font-semibold hover:brightness-105 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              <Plus size={14} aria-hidden="true" /> Thêm chứng chỉ
            </button>
          )}
          {data.certificates.length === 0 && !showCertForm ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Award size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa có chứng chỉ nào.</p>
              <p className="mt-1 text-xs text-muted-light">Chứng chỉ sẽ hiện ở đây sau khi bạn hoàn thành các khóa học.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.certificates.map((c) => (
                <li key={c.id} className="flex items-start gap-3">
                  <span className="h-9 w-9 shrink-0 mt-0.5 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center">
                    <Award size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink line-clamp-2 leading-snug">{c.title}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {c.issuer}{c.issued_at ? ` · ${c.issued_at}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditCert(c)}
                      disabled={!c.id}
                      className="text-xs px-2 py-1 rounded-lg border border-line text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Chỉnh sửa chứng chỉ ${c.title}`}
                      title={c.id ? "" : "Chứng chỉ này thiếu ID, không thể sửa"}
                    >
                      <Edit size={14} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDeleteCert(c)}
                      disabled={!c.id}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Xoá chứng chỉ ${c.title}`}
                      title={c.id ? "" : "Chứng chỉ này thiếu ID, không thể xoá"}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </Card>
      </div>

      {/* Gợi ý nhóm theo năng khiếu (slide 5) */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Compass size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-ink">Gợi ý nhóm cho tôi</h2>
          </div>
          <p className="text-xs text-muted mb-4">
            Dựa trên kỹ năng, kết quả test năng khiếu và sở thích của bạn.
          </p>

          {recsError ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2" role="status">
              Chưa tải được gợi ý nhóm lúc này.
            </p>
          ) : !recs ? (
            <p className="text-sm text-muted text-center py-6 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">
              Đang tải gợi ý nhóm…
            </p>
          ) : recs.suggestions.length === 0 ? (
            <p className="text-sm text-muted text-center py-6 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">
              Chưa có đủ dữ liệu — hãy làm bài test năng khiếu để nhận gợi ý phù hợp.
            </p>
          ) : (
            <div className="space-y-3">
              {recs.my_groups.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recs.my_groups.map((g) => (
                    <span key={g.name} className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                      Đã tham gia: {g.name} · {g.members} thành viên
                    </span>
                  ))}
                </div>
              )}
              {recs.suggestions.map((s) => (
                <div key={s.name} className="rounded-xl border border-line bg-canvas-soft/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink text-sm">{s.name}</span>
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-canvas-soft text-muted font-semibold">
                          {FIELD_LABELS[s.field] || s.field}
                        </span>
                        {s.joined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold">
                            Đã tham gia
                          </span>
                        )}
                        {s.existing && !s.joined && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 font-semibold">
                            Nhóm đã có · {s.members} thành viên
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">{s.why}</p>
                    </div>
                    <span className="text-sm font-extrabold text-ink tabular-nums shrink-0">{s.match_pct}%</span>
                  </div>
                  <div
                    className="h-1.5 mt-2 rounded-full bg-canvas-soft overflow-hidden"
                    role="progressbar"
                    aria-valuenow={s.match_pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Mức phù hợp ${s.name}: ${s.match_pct}%`}
                  >
                    <div className="h-full rounded-full hero-gradient transition-all duration-700 ease-out" style={{ width: `${Math.max(2, Math.min(100, s.match_pct))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dự án đã tham gia (slide 11) */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Dự án đã tham gia</h2>
          </div>
          {data.projects.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Briefcase size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa tham gia dự án nào.</p>
              <p className="mt-1 text-xs text-muted-light">Dự án sẽ hiện ở đây khi bạn tham gia các hoạt động nhóm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.projects.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-4 flex items-start justify-between gap-3 interactive hover-lift transition-responsive">
                  <div>
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    <div className="text-xs text-muted mt-1 capitalize">
                      {p.field.replace("_", " ")} · {p.status}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full cta-gradient px-2.5 py-1 text-[11px] font-semibold text-white">
                    {p.role === "owner" ? "Trưởng nhóm" : "Thành viên"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Link đến trang Đánh giá riêng */}
      <div className="mt-6">
        <Card className="bg-portal-soft/30 border-portal-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Đánh giá từ giáo viên & huấn luyện viên</h2>
            </div>
            <Link
              to="/student/evaluations"
              className="text-sm text-portal font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded px-2 py-1"
            >
              Xem đánh giá đầy đủ →
            </Link>
          </div>
          <p className="mt-2 text-sm text-muted">Nhấn để xem chi tiết các tiêu chí Chuyên môn 40 / Sáng tạo 20 / Làm việc nhóm 20 / Kỷ luật 20, nhận xét và người đánh giá.</p>
        </Card>
      </div>
    </div>
  );
}
