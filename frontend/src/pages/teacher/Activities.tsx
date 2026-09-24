import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Users, Edit, Trash2, PauseCircle, CheckCircle, AlertCircle } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface Activity {
  id: number;
  title: string;
  field: string;
  description: string | null;
  capacity: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  registered_count: number;
}

const FIELDS = ["ky_thuat", "nghe_thuat", "kinh_doanh", "the_thao", "hoc_thuat", "sang_tao"];

const FIELD_ICONS = [
  "bg-gradient-to-br from-orange-400 to-orange-600",
  "bg-gradient-to-br from-pink-500 to-rose-600",
  "bg-gradient-to-br from-violet-500 to-purple-700",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
];

const STATUS_LABELS: Record<string, string> = {
  open: "Đang mở",
  paused: "Tạm dừng",
  closed: "Đã kết thúc",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-emerald-50", text: "text-emerald-600" },
  paused: { bg: "bg-amber-50", text: "text-amber-600" },
  closed: { bg: "bg-canvas-soft", text: "text-muted" },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["paused", "closed"],
  paused: ["open", "closed"],
  closed: ["open"],
};

export default function Activities() {
  const [data, setData] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState({ title: "", field: "ky_thuat", description: "", capacity: 30, start_date: "" as string | null, end_date: "" as string | null });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
      errors.title = "Tên sân chơi không được để trống";
    }
    if (form.capacity <= 0) {
      errors.capacity = "Sức chứa phải lớn hơn 0";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const load = useCallback(() => {
    get<Activity[]>("/teacher/activities").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ title: "", field: "ky_thuat", description: "", capacity: 30, start_date: "", end_date: "" });
    setFieldErrors({});
    setEditingActivity(null);
    setShowForm(false);
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setForm({
      title: activity.title,
      field: activity.field,
      description: activity.description || "",
      capacity: activity.capacity,
      start_date: activity.start_date || "",
      end_date: activity.end_date || "",
    });
    setFieldErrors({});
    setShowForm(true);
  };

  const createOrUpdate = async () => {
    if (!validateForm()) return;
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        field: form.field,
        description: form.description,
        capacity: form.capacity,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };
      if (editingActivity) {
        await put(`/teacher/activities/${editingActivity.id}`, payload);
        showToast("success", "Cập nhật sân chơi thành công");
      } else {
        await post("/teacher/activities", payload);
        showToast("success", "Tạo sân chơi thành công");
      }
      resetForm();
      load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (activity: Activity, newStatus: string) => {
    setError("");
    try {
      await put(`/teacher/activities/${activity.id}/status`, { status: newStatus });
      showToast("success", `Đã ${STATUS_LABELS[newStatus]?.toLowerCase()} sân chơi`);
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast("error", message);
    }
  };

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Xóa sân chơi "${activity.title}"?`)) return;
    setError("");
    try {
      await del(`/teacher/activities/${activity.id}`);
      showToast("success", "Xóa sân chơi thành công");
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast("error", message);
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        .anim-fade-up { animation: fadeUp 0.7s ease-out both; }
        .reveal { opacity: 0; transform: translateY(16px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .reveal.reveal-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) {
          .anim-fade-up { animation: fadeIn 0.2s ease both; }
          .reveal { transition: opacity 0.2s ease; }
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
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

      <PageHeader
        reveal
        title="Sân chơi của tôi"
        subtitle="Tạo, sửa, tạm dừng/kết thúc/mở lại và xoá các hoạt động bạn phụ trách (slide 21)."
        actions={
          <button
            onClick={() => {
              setEditingActivity(null);
              setForm({ title: "", field: "ky_thuat", description: "", capacity: 30, start_date: null, end_date: null });
              setShowForm(!showForm);
            }}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
          >
            <Plus size={16} /> Tạo sân chơi mới
          </button>
        }
      />

      {showForm && (
        <Card reveal revealDelay={1} className="mb-6 border-line">
          <h3 className="font-semibold text-ink mb-3">{editingActivity ? "Chỉnh sửa sân chơi" : "Sân chơi mới"}</h3>
          <form onSubmit={(e) => { e.preventDefault(); createOrUpdate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="activity-title" className="block text-sm font-medium text-ink mb-1">
                Tên sân chơi <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="activity-title"
                type="text"
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); if (fieldErrors.title) setFieldErrors({ ...fieldErrors, title: "" }); }}
                placeholder="Tên sân chơi *"
                className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal focus:ring-2 focus:ring-portal/20 transition-colors ${fieldErrors.title ? "border-red-400 focus:border-red-400" : ""}`}
                aria-required="true"
                aria-invalid={fieldErrors.title ? "true" : "false"}
                aria-describedby={fieldErrors.title ? "title-error" : undefined}
                autoComplete="off"
              />
              {fieldErrors.title && <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.title}</p>}
            </div>
            <div className="flex gap-3">
              <select
                value={form.field}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-line text-sm bg-white focus:border-portal focus:ring-2 focus:ring-portal/20 transition-colors"
              >
                {FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => { setForm({ ...form, capacity: Number(e.target.value) }); if (fieldErrors.capacity) setFieldErrors({ ...fieldErrors, capacity: "" }); }}
                placeholder="Sức chứa"
                className="w-24 px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal focus:ring-2 focus:ring-portal/20 transition-colors"
                aria-invalid={fieldErrors.capacity ? "true" : "false"}
                aria-describedby={fieldErrors.capacity ? "capacity-error" : undefined}
                inputMode="numeric"
              />
              {fieldErrors.capacity && <p id="capacity-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.capacity}</p>}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="activity-description" className="block text-sm font-medium text-ink mb-1">Mô tả ngắn</label>
              <input
                id="activity-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn"
                className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal focus:ring-2 focus:ring-portal/20 transition-colors w-full"
                autoComplete="off"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? "Đang lưu..." : editingActivity ? "Cập nhật" : "Lưu"}
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

      <Card reveal revealDelay={2} className="overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line bg-canvas-soft/60">
              <th className="px-5 py-3">Hoạt động</th>
              <th className="px-5 py-3">Lĩnh vực</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3">Thời gian</th>
              <th className="px-5 py-3">Học viên</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  Chưa có sân chơi nào — bấm "Tạo sân chơi mới" để bắt đầu.
                </td>
              </tr>
            )}
            {data.map((a, i) => (
              <tr key={a.id} className="border-b border-line hover:bg-canvas-soft/50 transition-colors duration-150">
                <td className="px-5 py-3.5 text-sm transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`h-9 w-9 shrink-0 rounded-full ${FIELD_ICONS[i % FIELD_ICONS.length]} text-white flex items-center justify-center`}>
                      <Users size={16} />
                    </span>
                    <span className="font-semibold text-ink">{a.title}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-sm transition-colors">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-canvas-soft text-muted font-medium capitalize">
                    {a.field.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm transition-colors">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status]?.bg || "bg-canvas-soft"} ${STATUS_COLORS[a.status]?.text || "text-muted"}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm transition-colors">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Clock size={13} /> {a.start_date ?? "Sắp mở"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm transition-colors">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Users size={13} /> {a.registered_count}/{a.capacity}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-right transition-colors">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(a)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-line font-medium text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                      aria-label={`Sửa ${a.title}`}
                    >
                      <Edit size={14} aria-hidden="true" /> Sửa
                    </button>
                    {STATUS_TRANSITIONS[a.status] && STATUS_TRANSITIONS[a.status].length > 0 && (
                      <div className="relative inline-block group">
                        <button
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-line font-medium text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                          aria-haspopup="true"
                          aria-expanded="false"
                        >
                          <PauseCircle size={14} aria-hidden="true" /> Trạng thái
                        </button>
                        <div className="absolute right-0 top-full mt-1 z-10 min-w-[140px] rounded-xl bg-white border border-line shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150" role="menu">
                          {STATUS_TRANSITIONS[a.status].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleStatusChange(a, s)}
                              className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-canvas-soft focus:outline-none focus:bg-canvas-soft"
                              role="menuitem"
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-50 font-medium text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                      aria-label={`Xóa ${a.title}`}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card reveal revealDelay={3} className="mt-4">
        <div className="text-xs text-muted">Đang phụ trách</div>
        <div className="text-lg font-extrabold text-ink">
          {data.length} sân chơi · {data.reduce((s, a) => s + a.registered_count, 0)} học viên
        </div>
      </Card>
    </div>
  );
}