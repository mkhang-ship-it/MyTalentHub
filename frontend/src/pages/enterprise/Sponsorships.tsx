import { useCallback, useEffect, useState, useRef } from "react";
import { HandCoins, Rocket, Filter, X, Edit, Trash2, DollarSign, AlertCircle, CheckCircle, Search } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";
import SponsorProjectCard, { dinhDangTien, tinhPhanTram } from "../../components/SponsorProjectCard";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface Sponsorship {
  sponsorship_id: number;
  project_id: number;
  project_title: string;
  field: string;
  amount: number;
  conditions: string | null;
  status: string;
  created_at: string;
}

interface Project {
  id: number;
  title: string;
  field: string;
  description: string | null;
  status: string;
  owner_name: string;
  member_count: number;
  sponsored_total: number;
  funding_goal: number;
}

const FIELD_NAMES: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

// Nhãn tiếng Việt cho trạng thái dự án (value giữ nguyên để API không đổi).
const TEN_TRANG_THAI_DU_AN: Record<string, string> = {
  active: "Đang hoạt động",
  completed: "Hoàn thành",
  pending: "Đang chờ",
  archived: "Đã lưu trữ",
};

const PROJECT_STATUSES = ["active", "completed", "pending", "archived"];

export default function Sponsorships() {
  const [data, setData] = useState<Sponsorship[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState(5000000);
  const [conditions, setConditions] = useState("");
  const [error, setError] = useState("");
  const [editingSponsorship, setEditingSponsorship] = useState<Sponsorship | null>(null);
  const [filterField, setFilterField] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"create" | "edit" | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  // Trạng thái tải danh sách dự án (tách khỏi lỗi form để hiện nút thử lại trong lưới).
  const [loiDuAn, setLoiDuAn] = useState("");
  const sponsorFormRef = useRef<HTMLDivElement>(null);

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const validateSponsorForm = () => {
    const errors: string[] = [];
    if (!projectId) errors.push("Phải chọn dự án để tài trợ");
    if (amount <= 0) errors.push("Số tiền tài trợ phải lớn hơn 0");
    if (errors.length > 0) {
      showToast("error", errors[0]);
      return false;
    }
    return true;
  };

  const load = useCallback(() => {
    setError("");
    get<Sponsorship[]>("/enterprise/sponsorships").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  const loadProjects = useCallback(() => {
    setLoiDuAn("");
    const params = new URLSearchParams();
    if (filterField) params.append("field", filterField);
    if (filterStatus) params.append("status", filterStatus);
    get<Project[]>(`/enterprise/projects?${params.toString()}`)
      .then(setProjects)
      .catch(() => {
        setProjects([]);
        setLoiDuAn("Chưa tải được danh sách dự án.");
      });
  }, [filterField, filterStatus]);

  useEffect(() => {
    load();
    loadProjects();
  }, [load, loadProjects]);

  // Bẫy focus cho hộp xác nhận (giữ nguyên logic — đúng 00/4.11).
  useEffect(() => {
    if (showConfirmDialog) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const dialog = confirmDialogRef.current;
        if (dialog) {
          const focusable = dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const firstFocusable = focusable[0];
          const lastFocusable = focusable[focusable.length - 1];

          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Tab") {
              if (e.shiftKey && document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable?.focus();
              } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable?.focus();
              }
            } else if (e.key === "Escape") {
              handleCloseConfirmDialog();
            }
          };

          dialog.addEventListener("keydown", handleKeyDown);
          firstFocusable?.focus();

          return () => dialog.removeEventListener("keydown", handleKeyDown);
        }
      }, 0);
    } else {
      previouslyFocusedRef.current?.focus();
    }
  }, [showConfirmDialog]);

  // Dự án sau lọc (lưới CSS tự dàn đều, không virtualization).
  const filteredProjects = projects.filter((p) => {
    if (filterField && p.field !== filterField) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const resetForm = () => {
    setProjectId("");
    setAmount(5000000);
    setConditions("");
    setEditingSponsorship(null);
  };

  const handleEdit = (sp: Sponsorship) => {
    setEditingSponsorship(sp);
    setProjectId(String(sp.project_id));
    setAmount(sp.amount);
    setConditions(sp.conditions || "");
    sponsorFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleConfirmAction = async () => {
    if (!validateSponsorForm()) return;

    setShowConfirmDialog(false);
    setError("");
    setSubmitting(true);
    try {
      if (editingSponsorship && confirmAction === "edit") {
        await put(`/enterprise/sponsorships/${editingSponsorship.sponsorship_id}`, {
          project_id: Number(projectId),
          amount,
          conditions: conditions || null,
        });
        showToast("success", "Cập nhật tài trợ thành công");
      } else if (!editingSponsorship && confirmAction === "create") {
        await post("/enterprise/sponsorships", {
          project_id: Number(projectId),
          amount,
          conditions: conditions || null,
        });
        showToast("success", "Tạo tài trợ thành công");
      }
      resetForm();
      load();
      loadProjects();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("validation") || message.includes("Số tiền") || message.includes("dự án")) {
        showToast("error", message);
      } else {
        showToast("error", "Có lỗi xảy ra, vui lòng thử lại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseConfirmDialog = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
  };

  const handleSponsorClick = () => {
    if (!validateSponsorForm()) return;

    const selectedProject = projects.find((p) => String(p.id) === projectId);
    if (!selectedProject) {
      showToast("error", "Dự án không tồn tại");
      return;
    }

    // Nghiệp vụ: dự án đã đạt 100% mục tiêu thì không cho tài trợ thêm.
    if (tinhPhanTram(selectedProject.sponsored_total, selectedProject.funding_goal) >= 100) {
      showToast("error", "Dự án đã đạt mục tiêu, không thể tài trợ thêm");
      return;
    }

    if (editingSponsorship) {
      setConfirmAction("edit");
    } else {
      setConfirmAction("create");
    }
    setShowConfirmDialog(true);
  };

  const handleDelete = async (sp: Sponsorship) => {
    if (!window.confirm(`Xóa tài trợ cho dự án "${sp.project_title}"?`)) return;
    try {
      await del(`/enterprise/sponsorships/${sp.sponsorship_id}`);
      load();
    } catch {
      // Lỗi xóa chỉ báo bằng toast, không làm mất cả trang (đặc tả 03 A2).
      showToast("error", "Xóa tài trợ chưa thành công, bạn thử lại sau nhé.");
    }
  };

  // Khung trang dùng chung: PageHeader luôn hiện để lỗi không làm mất trang.
  const khungTrang = (noiDung: React.ReactNode) => (
    <div className="space-y-8">
      <PageHeader
        title="Tài trợ dự án"
        subtitle="Đầu tư vào các dự án sáng tạo của học sinh sinh viên."
      />
      {noiDung}
    </div>
  );

  if (error) {
    return khungTrang(
      <ErrorBox message={error} retryLabel="Thử lại" onRetry={load} />
    );
  }

  if (!data) {
    return khungTrang(
      <div aria-busy="true" aria-label="Đang tải tài trợ">
        <div className="skeleton mx-auto h-7 w-[260px] rounded" aria-hidden="true" />
        <div className="skeleton mx-auto mt-2 h-3.5 w-full rounded" aria-hidden="true" />
        <div className="skeleton mt-8 h-[104px] rounded-[20px]" aria-hidden="true" />
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div className="skeleton h-11 w-[200px] rounded-[12px]" aria-hidden="true" />
          <div className="skeleton h-11 w-[200px] rounded-[12px]" aria-hidden="true" />
          <div className="skeleton h-11 w-[120px] rounded-[12px]" aria-hidden="true" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[300px] rounded-[20px]" aria-hidden="true" />
          ))}
        </div>
        <div className="skeleton mt-8 h-[240px] rounded-[20px]" aria-hidden="true" />
        <div className="skeleton mt-8 h-[240px] rounded-[20px]" aria-hidden="true" />
        <p className="mt-4 text-center text-sm text-muted-strong">Đang tải tài trợ…</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + (d.status === "approved" ? d.amount : 0), 0);
  const tongChoDuyet = data.filter((d) => d.status !== "approved").reduce((s, d) => s + d.amount, 0);
  const selected = projects.find((p) => String(p.id) === projectId);

  // Chọn dự án từ thẻ: điền vào form tài trợ rồi cuộn tới form.
  const handleChonDuAn = (id: number) => {
    setProjectId(String(id));
    setEditingSponsorship(null);
    sponsorFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Xóa bộ lọc lưới dự án.
  const xoaBoLocDuAn = () => {
    setFilterField("");
    setFilterStatus("");
  };

  return (
    <div className="space-y-8">
      {/* Toast: nền trắng + icon màu riêng, không role từng toast (đặc tả 03 B0) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-32px)]" aria-live="polite" aria-label="Thông báo">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_32px_rgba(51,50,77,.16)] text-sm animate-slide-in"
          >
            {t.type === "success" ? (
              <CheckCircle size={18} className="shrink-0 text-[#047857]" aria-hidden="true" />
            ) : (
              <AlertCircle size={18} className="shrink-0 text-[#B91C1C]" aria-hidden="true" />
            )}
            <span className="text-sm font-bold text-ink">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Hộp xác nhận: overlay navy, panel radius 20, giữ nguyên logic focus */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(27,42,94,.45)] backdrop-blur-[8px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          ref={confirmDialogRef}
        >
          <div className="w-full max-w-md rounded-[20px] bg-white shadow-xl p-6">
            <h3 id="confirm-dialog-title" className="text-lg font-bold text-ink">
              {editingSponsorship ? "Xác nhận cập nhật tài trợ" : "Xác nhận tạo tài trợ mới"}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              {editingSponsorship
                ? `Bạn sắp cập nhật tài trợ cho dự án "${selected?.title || ""}".`
                : `Xác nhận tài trợ ${dinhDangTien(amount)} cho dự án "${selected?.title || ""}"?`}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseConfirmDialog}
                className="btn-secondary"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Đang xử lý..." : editingSponsorship ? "Cập nhật" : "Xác nhận tài trợ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Tài trợ dự án"
        subtitle="Đầu tư vào các dự án sáng tạo của học sinh sinh viên."
      />

      {/* Banner tổng: scrim bắt buộc, icon chip nền trắng (đặc tả 03 B3) */}
      <div
        className="rounded-[20px] p-5 md:p-6 text-white shadow-lg reveal-up flex items-center gap-4"
        role="region"
        aria-label="Tổng quan tài trợ"
        style={{ backgroundImage: "var(--scrim-navy), var(--hero-gradient)" }}
      >
        <span className="h-12 w-12 shrink-0 rounded-2xl bg-white text-portal-dark flex items-center justify-center" aria-hidden="true">
          <HandCoins size={22} />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-white">
            Tổng đã tài trợ
          </div>
          <div className="text-2xl font-extrabold tabular-nums leading-tight">
            {dinhDangTien(total)}
          </div>
          <div className="text-xs leading-relaxed text-white">
            {loiDuAn ? "Chưa tải được danh sách dự án." : `Chỉ tính tài trợ đã duyệt · trên ${projects.length} dự án`}
          </div>
        </div>
      </div>

      {/* Lưới dự án */}
      <section aria-labelledby="projects-heading">
        <h2 id="projects-heading" className="sr-only">Danh sách dự án kêu gọi tài trợ</h2>

        <div className="flex flex-wrap items-center gap-4 mb-4" role="search" aria-label="Bộ lọc dự án">
          <div className="relative">
            <label htmlFor="filter-field" className="sr-only">Lọc theo lĩnh vực</label>
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden="true" />
            <select
              id="filter-field"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="input-control pl-9"
            >
              <option value="">Tất cả lĩnh vực</option>
              {Object.entries(FIELD_NAMES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-control"
            >
              <option value="">Tất cả trạng thái</option>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>{TEN_TRANG_THAI_DU_AN[status] ?? status}</option>
              ))}
            </select>
          </div>
          {filterField || filterStatus ? (
            <button
              type="button"
              onClick={xoaBoLocDuAn}
              className="btn-secondary h-11 px-5"
            >
              <X size={14} aria-hidden="true" /> Bỏ lọc
            </button>
          ) : null}
        </div>

        {loiDuAn ? (
          <ErrorBox message={loiDuAn} retryLabel="Tải lại danh sách" onRetry={loadProjects} />
        ) : filteredProjects.length === 0 && projects.length > 0 ? (
          <Empty
            text="Không tìm thấy dự án phù hợp với bộ lọc."
            icon={<Search size={32} aria-hidden="true" />}
            action={
              <button type="button" onClick={xoaBoLocDuAn} className="btn-secondary h-9 px-3.5 text-[13px]">
                Bỏ lọc
              </button>
            }
          />
        ) : projects.length === 0 ? (
          <Empty
            text="Chưa có dự án nào kêu gọi tài trợ."
            icon={<Rocket size={32} aria-hidden="true" />}
          />
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch"
            role="list"
            aria-label="Danh sách dự án"
          >
            {filteredProjects.map((p) => (
              <SponsorProjectCard key={p.id} duAn={p} onChon={handleChonDuAn} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="sponsor-form-heading" id="sponsor-form" ref={sponsorFormRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 reveal-up">
        <Card className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={18} className="text-portal" aria-hidden="true" />
            <h2 id="sponsor-form-heading" className="text-[17px] md:text-lg font-bold text-ink">{editingSponsorship ? "Chỉnh sửa tài trợ" : "Tài trợ dự án mới"}</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSponsorClick(); }} className="grid grid-cols-1 md:grid-cols-4 gap-4" aria-label="Form tài trợ dự án">
            <div className="md:col-span-2">
              <label htmlFor="sponsor-project" className="block text-[13px] font-semibold text-ink-soft mb-1.5">
                Chọn dự án <span className="text-[#B91C1C]" aria-hidden="true">*</span>
              </label>
              <select
                id="sponsor-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input-control"
                aria-required="true"
                required
              >
                <option value="">Chọn dự án...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.owner_name} ({FIELD_NAMES[p.field] ?? p.field})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="sponsor-amount" className="block text-[13px] font-semibold text-ink-soft mb-1.5">
                Số tiền (VNĐ) <span className="text-[#B91C1C]" aria-hidden="true">*</span>
              </label>
              <input
                id="sponsor-amount"
                type="number"
                min={100000}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input-control"
                placeholder="VD: 5000000"
                inputMode="numeric"
                autoComplete="off"
                aria-required="true"
                required
              />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="sponsor-conditions" className="block text-[13px] font-semibold text-ink-soft mb-1.5">
                Điều kiện tài trợ (tùy chọn)
              </label>
              <input
                id="sponsor-conditions"
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="VD: Báo cáo tiến độ hàng tháng, có mặt tại buổi demo..."
                className="input-control"
                autoComplete="off"
              />
            </div>
            <div className="md:col-span-4 justify-self-end self-end">
              <button
                type="submit"
                disabled={!projectId || submitting}
                className="btn-primary"
                aria-busy={submitting}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    <span>{editingSponsorship ? "Đang cập nhật..." : "Đang tạo..."}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <HandCoins size={15} aria-hidden="true" /> {editingSponsorship ? "Cập nhật" : "Xác nhận tài trợ"}
                  </span>
                )}
              </button>
            </div>
          </form>
          {editingSponsorship && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-3 text-sm font-semibold text-ink-soft hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded"
            >
              Hủy chỉnh sửa
            </button>
          )}
          {selected && (
            <p className="mt-3 text-xs text-muted-strong" aria-live="polite">
              Chủ {selected.owner_name} · {selected.member_count} thành viên · đã nhận {dinhDangTien(selected.sponsored_total)}/{dinhDangTien(selected.funding_goal)} ({tinhPhanTram(selected.sponsored_total, selected.funding_goal)}%) · còn thiếu {dinhDangTien(Math.max(0, selected.funding_goal - selected.sponsored_total))}.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-strong">
            Số tiền hiển thị bằng VNĐ. Doanh nghiệp nhận báo cáo tiến độ dự án định kỳ 2 tháng.
          </p>
        </Card>
      </section>

      <section aria-labelledby="history-heading">
        <Card>
          <h2 id="history-heading" className="text-[17px] md:text-lg font-bold text-ink mb-1">Lịch sử tài trợ</h2>
          {data.length > 0 && (
            <p className="mb-3 text-sm leading-relaxed text-ink-soft">
              {data.length} lượt tài trợ · đã duyệt {dinhDangTien(total)} · chờ duyệt {dinhDangTien(tongChoDuyet)}.
            </p>
          )}
          {data.length === 0 ? (
            <Empty
              text="Chưa có tài trợ nào — chọn dự án và bấm “Xác nhận tài trợ” để bắt đầu."
              icon={<HandCoins size={32} aria-hidden="true" />}
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto" role="region" aria-label="Lịch sử tài trợ" tabIndex={0}>
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted-strong border-b border-line-strong">
                      <th className="px-3 py-2.5" scope="col">Dự án</th>
                      <th className="px-3 py-2.5" scope="col">Lĩnh vực</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Số tiền</th>
                      <th className="px-3 py-2.5" scope="col">Điều kiện</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Trạng thái</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Ngày</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d) => (
                      <tr key={d.sponsorship_id} className="border-b border-line min-h-[44px] hover:bg-portal-soft/40 transition-colors duration-150 ease-out">
                        <td className="px-3 py-3 text-sm font-semibold text-ink">{d.project_title}</td>
                        <td className="px-3 py-3 text-sm text-ink">{FIELD_NAMES[d.field] ?? d.field}</td>
                        <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-ink">
                          <DollarSign size={12} className="inline mr-1 text-muted-strong" aria-hidden="true" /> {dinhDangTien(d.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-strong max-w-xs truncate" title={d.conditions || "—"}>
                          {d.conditions || <span className="text-muted">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span
                            className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                              d.status === "approved" ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#FFF7ED] text-[#9A3412]"
                            }`}
                          >
                            {d.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-muted-strong">{d.created_at}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2" role="group" aria-label={`Thao tác cho tài trợ ${d.project_title}`}>
                            <button
                              type="button"
                              onClick={() => handleEdit(d)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-control text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 md:h-9 md:w-9"
                              aria-label={`Chỉnh sửa tài trợ ${d.project_title}`}
                            >
                              <Edit size={14} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(d)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 md:h-9 md:w-9"
                              aria-label={`Xóa tài trợ ${d.project_title}`}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Danh sách thẻ dọc dưới 768px (00/4.7). */}
              <div className="space-y-3 md:hidden" role="list" aria-label="Lịch sử tài trợ">
                {data.map((d) => (
                  <div key={d.sponsorship_id} role="listitem" className="rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex-1 text-sm font-semibold text-ink">{d.project_title}</span>
                      <span
                        className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${
                          d.status === "approved" ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#FFF7ED] text-[#9A3412]"
                        }`}
                      >
                        {d.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                      </span>
                    </div>
                    <dl className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Lĩnh vực</dt>
                        <dd className="text-sm font-semibold text-ink">{FIELD_NAMES[d.field] ?? d.field}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Số tiền</dt>
                        <dd className="text-sm font-bold tabular-nums text-ink">{dinhDangTien(d.amount)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Điều kiện</dt>
                        <dd className="text-sm text-ink-soft">{d.conditions || "—"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-xs font-semibold text-muted-strong">Ngày</dt>
                        <dd className="text-sm font-semibold tabular-nums text-muted-strong">{d.created_at}</dd>
                      </div>
                    </dl>
                    <div className="mt-2 flex items-center justify-end gap-8" role="group" aria-label={`Thao tác cho tài trợ ${d.project_title}`}>
                      <button
                        type="button"
                        onClick={() => handleEdit(d)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-line-control text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                        aria-label={`Chỉnh sửa tài trợ ${d.project_title}`}
                      >
                        <Edit size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#FEF2F2] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                        aria-label={`Xóa tài trợ ${d.project_title}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
