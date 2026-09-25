import { useCallback, useEffect, useState } from "react";
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, Info, LogIn, Users, Download, Upload } from "lucide-react";
import { API_BASE, get, getToken, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading, Badge, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface ImportErrorItem {
  line: number;
  message: string;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportErrorItem[];
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

interface Coach {
  id: number;
  full_name: string;
  specialty: string;
  group_count: number;
}

interface StudyGroup {
  id: number;
  name: string;
  field: string | null;
  grade: number | null;
  coach_id: number | null;
  coach_name: string | null;
  member_count: number;
  member_ids?: number[];
  avg_talent_score: number;
  total_hours: number;
  avg_experience_hours: number;
  class_names: string[];
}

interface StudentOption {
  id: number;
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  experience_hours: number;
}

export default function Settings() {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [classGroups, setClassGroups] = useState<ClassGroup[] | null>(null);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[] | null>(null);
  const [coaches, setCoaches] = useState<Coach[] | null>(null);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState<{ status: number; message: string } | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [classForm, setClassForm] = useState({ name: "", grade: 10, homeroom_teacher_id: "" });
  const [classFieldErrors, setClassFieldErrors] = useState<Record<string, string>>({});
  const [showStudyGroupForm, setShowStudyGroupForm] = useState(false);
  const [editingStudyGroup, setEditingStudyGroup] = useState<StudyGroup | null>(null);
  const [studyGroupForm, setStudyGroupForm] = useState({ name: "", field: "", grade: "", coach_id: "" });
  const [studyGroupFieldErrors, setStudyGroupFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [memberModal, setMemberModal] = useState<{ group: StudyGroup; selected: number[] } | null>(null);
  const [studentOptions, setStudentOptions] = useState<StudentOption[] | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  // ===== NHẬP DỮ LIỆU CSV (G5) =====
  const [csvContent, setCsvContent] = useState("");
  const [csvDryRun, setCsvDryRun] = useState<ImportResult | null>(null);
  const [csvSummary, setCsvSummary] = useState<ImportResult | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);

  const showToast = (type: "success" | "error" | "info", message: string) => {
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

  const loadStudyGroups = useCallback(() => {
    get<StudyGroup[]>("/school/study-groups")
      .then((data) => {
        setStudyGroups(data);
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
        setStudyGroups([]);
      });
  }, []);

  const loadCoaches = useCallback(() => {
    get<Coach[]>("/school/coaches")
      .then((data) => {
        setCoaches(data);
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
        setCoaches([]);
      });
  }, []);

  useEffect(() => {
    loadTeachers();
    loadClassGroups();
    loadStudyGroups();
    loadCoaches();
  }, [loadTeachers, loadClassGroups, loadStudyGroups, loadCoaches]);

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

  // ===== STUDY GROUP HANDLERS =====
  const validateStudyGroupForm = () => {
    const errors: Record<string, string> = {};
    if (!studyGroupForm.name.trim()) {
      errors.name = "Tên nhóm không được để trống";
    }
    if (studyGroupForm.grade !== "" && (isNaN(Number(studyGroupForm.grade)) || Number(studyGroupForm.grade) < 1 || Number(studyGroupForm.grade) > 12)) {
      errors.grade = "Khối phải là số nguyên từ 1 đến 12";
    }
    setStudyGroupFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetStudyGroupForm = () => {
    setStudyGroupForm({ name: "", field: "", grade: "", coach_id: "" });
    setStudyGroupFieldErrors({});
    setEditingStudyGroup(null);
    setShowStudyGroupForm(false);
  };

  const handleEditStudyGroup = (sg: StudyGroup) => {
    setEditingStudyGroup(sg);
    setStudyGroupForm({
      name: sg.name,
      field: sg.field || "",
      grade: sg.grade ? String(sg.grade) : "",
      coach_id: sg.coach_id ? String(sg.coach_id) : "",
    });
    setStudyGroupFieldErrors({});
    setShowStudyGroupForm(true);
  };

  const createOrUpdateStudyGroup = async () => {
    if (!validateStudyGroupForm()) return;
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        name: studyGroupForm.name,
        field: studyGroupForm.field || null,
        grade: studyGroupForm.grade ? Number(studyGroupForm.grade) : null,
        coach_id: studyGroupForm.coach_id ? Number(studyGroupForm.coach_id) : null,
      };
      if (editingStudyGroup) {
        await put(`/school/study-groups/${editingStudyGroup.id}`, payload);
        showToast("success", "Cập nhật nhóm học tập thành công");
      } else {
        await post("/school/study-groups", payload);
        showToast("success", "Tạo nhóm học tập thành công");
      }
      resetStudyGroupForm();
      loadStudyGroups();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("409") || message.includes("đã tồn tại")) {
        showToast("error", message);
      } else if (message.includes("400")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStudyGroup = async (sg: StudyGroup) => {
    if (!window.confirm(`Xóa nhóm "${sg.name}"?`)) return;
    setError("");
    try {
      await del(`/school/study-groups/${sg.id}`);
      showToast("success", "Xóa nhóm học tập thành công");
      loadStudyGroups();
    } catch (e) {
      const message = String((e as Error).message || e);
      if (message.includes("404")) {
        showToast("error", "Nhóm không tồn tại");
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    }
  };

  // ===== MEMBER MANAGEMENT =====
  const openMemberModal = async (sg: StudyGroup) => {
    setMemberQuery("");
    setMemberModal({ group: sg, selected: sg.member_ids ?? [] });
    if (studentOptions) return;
    try {
      const rows = await get<StudentOption[]>("/school/reports?type=students");
      setStudentOptions(rows);
    } catch (e) {
      showToast("error", String((e as Error).message || e));
      setMemberModal(null);
    }
  };

  const toggleMember = (id: number) => {
    setMemberModal((prev) =>
      prev
        ? {
            ...prev,
            selected: prev.selected.includes(id)
              ? prev.selected.filter((x) => x !== id)
              : [...prev.selected, id],
          }
        : prev
    );
  };

  const saveMembers = async () => {
    if (!memberModal) return;
    setSubmitting(true);
    try {
      await put(`/school/study-groups/${memberModal.group.id}/members`, {
        student_ids: memberModal.selected,
      });
      showToast("success", `Đã cập nhật ${memberModal.selected.length} thành viên cho nhóm ${memberModal.group.name}`);
      setMemberModal(null);
      loadStudyGroups();
    } catch (e) {
      showToast("error", String((e as Error).message || e));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== NHẬP DỮ LIỆU CSV (G5) =====
  const getErrorStatus = (e: unknown): number | null => {
    const msg = String((e as Error)?.message || e);
    const m = /→\s*(\d{3}):/.exec(msg);
    return m ? Number(m[1]) : null;
  };

  const getErrorDetail = (e: unknown): string | null => {
    const msg = String((e as Error)?.message || e);
    const m = /"detail"\s*:\s*"([^"]*)"/.exec(msg);
    return m ? m[1] : null;
  };

  /** Tải file CSV mẫu từ GET /school/import/template */
  const downloadTemplate = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/school/import/template`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Tải file mẫu thất bại (HTTP ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-nhap-hoc-sinh.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("success", "Đã tải file mẫu CSV");
    } catch (e) {
      showToast("error", String((e as Error).message || e));
    }
  };

  /** Gọi POST /school/import/students (dry_run=true → kiểm tra, false → ghi thật) */
  const runCsvImport = async (dryRun: boolean) => {
    if (!csvContent.trim()) {
      showToast("error", "Vui lòng dán nội dung CSV vào ô bên dưới trước khi thao tác");
      return;
    }
    setCsvBusy(true);
    try {
      const res = await post<ImportResult>(`/school/import/students?dry_run=${dryRun}`, {
        content: csvContent,
      });
      if (dryRun) {
        setCsvDryRun(res);
        setCsvSummary(null);
        if (res.errors.length === 0) {
          showToast(
            "success",
            `Kiểm tra đạt: ${res.created} hồ sơ sẽ được tạo mới, ${res.updated} cập nhật, ${res.skipped} bỏ qua`
          );
        } else {
          showToast("error", `Phát hiện ${res.errors.length} lỗi — xem bảng chi tiết bên dưới`);
        }
      } else {
        setCsvSummary(res);
        setCsvDryRun(null);
        setStudentOptions(null); // nạp lại danh sách học sinh cho modal thành viên
        showToast(
          "success",
          `Nhập hoàn tất: tạo mới ${res.created}, cập nhật ${res.updated}, bỏ qua ${res.skipped}`
        );
      }
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 403) {
        setAuthError({
          status: 403,
          message:
            "Bạn đang xem cổng Nhà trường ở chế độ trải nghiệm. Đăng nhập bằng tài khoản nhà trường để dùng tính năng này.",
        });
        showToast("error", "Chỉ tài khoản nhà trường mới được nhập dữ liệu");
      } else if (status === 401) {
        setAuthError({
          status: 401,
          message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
        });
        showToast("error", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
      } else if (status === 400) {
        showToast("error", getErrorDetail(e) || "Dữ liệu CSV không hợp lệ — vui lòng kiểm tra lại");
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setCsvBusy(false);
    }
  };

  const resetCsv = () => {
    setCsvContent("");
    setCsvDryRun(null);
    setCsvSummary(null);
  };

  const filteredStudents = (studentOptions ?? []).filter((s) => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.class_name || "").toLowerCase().includes(q)
    );
  });

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

  if (!teachers || !classGroups || studyGroups === null || coaches === null) return <Loading />;

  // Client-side: tính số lớp mỗi GV đang chủ nhiệm (từ classGroups đã tải)
  const homeroomCounts = new Map<number, number>();
  classGroups.forEach((cg) => {
    if (cg.homeroom_teacher_id) {
      homeroomCounts.set(cg.homeroom_teacher_id, (homeroomCounts.get(cg.homeroom_teacher_id) || 0) + 1);
    }
  });

  const FIELD_LABELS: Record<string, string> = {
    nghe_thuat: "Nghệ thuật",
    the_thao: "Thể thao",
    kinh_doanh: "Kinh doanh",
    ky_thuat: "Kỹ thuật",
    hoc_thuat: "Học thuật",
    sang_tao: "Sáng tạo",
  };

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
              t.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : t.type === "info"
                  ? "bg-sky-50 text-sky-700 border border-sky-100"
                  : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle size={18} className="shrink-0" aria-hidden="true" />
            ) : t.type === "info" ? (
              <Info size={18} className="shrink-0" aria-hidden="true" />
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

      {/* Section 3: Nhóm học tập & gộp chỉ số */}
      <section style={{ animation: "fadeUp 0.6s ease-out 0.2s both" }} className="mt-8">
        <PageHeader title="Nhóm học tập & gộp chỉ số" subtitle="Tạo nhóm, gán thành viên, cộng số chỉ số năng lực toàn học sinh" actions={
          <button
            type="button"
            onClick={() => {
              setEditingStudyGroup(null);
              setStudyGroupForm({ name: "", field: "", grade: "", coach_id: "" });
              setShowStudyGroupForm(!showStudyGroupForm);
            }}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" /> Thêm nhóm mới
          </button>
        } />
        
        {showStudyGroupForm && (
          <div style={{ animation: "fadeUp 0.7s ease-out 0.3s both" }}>
            <Card className="mb-6 border-portal-soft hover:shadow-[0_8px_30px_rgb(51_50_77/0.05)] transition-shadow duration-200 ease-out">
              <h2 className="font-semibold text-ink mb-3" id="study-group-form-title">{editingStudyGroup ? "Chỉnh sửa nhóm học tập" : "Tạo nhóm học tập mới"}</h2>
              <form onSubmit={(e) => { e.preventDefault(); createOrUpdateStudyGroup(); }} className="grid grid-cols-1 md:grid-cols-4 gap-3" aria-labelledby="study-group-form-title">
                <div>
                  <label htmlFor="sg-name" className="block text-sm font-medium text-ink mb-1">
                    Tên nhóm <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="sg-name"
                    type="text"
                    value={studyGroupForm.name}
                    onChange={(e) => { setStudyGroupForm({ ...studyGroupForm, name: e.target.value }); if (studyGroupFieldErrors.name) setStudyGroupFieldErrors({ ...studyGroupFieldErrors, name: "" }); }}
                    placeholder="VD: Maker Space"
                    className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors ${studyGroupFieldErrors.name ? "border-red-400 focus:border-red-400" : ""}`}
                    aria-required="true"
                    aria-invalid={studyGroupFieldErrors.name ? "true" : "false"}
                    aria-describedby={studyGroupFieldErrors.name ? "sg-name-error" : undefined}
                    autoComplete="off"
                  />
                  {studyGroupFieldErrors.name && <p id="sg-name-error" className="mt-1 text-sm text-red-600" role="alert">{studyGroupFieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="sg-field" className="block text-sm font-medium text-ink mb-1">
                    Lĩnh vực
                  </label>
                  <select
                    id="sg-field"
                    value={studyGroupForm.field}
                    onChange={(e) => { setStudyGroupForm({ ...studyGroupForm, field: e.target.value }); }}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full"
                    autoComplete="off"
                  >
                    <option value="">— Chọn lĩnh vực —</option>
                    {Object.entries(FIELD_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sg-grade" className="block text-sm font-medium text-ink mb-1">
                    Khối
                  </label>
                  <select
                    id="sg-grade"
                    value={studyGroupForm.grade}
                    onChange={(e) => { setStudyGroupForm({ ...studyGroupForm, grade: e.target.value }); if (studyGroupFieldErrors.grade) setStudyGroupFieldErrors({ ...studyGroupFieldErrors, grade: "" }); }}
                    className={`px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full ${studyGroupFieldErrors.grade ? "border-red-400 focus:border-red-400" : ""}`}
                    autoComplete="off"
                  >
                    <option value="">— Chọn khối —</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                      <option key={g} value={g}>Khối {g}</option>
                    ))}
                  </select>
                  {studyGroupFieldErrors.grade && <p id="sg-grade-error" className="mt-1 text-sm text-red-600" role="alert">{studyGroupFieldErrors.grade}</p>}
                </div>
                <div>
                  <label htmlFor="sg-coach" className="block text-sm font-medium text-ink mb-1">
                    Huấn luyện viên phụ trách
                  </label>
                  <select
                    id="sg-coach"
                    value={studyGroupForm.coach_id}
                    onChange={(e) => setStudyGroupForm({ ...studyGroupForm, coach_id: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full"
                    autoComplete="off"
                  >
                    <option value="">— Không phân công —</option>
                    {coaches?.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.full_name} — {c.specialty || "Chưa có chuyên môn"}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                  >
                    {submitting ? "Đang lưu..." : editingStudyGroup ? "Cập nhật" : "Tạo nhóm"}
                  </button>
                  <button
                    type="button"
                    onClick={resetStudyGroupForm}
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
          {studyGroups?.length === 0 ? (
            <p className="text-sm text-muted text-center py-8 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">Chưa có nhóm học tập nào — bấm "Thêm nhóm mới".</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
                    <th className="pb-3 pr-4">Tên</th>
                    <th className="pb-3 pr-4">Lĩnh vực</th>
                    <th className="pb-3 pr-4">Khối</th>
                    <th className="pb-3 pr-4">HLV phụ trách</th>
                    <th className="pb-3 pr-4">Số TV</th>
                    <th className="pb-3 pr-4">Điểm TB</th>
                    <th className="pb-3 pr-4">Tổng giờ</th>
                    <th className="pb-3 pr-4">Lớp có mặt</th>
                    <th className="pb-3 pr-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {studyGroups?.map((sg) => (
                    <tr key={sg.id} className="border-b border-line/50 hover:bg-canvas-soft/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-ink">{sg.name}</td>
                      <td className="py-3 pr-4 text-muted">{sg.field ? FIELD_LABELS[sg.field] : "—"}</td>
                      <td className="py-3 pr-4 text-muted">{sg.grade ? `Khối ${sg.grade}` : "—"}</td>
                      <td className="py-3 pr-4">
                        {sg.coach_name ? (
                          <span className="font-medium text-ink">{sg.coach_name}</span>
                        ) : (
                          <span className="text-muted">— Chưa phân công —</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted">{sg.member_count}</td>
                      <td className="py-3 pr-4 text-muted">{sg.avg_talent_score}</td>
                      <td className="py-3 pr-4 text-muted">{sg.total_hours}h</td>
                      <td className="py-3 pr-4 text-muted">{sg.class_names.join(", ") || "—"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2" role="group" aria-label={`Hành động cho nhóm ${sg.name}`}>
                          <button
                            type="button"
                            onClick={() => handleEditStudyGroup(sg)}
                            className="text-xs px-3 py-1.5 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                          >
                            <Edit size={12} className="inline mr-1" aria-hidden="true" /> Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => openMemberModal(sg)}
                            className="text-xs px-3 py-1.5 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
                          >
                            <Users size={12} className="inline mr-1" aria-hidden="true" /> Thành viên
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudyGroup(sg)}
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

      {/* Section 4: Nhập dữ liệu học sinh từ CSV (G5) */}
      <section style={{ animation: "fadeUp 0.6s ease-out 0.3s both" }} className="mt-8">
        <PageHeader
          title="Nhập dữ liệu học sinh"
          subtitle="Nhập hàng loạt từ file CSV: tải mẫu, kiểm tra trước từng dòng rồi mới nhập thật (chuyển đổi số, slide 33)."
          actions={
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border border-line text-ink font-semibold hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
            >
              <Download size={16} aria-hidden="true" /> Tải file mẫu
            </button>
          }
        />

        <Card>
          {/* Cảnh báo quan trọng */}
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2" role="note">
            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-800">
              Việc nhập sẽ <strong>cập nhật hồ sơ học sinh đã tồn tại theo email</strong> (họ tên, lớp, khối,
              điểm năng lực, giờ trải nghiệm…). Email mới sẽ được tạo tài khoản học sinh (mật khẩu mặc định{" "}
              <code className="px-1 rounded bg-white/70">demo123</code>). Hệ thống <strong>không tạo lớp mới</strong>{" "}
              từ file — hãy dùng đúng tên lớp/khối đang có.
            </p>
          </div>

          <div className="mb-3">
            <label htmlFor="csv-content" className="block text-sm font-medium text-ink mb-1">
              Nội dung CSV (dòng tiêu đề + các dòng dữ liệu){" "}
              <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id="csv-content"
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                // Nội dung đổi → kết quả kiểm tra trước đó không còn giá trị
                setCsvDryRun(null);
                setCsvSummary(null);
              }}
              rows={8}
              spellCheck={false}
              placeholder={"email,full_name,class_name,grade,talent_score,experience_hours,interests,bio\nhs01@ftalenthub.edu.vn,Nguyễn Văn A,10A1,10,75.5,20,\"IoT, Lập trình\",\"Học sinh tích cực\""}
              aria-describedby="csv-hint"
              className="w-full px-3 py-2 rounded-xl border border-line text-sm font-mono bg-white outline-none focus:border-portal focus:ring-2 focus:ring-portal/20 transition-colors resize-y"
            />
            <p id="csv-hint" className="mt-1 text-xs text-muted">
              Tối đa 200 dòng dữ liệu, 256 KB. Cột bắt buộc: <code>email</code>, <code>full_name</code>. Cột tuỳ chọn:{" "}
              <code>class_name</code>, <code>grade</code> (1–12), <code>talent_score</code> (0–100),{" "}
              <code>experience_hours</code> (≥0), <code>interests</code>, <code>bio</code>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Thao tác nhập dữ liệu">
            <button
              type="button"
              onClick={() => runCsvImport(true)}
              disabled={csvBusy}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-line text-ink font-semibold hover:bg-canvas-soft disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-colors"
            >
              <CheckCircle size={15} aria-hidden="true" /> {csvBusy ? "Đang xử lý..." : "Kiểm tra trước"}
            </button>
            <button
              type="button"
              onClick={() => runCsvImport(false)}
              disabled={csvBusy || !csvDryRun || csvDryRun.errors.length > 0 || !csvContent.trim()}
              title={
                !csvDryRun
                  ? "Hãy bấm 'Kiểm tra trước' và đảm bảo không có lỗi"
                  : csvDryRun.errors.length > 0
                    ? "Còn lỗi — không thể nhập thật"
                    : "Nhập dữ liệu vào hệ thống"
              }
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-opacity"
            >
              <Upload size={15} aria-hidden="true" /> Nhập thật
            </button>
            {(csvContent || csvDryRun || csvSummary) && (
              <button
                type="button"
                onClick={resetCsv}
                disabled={csvBusy}
                className="text-sm px-4 py-2 rounded-xl bg-canvas-soft text-muted hover:bg-canvas-soft/80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Xóa
              </button>
            )}
          </div>

          {/* Kết quả kiểm tra trước (dry-run) */}
          {csvDryRun && (
            <div className="mt-4" role={csvDryRun.errors.length > 0 ? "alert" : "status"}>
              {csvDryRun.errors.length > 0 ? (
                <>
                  <p className="text-sm font-semibold text-red-600 mb-2">
                    Phát hiện {csvDryRun.errors.length} lỗi trên {csvDryRun.total} dòng — cần sửa trước khi nhập thật:
                  </p>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-line">
                    <table className="w-full" role="table">
                      <thead>
                        <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted border-b border-line bg-canvas-soft/60">
                          <th className="py-2 px-3">Số dòng</th>
                          <th className="py-2 px-3">Thông điệp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvDryRun.errors.map((err, idx) => (
                          <tr key={`${err.line}-${idx}`} className="border-b border-line/50">
                            <td className="py-2 px-3 font-mono text-ink whitespace-nowrap">{err.line}</td>
                            <td className="py-2 px-3 text-ink">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted" role="status">
                    Tóm tắt: tạo mới {csvDryRun.created} · cập nhật {csvDryRun.updated} · bỏ qua {csvDryRun.skipped} (tổng{" "}
                    {csvDryRun.total} dòng). Chưa có thay đổi nào được ghi vào hệ thống.
                  </p>
                </>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                  <CheckCircle size={18} className="shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-emerald-800">
                    Kiểm tra đạt — không có lỗi. Tóm tắt:{" "}
                    <strong>
                      tạo mới {csvDryRun.created} · cập nhật {csvDryRun.updated} · bỏ qua {csvDryRun.skipped}
                    </strong>{" "}
                    (tổng {csvDryRun.total} dòng). Bấm <strong>“Nhập thật”</strong> để ghi vào hệ thống.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Kết quả nhập thật */}
          {csvSummary && (
            <div className="mt-4 p-4 rounded-xl bg-sky-50 border border-sky-200" role="status">
              <p className="text-sm font-semibold text-sky-800 mb-1">
                Nhập dữ liệu hoàn tất (tổng {csvSummary.total} dòng)
              </p>
              <p className="text-sm text-sky-700">
                Tạo mới: <strong>{csvSummary.created}</strong> · Cập nhật:{" "}
                <strong>{csvSummary.updated}</strong> · Bỏ qua: <strong>{csvSummary.skipped}</strong>
              </p>
              {csvSummary.skipped > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Có dòng bị bỏ qua — bấm “Kiểm tra trước” lại để xem chi tiết lỗi theo dòng.
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                Danh sách học sinh ở trang này được nạp lại tự nhiên ở lần mở tiếp theo (modal “Thành viên”).
              </p>
            </div>
          )}
        </Card>
      </section>

      {/* Modal gán thành viên cho nhóm học tập */}
      {memberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
        >
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl" style={{ animation: "scaleIn 0.25s ease-out both" }}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h3 id="member-modal-title" className="font-semibold text-ink">
                  Thành viên nhóm {memberModal.group.name}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Đã chọn {memberModal.selected.length} học sinh
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberModal(null)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                aria-label="Đóng"
              >
                <LogIn size={18} className="rotate-90" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 pt-4">
              <input
                type="search"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc lớp…"
                aria-label="Tìm học sinh"
                className="w-full px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal transition-colors"
              />
            </div>

            <div className="p-5 overflow-y-auto max-h-[52vh]">
              {!studentOptions ? (
                <p className="text-sm text-muted text-center py-6" role="status">Đang tải danh sách học sinh…</p>
              ) : filteredStudents.length === 0 ? (
                <p className="text-sm text-muted text-center py-6 rounded-xl border border-dashed border-line-strong bg-canvas-soft/40" role="status">
                  Không có học sinh phù hợp.
                </p>
              ) : (
                <ul className="space-y-1" role="listbox" aria-multiselectable="true" aria-label="Danh sách học sinh">
                  {filteredStudents.map((s) => {
                    const checked = memberModal.selected.includes(s.id);
                    return (
                      <li key={s.id}>
                        <label className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-canvas-soft cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(s.id)}
                            className="h-4 w-4 rounded border-line accent-[var(--portal)]"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-ink truncate">{s.full_name}</span>
                            <span className="block text-xs text-muted">
                              {s.class_name || "Chưa vào lớp"} · Khối {s.grade} · {s.talent_score}đ · {s.experience_hours}h
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => setMemberModal(null)}
                className="text-sm px-4 py-2 rounded-xl bg-canvas-soft text-muted hover:bg-canvas-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={saveMembers}
                disabled={submitting}
                className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? "Đang lưu..." : "Lưu thành viên"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}