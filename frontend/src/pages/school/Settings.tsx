import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, LogIn } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading, Badge, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface Teacher {
  id: number;
  full_name: string;
  subject: string;
  is_homeroom: boolean;
}

interface ClassGroup {
  id: number;
  name: string;
  grade: number;
  homeroom_teacher_id: number | null;
  homeroom_teacher_name: string;
  student_count: number;
}

export default function Settings() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [classGroups, setClassGroups] = useState<ClassGroup[] | null>(null);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState<{ status: number; message: string } | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [classForm, setClassForm] = useState({ name: "", grade: 10, homeroom_teacher_id: "" });
  const [classFieldErrors, setClassFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const validateClassForm = () => {
    const errors: Record<string, string> = {};
    if (!classForm.name.trim()) {
      errors.name = "Tên lớp không được để trống";
    }
    if (!classForm.grade || classForm.grade < 1 || classForm.grade > 12) {
      errors.grade = "Khối phải là số nguyên từ 1 đến 12";
    }
    setClassFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const loadTeachers = useCallback(() => {
    get<Teacher[]>("/school/teachers")
      .then((data) => {
        setTeachers(data);
        setAuthError(null);
      })
      .catch((e) => {
        const msg = String((e as Error).message || e);
        if (msg.includes("403")) {
          setAuthError({ status: 403, message: "Bạn đang xem cổng Nhà trường ở chế độ trải nghiệm. Đăng nhập bằng tài khoản nhà trường để dùng tính năng này." });
        } else if (msg.includes("401")) {
          setAuthError({ status: 401, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." });
        } else {
          setError(msg);
        }
        setTeachers([]);
      });
  }, []);

  const loadClassGroups = useCallback(() => {
    get<ClassGroup[]>("/school/class-groups")
      .then((data) => {
        setClassGroups(data);
        setAuthError(null);
      })
      .catch((e) => {
        const msg = String((e as Error).message || e);
        if (msg.includes("403")) {
          setAuthError({ status: 403, message: "Bạn đang xem cổng Nhà trường ở chế độ trải nghiệm. Đăng nhập bằng tài khoản nhà trường để dùng tính năng này." });
        } else if (msg.includes("401")) {
          setAuthError({ status: 401, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." });
        } else {
          setError(msg);
        }
        setClassGroups([]);
      });
  }, []);

  useEffect(() => {
    loadTeachers();
    loadClassGroups();
  }, [loadTeachers, loadClassGroups]);

  const resetClassForm = () => {
    setClassForm({ name: "", grade: 10, homeroom_teacher_id: "" });
    setClassFieldErrors({});
    setEditingClass(null);
    setShowClassForm(false);
  };

  const handleEditClass = (cg: ClassGroup) => {
    setEditingClass(cg);
    setClassForm({
      name: cg.name,
      grade: cg.grade,
      homeroom_teacher_id: cg.homeroom_teacher_id ? String(cg.homeroom_teacher_id) : "",
    });
    setClassFieldErrors({});
    setShowClassForm(true);
  };

  const createOrUpdateClass = async () => {
    if (!validateClassForm()) return;
    setError("");
    setSubmitting(true);
    try {
      if (editingClass) {
        await put(`/school/class-groups/${editingClass.id}`, {
          name: classForm.name,
          grade: classForm.grade,
          homeroom_teacher_id: classForm.homeroom_teacher_id ? Number(classForm.homeroom_teacher_id) : null,
        });
        showToast("success", "Cập nhật lớp học thành công");
      } else {
        await post("/school/class-groups", {
          name: classForm.name,
          grade: classForm.grade,
          homeroom_teacher_id: classForm.homeroom_teacher_id ? Number(classForm.homeroom_teacher_id) : null,
        });
        showToast("success", "Tạo lớp học thành công");
      }
      resetClassForm();
      loadClassGroups();
      loadTeachers(); // Refresh teachers để cập nhật is_homeroom
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("409") || message.includes("đã tồn tại") || message.includes("học sinh")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (cg: ClassGroup) => {
    if (!window.confirm(`Xóa lớp "${cg.name}"? ${cg.student_count > 0 ? `Lớp còn ${cg.student_count} học sinh — sẽ bị từ chối.` : ""}`)) return;
    setError("");
    try {
      await del(`/school/class-groups/${cg.id}`);
      showToast("success", "Xóa lớp học thành công");
      loadClassGroups();
      loadTeachers();
    } catch (e) {
      const message = String((e as Error).message || e);
      if (message.includes("409") || message.includes("học sinh")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    }
  };

  if (error) return <ErrorBox message={error} />;

  // 401/403 kèm dữ liệu rỗng hoặc chưa tải được: chỉ hiện thông báo + nút đăng nhập,
  // không render bảng rỗng (tránh gợi ý sai "chưa có dữ liệu" và nút bấm chắc chắn lỗi).
  if (authError && teachers?.length === 0 && classGroups?.length === 0) {
    return (
      <div>
        <PageHeader
          title="Cài đặt nhà trường"
          subtitle="Quản lý giáo viên, lớp học và phân công GVCN"
        />
        <div
          className="p-4 rounded-xl bg-amber-50 border border-amber-200"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">{authError.message}</p>
              <button
                type="button"
                onClick={() => { window.location.href = "/login"; }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-white border border-line text-ink font-semibold hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                <LogIn size={14} aria-hidden="true" /> Về trang đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teachers || !classGroups) return <Loading />;

  // Client-side: tính số lớp mỗi GV đang chủ nhiệm (từ classGroups đã tải)
  const homeroomCounts = new Map<number, number>();
  classGroups.forEach((cg) => {
    if (cg.homeroom_teacher_id) {
      homeroomCounts.set(cg.homeroom_teacher_id, (homeroomCounts.get(cg.homeroom_teacher_id) || 0) + 1);
    }
  });

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
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-up ${
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

      {/* Auth error banner (403/401) */}
      {authError && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">{authError.message}</p>
              <div className="mt-2 flex gap-2">
                {authError.status === 401 && (
                  <button
                    type="button"
                    onClick={() => window.location.href = "/login"}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-portal text-white font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                  >
                    <LogIn size={14} aria-hidden="true" /> Đăng nhập
                  </button>
                )}
                {authError.status === 403 && (
                  <button
                    type="button"
                    onClick={() => window.location.href = "/login"}
                    className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-white border border-line text-ink font-semibold hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                  >
                    <LogIn size={14} aria-hidden="true" /> Về trang đăng nhập
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Danh sách giáo viên */}
      <section style={{ animation: "fadeUp 0.6s ease-out both" }}>
        <PageHeader title="Danh sách giáo viên" subtitle="Phân công GVCN qua form tạo/sửa lớp bên dưới. Trạng thái Chủ nhiệm bên dưới suy ra từ phân công thực tế." />
        <Card>
          {teachers.length === 0 ? (
            <p className="text-sm text-muted text-center py-8 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">Chưa có giáo viên nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
                    <th className="pb-3 pr-4">Tên</th>
                    <th className="pb-3 pr-4">Môn dạy</th>
                    <th className="pb-3 pr-4">Chủ nhiệm</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => {
                    const classCount = homeroomCounts.get(t.id) || 0;
                    return (
                      <tr key={t.id} className="border-b border-line/50 hover:bg-canvas-soft/50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-ink">{t.full_name}</td>
                        <td className="py-3 pr-4 text-muted">{t.subject || "—"}</td>
                        <td className="py-3 pr-4">
                          <Badge tone={t.is_homeroom ? "emerald" : "slate"}>
                            {t.is_homeroom
                              ? classCount > 1
                                ? `Đang chủ nhiệm ${classCount} lớp`
                                : "Đang chủ nhiệm 1 lớp"
                              : "Chưa làm GVCN"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Section 2: Quản lý lớp học & phân công */}
      <section style={{ animation: "fadeUp 0.6s ease-out 0.1s both" }} className="mt-8">
        <PageHeader title="Quản lý lớp học & phân công" subtitle="Tạo, sửa, xóa lớp học và phân công GVCN" actions={
          <button
            type="button"
            onClick={() => {
              setEditingClass(null);
              setClassForm({ name: "", grade: 10, homeroom_teacher_id: "" });
              setShowClassForm(!showClassForm);
            }}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" /> Thêm lớp mới
          </button>
        } />
        
        {showClassForm && (
          <div style={{ animation: "fadeUp 0.7s ease-out 0.2s both" }}>
            <Card className="mb-6 border-portal-soft hover:shadow-[0_8px_30px_rgb(51_50_77/0.05)] transition-shadow duration-200 ease-out">
              <h2 className="font-semibold text-ink mb-3" id="class-form-title">{editingClass ? "Chỉnh sửa lớp học" : "Tạo lớp học mới"}</h2>
              <form onSubmit={(e) => { e.preventDefault(); createOrUpdateClass(); }} className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-labelledby="class-form-title">
                <div>
                  <label htmlFor="class-name" className="block text-sm font-medium text-ink mb-1">
                    Tên lớp <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="class-name"
                    type="text"
                    value={classForm.name}
                    onChange={(e) => { setClassForm({ ...classForm, name: e.target.value }); if (classFieldErrors.name) setClassFieldErrors({ ...classFieldErrors, name: "" }); }}
                    placeholder="VD: 10A3"
                    className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${classFieldErrors.name ? "border-red-400 focus:border-red-400" : ""}`}
                    aria-required="true"
                    aria-invalid={classFieldErrors.name ? "true" : "false"}
                    aria-describedby={classFieldErrors.name ? "name-error" : undefined}
                    autoComplete="off"
                  />
                  {classFieldErrors.name && <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">{classFieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="class-grade" className="block text-sm font-medium text-ink mb-1">
                    Khối <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="class-grade"
                    value={classForm.grade}
                    onChange={(e) => { setClassForm({ ...classForm, grade: Number(e.target.value) }); if (classFieldErrors.grade) setClassFieldErrors({ ...classFieldErrors, grade: "" }); }}
                    className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${classFieldErrors.grade ? "border-red-400 focus:border-red-400" : ""}`}
                    aria-required="true"
                    aria-invalid={classFieldErrors.grade ? "true" : "false"}
                    aria-describedby={classFieldErrors.grade ? "grade-error" : undefined}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                  {classFieldErrors.grade && <p id="grade-error" className="mt-1 text-sm text-red-600" role="alert">{classFieldErrors.grade}</p>}
                </div>
                <div>
                  <label htmlFor="class-homeroom" className="block text-sm font-medium text-ink mb-1">
                    Giáo viên chủ nhiệm
                  </label>
                  <select
                    id="class-homeroom"
                    value={classForm.homeroom_teacher_id}
                    onChange={(e) => setClassForm({ ...classForm, homeroom_teacher_id: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full"
                    autoComplete="off"
                  >
                    <option value="">— Không phân công —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={String(t.id)}>{t.full_name} — {t.subject || "Chưa có môn"}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                  >
                    {submitting ? "Đang lưu..." : editingClass ? "Cập nhật" : "Tạo lớp"}
                  </button>
                  <button
                    type="button"
                    onClick={resetClassForm}
                    className="text-sm px-4 py-2 rounded-xl bg-canvas-soft text-muted hover:bg-canvas-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </Card>
          </div>
        )}

        <Card>
          {classGroups.length === 0 ? (
            <p className="text-sm text-muted text-center py-8 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">Chưa có lớp học nào — bấm "Thêm lớp mới".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
                    <th className="pb-3 pr-4">Tên lớp</th>
                    <th className="pb-3 pr-4">Khối</th>
                    <th className="pb-3 pr-4">GVCN</th>
                    <th className="pb-3 pr-4">Số học viên</th>
                    <th className="pb-3 pr-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {classGroups.map((cg) => (
                    <tr key={cg.id} className="border-b border-line/50 hover:bg-canvas-soft/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-ink">{cg.name}</td>
                      <td className="py-3 pr-4 text-muted">Khối {cg.grade}</td>
                      <td className="py-3 pr-4">
                        {cg.homeroom_teacher_name && cg.homeroom_teacher_name !== "—" ? (
                          <span className="font-medium text-ink">{cg.homeroom_teacher_name}</span>
                        ) : (
                          <span className="text-muted">— Chưa phân công —</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted">{cg.student_count}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`Hành động cho lớp ${cg.name}`}>
                          <button
                            type="button"
                            onClick={() => handleEditClass(cg)}
                            className="text-xs px-3 py-1.5 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                          >
                            <Edit size={12} className="inline mr-1" aria-hidden="true" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClass(cg)}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-50 font-semibold text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                          >
                            <Trash2 size={12} className="inline mr-1" aria-hidden="true" /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}