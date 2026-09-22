import { useCallback, useEffect, useState } from "react";
import { Plus, X, Users, Mail, Award, Clock, Edit, Trash2, ToggleLeft, ToggleRight, Eye, AlertCircle, CheckCircle } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface Internship {
  id: number;
  title: string;
  description: string | null;
  required_skills: string | null;
  slots: number;
  status: string;
  deadline: string | null;
  applicant_count: number;
  created_at?: string;
}

interface Applicant {
  application_id: number;
  student_id: number;
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  experience_hours: number;
  interests: string | null;
  avatar_url: string | null;
  status: string;
  applied_at: string;
}

export default function Internships() {
  const [data, setData] = useState<Internship[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Internship | null>(null);
  const [form, setForm] = useState({ title: "", description: "", required_skills: "", slots: 2, deadline: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<Internship | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [showApplicants, setShowApplicants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) {
      errors.title = "Tiêu đề không được để trống";
    }
    if (form.slots <= 0) {
      errors.slots = "Số vị trí phải lớn hơn 0";
    }
    if (form.deadline) {
      const deadlineDate = new Date(form.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        errors.deadline = "Hạn nộp phải là ngày hôm nay hoặc trong tương lai";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const load = useCallback(() => {
    get<Internship[]>("/enterprise/internships").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ title: "", description: "", required_skills: "", slots: 2, deadline: "" });
    setFieldErrors({});
    setEditingPost(null);
    setShowForm(false);
  };

  const handleEdit = (post: Internship) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      description: post.description || "",
      required_skills: post.required_skills || "",
      slots: post.slots,
      deadline: post.deadline || "",
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const create = async () => {
    if (!validateForm()) return;
    setError("");
    setSubmitting(true);
    try {
      if (editingPost) {
        await put(`/enterprise/internships/${editingPost.id}`, {
          title: form.title,
          description: form.description,
          required_skills: form.required_skills,
          slots: form.slots,
          deadline: form.deadline || null,
        });
        showToast("success", "Cập nhật tin tuyển thực tập thành công");
      } else {
        await post("/enterprise/internships", {
          title: form.title,
          description: form.description,
          required_skills: form.required_skills,
          slots: form.slots,
          deadline: form.deadline || null,
        });
        showToast("success", "Đăng tin tuyển thực tập thành công");
      }
      resetForm();
      load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("validation") || message.includes("Tiêu đề") || message.includes("vị trí") || message.includes("Hạn nộp")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (post: Internship) => {
    setError("");
    try {
      const newStatus = post.status === "open" ? "closed" : "open";
      await put(`/enterprise/internships/${post.id}`, {
        title: post.title,
        description: post.description,
        required_skills: post.required_skills,
        slots: post.slots,
        deadline: post.deadline,
        status: newStatus,
      });
      load();
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  };

  const handleDelete = async (post: Internship) => {
    if (!window.confirm(`Xóa tin "${post.title}"?`)) return;
    setError("");
    try {
      await del(`/enterprise/internships/${post.id}`);
      load();
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  };

  const handleViewApplicants = async (post: Internship) => {
    setSelectedPost(post);
    try {
      const apps = await get<Applicant[]>(`/enterprise/internships/${post.id}/applicants`);
      setApplicants(apps);
      setShowApplicants(true);
    } catch (e) {
      setError(String((e as Error).message || e));
    }
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

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Tuyển thực tập sinh</h1>
          <p className="mt-1 text-sm text-muted">
            {data.length} tin đăng · {data.reduce((s, p) => s + p.applicant_count, 0)} ứng viên đang xét duyệt.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingPost(null);
            setForm({ title: "", description: "", required_skills: "", slots: 2, deadline: "" });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" /> Đăng tin mới
        </button>
      </header>

      {showForm && (
        <Card className="mb-6 border-portal-soft">
          <h2 className="font-semibold text-ink mb-3" id="form-title">{editingPost ? "Chỉnh sửa tin tuyển thực tập" : "Tin tuyển thực tập mới"}</h2>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-labelledby="form-title">
            <div>
              <label htmlFor="internship-title" className="block text-sm font-medium text-ink mb-1">
                Tiêu đề vị trí <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="internship-title"
                type="text"
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: "" }); }}
                placeholder="VD: Thực tập sinh AI Engineer"
                className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${fieldErrors.title ? "border-red-400 focus:border-red-400" : ""}`}
                aria-required="true"
                aria-invalid={fieldErrors.title ? "true" : "false"}
                aria-describedby={fieldErrors.title ? "title-error" : undefined}
                autoComplete="off"
              />
              {fieldErrors.title && <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.title}</p>}
            </div>
            <div className="flex gap-3">
              <div className="w-28">
                <label htmlFor="internship-slots" className="block text-sm font-medium text-ink mb-1">
                  Số vị trí <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <input
                  id="internship-slots"
                  type="number"
                  min={1}
                  value={form.slots}
                  onChange={(e) => { setForm({ ...form, slots: Number(e.target.value) }); if (fieldErrors.slots) setFieldErrors({ ...fieldErrors, slots: "" }); }}
                  placeholder="Số vị trí"
                  className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${fieldErrors.slots ? "border-red-400 focus:border-red-400" : ""}`}
                  aria-required="true"
                  aria-invalid={fieldErrors.slots ? "true" : "false"}
                  aria-describedby={fieldErrors.slots ? "slots-error" : undefined}
                  inputMode="numeric"
                />
                {fieldErrors.slots && <p id="slots-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.slots}</p>}
              </div>
              <div className="flex-1">
                <label htmlFor="internship-deadline" className="block text-sm font-medium text-ink mb-1">
                  Hạn nộp
                </label>
                <input
                  id="internship-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => { setForm({ ...form, deadline: e.target.value }); if (fieldErrors.deadline) setFieldErrors({ ...fieldErrors, deadline: "" }); }}
                  className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${fieldErrors.deadline ? "border-red-400 focus:border-red-400" : ""}`}
                  aria-invalid={fieldErrors.deadline ? "true" : "false"}
                  aria-describedby={fieldErrors.deadline ? "deadline-error" : undefined}
                  autoComplete="off"
                />
                {fieldErrors.deadline && <p id="deadline-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.deadline}</p>}
              </div>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="internship-skills" className="block text-sm font-medium text-ink mb-1">
                Kỹ năng yêu cầu
              </label>
              <input
                id="internship-skills"
                type="text"
                value={form.required_skills}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                placeholder="VD: Python, React, SQL..."
                className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full"
                autoComplete="off"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="internship-description" className="block text-sm font-medium text-ink mb-1">
                Mô tả công việc, yêu cầu
              </label>
              <textarea
                id="internship-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả chi tiết công việc, yêu cầu, quyền lợi..."
                className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full min-h-[80px] resize-y"
                autoComplete="off"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? "Đang lưu..." : editingPost ? "Cập nhật" : "Đăng tin"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-xl bg-canvas-soft text-muted hover:bg-canvas-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Hủy
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal xem ứng viên */}
      {showApplicants && selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="applicants-modal-title"
        >
          <div className="w-full max-w-4xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="applicants-modal-title" className="font-semibold text-ink">Ứng viên: {selectedPost.title}</h3>
              <button
                type="button"
                onClick={() => setShowApplicants(false)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                aria-label="Đóng danh sách ứng viên"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {applicants.length === 0 ? (
                <p className="text-sm text-muted text-center py-8" role="status">Chưa có ứng viên nào.</p>
              ) : (
                <ul className="space-y-4" role="list" aria-label="Danh sách ứng viên">
                  {applicants.map((a) => (
                    <li key={a.application_id}>
                      <Card className="bg-canvas-soft/50">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 shrink-0 rounded-xl bg-portal-soft flex items-center justify-center overflow-hidden" aria-hidden="true">
                            {a.avatar_url ? (
                              <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-bold text-portal">{a.full_name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-semibold text-ink">{a.full_name}</div>
                                <div className="text-xs text-muted">{a.class_name} · Khối {a.grade}</div>
                              </div>
                              <span
                                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium ${
                                  a.status === "pending" ? "bg-amber-50 text-amber-600" :
                                  a.status === "reviewing" ? "bg-blue-50 text-blue-600" :
                                  "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {a.status === "pending" ? "Chờ duyệt" : a.status === "reviewing" ? "Đang xem" : "Đã duyệt"}
                              </span>
                            </div>
                            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Thông tin chi tiết ứng viên">
                              <div className="flex items-center gap-1">
                                <Users size={12} aria-hidden="true" />
                                <span>{a.experience_hours}h trải nghiệm</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Award size={12} aria-hidden="true" />
                                <span>★ {a.talent_score}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Mail size={12} aria-hidden="true" />
                                <span>Nộp: {a.applied_at.split("T")[0]}</span>
                              </div>
                            </dl>
                            {a.interests && (
                              <p className="mt-1.5 text-xs text-muted-light line-clamp-1"><span className="font-medium">Sở thích:</span> {a.interests}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <section aria-labelledby="posts-list-heading">
        <h2 id="posts-list-heading" className="sr-only">Danh sách tin tuyển dụng</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.length === 0 && (
            <Card className="lg:col-span-2">
              <p className="text-sm text-muted text-center py-6" role="status">Chưa có tin tuyển dụng — bấm "Đăng tin mới".</p>
            </Card>
          )}
          {data.map((p) => (
            <article key={p.id} className="card-group">
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-ink">{p.title}</h3>
                  <span
                    className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium ${
                      p.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-canvas-soft text-muted"
                    }`}
                  >
                    {p.status === "open" ? "Đang tuyển" : "Tạm dừng"}
                  </span>
                </div>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true">{p.slots}</span>
                    <span>vị trí</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true">{p.applicant_count}</span>
                    <span>ứng viên</span>
                  </div>
                  {p.deadline && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="inline mr-1" aria-hidden="true" />
                      <span>Hạn: {p.deadline}</span>
                    </div>
                  )}
                </dl>
                {p.required_skills && (
                  <p className="mt-1.5 text-xs text-muted-light line-clamp-1"><span className="font-medium">Kỹ năng: </span>{p.required_skills}</p>
                )}
                {p.description && (
                  <p className="mt-1.5 text-xs text-muted-light line-clamp-2">{p.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Hành động cho tin ${p.title}`}>
                  <button
                    type="button"
                    onClick={() => handleViewApplicants(p)}
                    className="flex-1 min-w-[100px] text-xs px-3 py-2 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                  >
                    <Eye size={14} className="inline mr-1" aria-hidden="true" /> Xem ứng viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="flex-1 min-w-[100px] text-xs px-3 py-2 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                  >
                    <Edit size={14} className="inline mr-1" aria-hidden="true" /> Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(p)}
                    className="flex-1 min-w-[100px] text-xs px-3 py-2 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                    style={{
                      backgroundColor: p.status === "open" ? "#fef3c7" : "#e5e7eb",
                      color: p.status === "open" ? "#92400e" : "#6b7280"
                    }}
                    aria-pressed={p.status === "open"}
                  >
                    {p.status === "open" ? (
                      <> <ToggleRight size={14} className="inline mr-1" aria-hidden="true" /> Tạm dừng </>
                    ) : (
                      <> <ToggleLeft size={14} className="inline mr-1" aria-hidden="true" /> Kích hoạt </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="flex-1 min-w-[100px] text-xs px-3 py-2 rounded-full bg-red-50 font-semibold text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                  >
                    <Trash2 size={14} className="inline mr-1" aria-hidden="true" /> Xóa
                  </button>
                </div>
              </Card>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}