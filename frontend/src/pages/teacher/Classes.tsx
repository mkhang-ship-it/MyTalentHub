import { useCallback, useEffect, useState } from "react";
import { Plus, Users, Edit, Trash2, X, Eye, AlertCircle, CheckCircle, LogIn } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading } from "../../components/ui";
import { useDialogA11y } from "../../hooks/useDialog";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ClassItem {
  id: number;
  name: string;
  grade: number;
  homeroom_teacher_name: string;
  student_count: number;
}

interface ClassStudent {
  id: number;
  full_name: string;
  grade: number;
  class_name: string;
}

interface TeacherMe {
  education_level: string;
  allowed_grades: number[];
}

export default function Classes() {
  const [data, setData] = useState<ClassItem[] | null>(null);
  const [error, setError] = useState("");
  // Lỗi phân quyền tách riêng: 401 = hết phiên, 403 = đang trải nghiệm cổng khác.
  // Không nằm trong `error` để không rơi vào ErrorBox trắng trang.
  const [authError, setAuthError] = useState<{ status: 401 | 403; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [form, setForm] = useState({ name: "", grade: 10 });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [showStudents, setShowStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [me, setMe] = useState<TeacherMe | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  // a11y cho modal danh sách học sinh: focus trap + Escape + trả focus về nút mở
  const studentsDialogRef = useDialogA11y<HTMLDivElement>(
    showStudents && selectedClass !== null,
    () => setShowStudents(false)
  );

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // Load teacher me info for allowed grades
  useEffect(() => {
    get<TeacherMe>("/teacher/me")
      .then((res) => {
        setMe(res);
        setMeLoading(false);
      })
      .catch(() => {
        setMeLoading(false);
        // Don't set error here, let individual API calls handle 401/403
      });
  }, []);

  // Helper to extract status from error message
  const getErrorStatus = (message: string): number => {
    const match = message.match(/API .* → (\d+):/);
    return match ? parseInt(match[1], 10) : 0;
  };

  // Tách lỗi phân quyền (401/403) khỏi lỗi hệ thống:
  // 401 → banner "hết phiên" + nút đăng nhập lại; 403 → banner "trải nghiệm cổng";
  // lỗi khác → error (render ErrorBox như cũ). Không để trang rơi vào ErrorBox trắng / Loading kẹt.
  const applyFetchError = (msg: string, opts?: { toast403?: boolean }) => {
    const status = getErrorStatus(msg);
    if (status === 401) {
      setAuthError({ status: 401, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." });
    } else if (status === 403) {
      const message = "Bạn đang xem cổng Giáo viên ở chế độ trải nghiệm. Đăng nhập bằng tài khoản giáo viên để dùng tính năng này.";
      setAuthError({ status: 403, message });
      if (opts?.toast403) showToast("error", message);
    } else {
      setError(msg);
    }
  };

  // Lỗi phát sinh từ thao tác bấm nút: 401/403 → banner + toast thân thiện; còn lại giữ nguyên.
  const applyActionError = (message: string, fallback: string) => {
    const status = getErrorStatus(message);
    if (status === 401 || status === 403) {
      applyFetchError(message);
      showToast(
        "error",
        status === 401
          ? "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại."
          : "Bạn đang xem cổng Giáo viên ở chế độ trải nghiệm. Đăng nhập bằng tài khoản giáo viên để dùng tính năng này."
      );
    } else {
      showToast("error", fallback);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) {
      errors.name = "Tên lớp không được để trống";
    }
    if (!form.grade) {
      errors.grade = "Khối không được để trống";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const load = useCallback(() => {
    get<ClassItem[]>("/teacher/classes")
      .then((d) => {
        setData(d);
        setAuthError(null);
      })
      .catch((e) => {
        const msg = String((e as Error).message || e);
        const status = getErrorStatus(msg);
        if (status === 401 || status === 403) {
          applyFetchError(msg, { toast403: true });
        } else {
          // For other errors (409, 422, 500), we'll handle them in individual actions
          setError(msg);
        }
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ name: "", grade: 10 });
    setFieldErrors({});
    setEditingClass(null);
    setShowForm(false);
  };

  const handleEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setForm({ name: cls.name, grade: cls.grade });
    setFieldErrors({});
    setShowForm(true);
  };

  const handleViewStudents = async (cls: ClassItem) => {
    setSelectedClass(cls);
    try {
      const students = await get<ClassStudent[]>(`/teacher/classes/${cls.id}/students`);
      setClassStudents(students);
      setShowStudents(true);
    } catch (e) {
      applyFetchError(String((e as Error).message || e));
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedClass) return;
    if (!window.confirm("Bỏ học sinh này khỏi lớp?")) return;
    try {
      await post(`/teacher/classes/${selectedClass.id}/students/${studentId}/remove`, {});
      showToast("success", "Đã bỏ học sinh khỏi lớp");
      // Refresh danh sách học sinh
      const students = await get<ClassStudent[]>(`/teacher/classes/${selectedClass.id}/students`);
      setClassStudents(students);
      // Refresh danh sách lớp
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      applyActionError(message, message);
    }
  };

  const createOrUpdate = async () => {
    if (!validateForm()) return;
    setError("");
    setSubmitting(true);
    try {
      if (editingClass) {
        await put(`/teacher/classes/${editingClass.id}`, { name: form.name, grade: form.grade });
        showToast("success", "Cập nhật lớp thành công");
      } else {
        await post("/teacher/classes", { name: form.name, grade: form.grade });
        showToast("success", "Tạo lớp thành công");
      }
      resetForm();
      load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const status = getErrorStatus(message);
      if (status === 401 || status === 403) {
        applyActionError(message, message);
      } else if (message.includes("409") || message.includes("đã tồn tại")) {
        showToast("error", "Tên lớp đã tồn tại");
      } else if (message.includes("422") || message.includes("Khối") || message.includes("phạm vi")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cls: ClassItem) => {
    if (!window.confirm(`Xóa lớp "${cls.name}"?`)) return;
    setError("");
    try {
      await del(`/teacher/classes/${cls.id}`);
      showToast("success", "Xóa lớp thành công");
      load();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const status = getErrorStatus(message);
      if (status === 401 || status === 403) {
        applyActionError(message, message);
      } else if (message.includes("409") || message.includes("còn") || message.includes("học sinh")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    }
  };

  // 401/403 → banner riêng với nút đăng nhập (authError), KHÔNG rơi vào ErrorBox trắng
  // và KHÔNG kẹt <Loading />. Lỗi hệ thống (500, 409, 422…) → ErrorBox như cũ.
  const isAuthError = authError !== null;

  if (error) return <ErrorBox message={error} />;
  if (!data && !isAuthError) return <Loading />;

  return (
    <div>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
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

      {isAuthError && authError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2 flex-wrap" role="alert">
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-[200px]">{authError.message}</span>
          <button
            type="button"
            onClick={() => { window.location.href = "/login"; }}
            className="inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-white border border-line text-ink font-semibold hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
          >
            <LogIn size={14} aria-hidden="true" /> {authError.status === 401 ? "Đăng nhập lại" : "Về trang đăng nhập"}
          </button>
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3" style={{ animation: "fadeUp 0.6s ease-out both" }}>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Quản lý lớp chủ nhiệm</h1>
          <p className="mt-1 text-sm text-muted">
            {data?.length ?? 0} lớp · {data?.reduce((s, c) => s + c.student_count, 0) ?? 0} học sinh
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingClass(null);
            setForm({ name: "", grade: 10 });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" /> Thêm lớp mới
        </button>
      </header>

      {showForm && (
        <div style={{ animation: "fadeUp 0.7s ease-out 0.1s both" }}>
          <Card className="mb-6 border-portal-soft hover:shadow-[0_8px_30px_rgb(51_50_77/0.05)] transition-shadow duration-200 ease-out">
          <h2 className="font-semibold text-ink mb-3" id="form-title">{editingClass ? "Chỉnh sửa lớp" : "Lớp chủ nhiệm mới"}</h2>
          <form onSubmit={(e) => { e.preventDefault(); createOrUpdate(); }} className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-labelledby="form-title">
            <div>
              <label htmlFor="class-name" className="block text-sm font-medium text-ink mb-1">
                Tên lớp <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="class-name"
                type="text"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" }); }}
                placeholder="VD: 10A1"
                className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${fieldErrors.name ? "border-red-400 focus:border-red-400" : ""}`}
                aria-required="true"
                aria-invalid={fieldErrors.name ? "true" : "false"}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                autoComplete="off"
              />
              {fieldErrors.name && <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="class-grade" className="block text-sm font-medium text-ink mb-1">
                Khối <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="class-grade"
                value={form.grade}
                onChange={(e) => { setForm({ ...form, grade: Number(e.target.value) }); if (fieldErrors.grade) setFieldErrors({ ...fieldErrors, grade: "" }); }}
                className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors w-full ${fieldErrors.grade ? "border-red-400 focus:border-red-400" : ""}`}
                aria-required="true"
                aria-invalid={fieldErrors.grade ? "true" : "false"}
                aria-describedby={fieldErrors.grade ? "grade-error" : undefined}
                disabled={meLoading}
              >
                {meLoading ? (
                  <option value="">Đang tải...</option>
                ) : me ? (
                  me.allowed_grades.map((g) => (
                    <option key={g} value={g}>
                      Khối {g}
                    </option>
                  ))
                ) : (
                  <option value="">Không có quyền truy cập</option>
                )}
              </select>
              {fieldErrors.grade && <p id="grade-error" className="mt-1 text-sm text-red-600" role="alert">{fieldErrors.grade}</p>}
              {me && editingClass && !me.allowed_grades.includes(editingClass.grade) && (
                <p className="mt-1 text-xs text-amber-600" role="alert">
                  ⚠ Khối {editingClass.grade} không nằm trong phạm vi cấp học {me.education_level} của bạn. Lưu vẫn được (backend sẽ validate).
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? "Đang lưu..." : editingClass ? "Cập nhật" : "Tạo lớp"}
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
        </div>
      )}

      {/* Modal xem học viên */}
      {showStudents && selectedClass && (
        <div
          ref={studentsDialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="students-modal-title"
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl scaleIn"
            style={{ animation: "scaleIn 0.25s ease-out both" }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 id="students-modal-title" className="font-semibold text-ink">Học sinh lớp {selectedClass.name}</h3>
              <button
                type="button"
                onClick={() => setShowStudents(false)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                aria-label="Đóng danh sách học sinh"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {classStudents.length === 0 ? (
                <p className="text-sm text-muted text-center py-8 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">Lớp chưa có học sinh nào.</p>
              ) : (
                <ul className="space-y-3" role="list" aria-label="Danh sách học sinh">
                  {classStudents.map((s) => (
                    <li key={s.id}>
                      <Card className="bg-canvas-soft/50 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ease-out">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-portal-soft flex items-center justify-center">
                              <span className="text-lg font-bold text-portal">{s.full_name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-ink">{s.full_name}</div>
                              <div className="text-xs text-muted">Khối {s.grade}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(s.id)}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-medium hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                            aria-label={`Bỏ ${s.full_name} khỏi lớp`}
                          >
                            <Users size={12} className="inline mr-1" aria-hidden="true" /> Bỏ lớp
                          </button>
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

      <section aria-labelledby="classes-list-heading">
        <h2 id="classes-list-heading" className="sr-only">Danh sách lớp chủ nhiệm</h2>
        <div style={{ animation: "fadeUp 0.7s ease-out 0.2s both" }}>
          <Card className="overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line bg-canvas-soft/60">
                <th className="px-5 py-3">Tên lớp</th>
                <th className="px-5 py-3">Khối</th>
                <th className="px-5 py-3">Số học viên</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted">
                    {isAuthError
                      ? "Không thể tải danh sách lớp. Vui lòng đăng nhập bằng tài khoản giáo viên."
                      : "Chưa có lớp chủ nhiệm nào — bấm \"Thêm lớp mới\" để bắt đầu."}
                  </td>
                </tr>
              ) : (
                data.map((c) => (
                  <tr key={c.id} className="border-b border-line hover:bg-canvas-soft/50 transition-colors duration-150">
                  <td className="px-5 py-3.5 text-sm transition-colors">
                    <span className="font-semibold text-ink">{c.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm transition-colors">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-canvas-soft text-muted font-medium">
                      Khối {c.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm transition-colors">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Users size={13} /> {c.student_count}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-right transition-colors">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewStudents(c)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-line font-medium text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                        aria-label={`Xem học sinh lớp ${c.name}`}
                      >
                        <Eye size={14} aria-hidden="true" /> Học viên
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-line font-medium text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                        aria-label={`Sửa lớp ${c.name}`}
                      >
                        <Edit size={14} aria-hidden="true" /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-50 font-medium text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                        aria-label={`Xóa lớp ${c.name}`}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </Card>
        </div>
      </section>
    </div>
  );
}