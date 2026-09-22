import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { HandCoins, Rocket, Filter, X, Edit, Trash2, DollarSign, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { get, post, put, del } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

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

const PROJECT_STATUSES = ["active", "completed", "pending", "archived"];

// Virtualization threshold
const VIRTUALIZATION_THRESHOLD = 50;
const ITEM_HEIGHT = 320; // approximate height of a project card in pixels

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
  const sponsorFormRef = useRef<HTMLDivElement>(null);

  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const projectListRef = useRef<HTMLDivElement>(null);

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
    get<Sponsorship[]>("/enterprise/sponsorships").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  const loadProjects = useCallback(() => {
    const params = new URLSearchParams();
    if (filterField) params.append("field", filterField);
    if (filterStatus) params.append("status", filterStatus);
    get<Project[]>(`/enterprise/projects?${params.toString()}`)
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [filterField, filterStatus]);

  useEffect(() => {
    load();
    loadProjects();
  }, [load, loadProjects]);

  // Focus trap for confirm dialog
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

  // Filtered projects (used for virtualization)
  const filteredProjects = projects.filter((p) => {
    if (filterField && p.field !== filterField) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate visible items for virtualization
  const visibleProjects = useMemo(() => {
    if (filteredProjects.length <= VIRTUALIZATION_THRESHOLD) {
      return { items: filteredProjects, startIndex: 0, totalHeight: 0, offsetY: 0 };
    }
    
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT));
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + 2;
    const endIndex = Math.min(filteredProjects.length, startIndex + visibleCount);
    
    return {
      items: filteredProjects.slice(startIndex, endIndex),
      startIndex,
      totalHeight: filteredProjects.length * ITEM_HEIGHT,
      offsetY: startIndex * ITEM_HEIGHT,
    };
  }, [filteredProjects, scrollTop, containerHeight]);

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
    
    if (editingSponsorship) {
      setConfirmAction("edit");
    } else {
      setConfirmAction("create");
    }
    setShowConfirmDialog(true);
  };

  const handleDelete = async (sp: Sponsorship) => {
    if (!window.confirm(`Xóa tài trợ cho dự án "${sp.project_title}"?`)) return;
    setError("");
    try {
      await del(`/enterprise/sponsorships/${sp.sponsorship_id}`);
      load();
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const total = data.reduce((s, d) => s + (d.status === "approved" ? d.amount : 0), 0);
  const selected = projects.find((p) => String(p.id) === projectId);
  const maxFunded = Math.max(1, ...projects.map((p) => p.sponsored_total));

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

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          ref={confirmDialogRef}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <h3 id="confirm-dialog-title" className="font-semibold text-ink mb-4">
              {editingSponsorship ? "Xác nhận cập nhật tài trợ" : "Xác nhận tạo tài trợ mới"}
            </h3>
            <p className="text-sm text-muted mb-6">
              {editingSponsorship
                ? `Bạn sắp cập nhật tài trợ cho dự án "${selected?.title || ""}".`
                : `Xác nhận tài trợ ${(amount / 1_000_000).toFixed(1)} triệu VNĐ cho dự án "${selected?.title || ""}"?`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseConfirmDialog}
                className="px-4 py-2 rounded-xl border border-line text-sm text-muted hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={submitting}
                className="px-4 py-2 rounded-xl cta-gradient text-white text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? "Đang xử lý..." : editingSponsorship ? "Cập nhật" : "Xác nhận tài trợ"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Tài trợ dự án"
        subtitle="Đầu tư vào các dự án sáng tạo của học sinh sinh viên (slide 31)."
      />

      {/* Banner tổng (slide 31) */}
      <div className="rounded-2xl hero-gradient p-5 text-white shadow-lg mb-6 flex items-center gap-4" role="region" aria-label="Tổng quan tài trợ">
        <span className="h-12 w-12 shrink-0 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
          <HandCoins size={22} />
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-white/75">
            Tổng đã tài trợ
          </div>
          <div className="text-2xl font-extrabold tabular-nums">
            {(total / 1_000_000).toFixed(0)} triệu VNĐ
          </div>
          <div className="text-xs text-white/80">
            trên {projects.length} dự án — tác động đến học sinh sinh viên
          </div>
        </div>
      </div>

      {/* Lưới dự án (slide 31) */}
      <section aria-labelledby="projects-heading" className="mb-6">
        <h2 id="projects-heading" className="sr-only">Danh sách dự án kêu gọi tài trợ</h2>
        
        <div className="flex flex-wrap gap-3 mb-4" role="search" aria-label="Bộ lọc dự án">
          <div className="relative">
            <label htmlFor="filter-field" className="sr-only">Lọc theo lĩnh vực</label>
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <select
              id="filter-field"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="pl-9 pr-8 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              <option value="">Tất cả lĩnh vực</option>
              {Object.entries(FIELD_NAMES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label htmlFor="filter-status" className="sr-only">Lọc theo trạng thái</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-xl border border-line text-sm bg-white outline-none focus:border-portal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            >
              <option value="">Tất cả trạng thái</option>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          {filterField || filterStatus ? (
            <button
              type="button"
              onClick={() => { setFilterField(""); setFilterStatus(""); }}
              className="px-3 py-2 rounded-xl border border-line text-sm text-muted hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <X size={14} className="inline mr-1" aria-hidden="true" /> Bỏ lọc
            </button>
          ) : null}
        </div>

        {visibleProjects.items.length === 0 && projects.length > 0 ? (
          <Card className="lg:col-span-2">
            <p className="text-sm text-muted text-center py-6" role="status">Không tìm thấy dự án phù hợp với bộ lọc.</p>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="lg:col-span-2">
            <p className="text-sm text-muted text-center py-6" role="status">Chưa có dự án nào kêu gọi tài trợ.</p>
          </Card>
        ) : (
          <div
            ref={projectListRef}
            onScroll={handleScroll}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            style={{ height: containerHeight, overflow: "auto" }}
            role="list"
            aria-label="Danh sách dự án"
          >
            <div style={{ height: visibleProjects.totalHeight, position: "relative" }}>
              {visibleProjects.items.map((p, index) => {
                const actualIndex = visibleProjects.startIndex + index;
                const pct = Math.min(100, Math.round((p.sponsored_total / maxFunded) * 100));
                return (
                  <article
                    key={p.id}
                    className="card-item"
                    style={{
                      position: "absolute",
                      top: visibleProjects.offsetY + index * ITEM_HEIGHT,
                      width: "100%",
                      height: ITEM_HEIGHT,
                    }}
                    role="listitem"
                  >
                    <Card>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-ink">{p.title}</h3>
                          <div className="text-xs text-muted mt-0.5">
                            {p.owner_name} · Nhóm {p.member_count} thành viên
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 font-semibold" aria-label="Dự án tiềm năng">
                          ✨ Tiềm năng
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between text-xs">
                        <span className="font-semibold text-ink tabular-nums">
                          {(p.sponsored_total / 1_000_000).toFixed(0)}M / {(p.funding_goal / 1_000_000).toFixed(0)}M
                        </span>
                        <span className="font-bold text-emerald-600 tabular-nums">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-canvas-soft overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Tiến độ tài trợ ${pct}%`}>
                        <div className="h-full rounded-full hero-gradient" style={{ width: `${pct}%` }} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProjectId(String(p.id));
                          setEditingSponsorship(null);
                          sponsorFormRef.current?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mt-3 w-full text-sm py-2 rounded-full cta-gradient text-white font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                      >
                        Tài trợ ngay
                      </button>
                    </Card>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="sponsor-form-heading" id="sponsor-form" ref={sponsorFormRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <div className="flex items-center gap-2 mb-3">
            <Rocket size={18} className="text-portal" aria-hidden="true" />
            <h2 id="sponsor-form-heading" className="font-semibold text-ink">{editingSponsorship ? "Chỉnh sửa tài trợ" : "Tài trợ dự án mới"}</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSponsorClick(); }} className="grid grid-cols-1 md:grid-cols-4 gap-3" aria-label="Form tài trợ dự án">
            <div className="md:col-span-2">
              <label htmlFor="sponsor-project" className="block text-sm font-medium text-ink mb-1">
                Chọn dự án <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="sponsor-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-line text-sm bg-white w-full outline-none focus:border-portal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
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
            <div>
              <label htmlFor="sponsor-amount" className="block text-sm font-medium text-ink mb-1">
                Số tiền (VNĐ) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="sponsor-amount"
                type="number"
                min={100000}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                placeholder="VD: 5000000"
                inputMode="numeric"
                autoComplete="off"
                aria-required="true"
                required
              />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="sponsor-conditions" className="block text-sm font-medium text-ink mb-1">
                Điều kiện tài trợ (tùy chọn)
              </label>
              <input
                id="sponsor-conditions"
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="VD: Báo cáo tiến độ hàng tháng, có mặt tại buổi demo..."
                className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                autoComplete="off"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={!projectId || submitting}
                className="flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    <span>{editingSponsorship ? "Đang cập nhật..." : "Đang tạo..."}</span>
                  </>
                ) : (
                  <>
                    <HandCoins size={15} aria-hidden="true" /> {editingSponsorship ? "Cập nhật" : "Xác nhận tài trợ"}
                  </>
                )}
              </button>
            </div>
          </form>
          {editingSponsorship && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-3 text-sm text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 rounded"
            >
              Hủy chỉnh sửa
            </button>
          )}
          {selected && (
            <p className="mt-3 text-xs text-muted" aria-live="polite">
              {selected.owner_name} · {selected.member_count} thành viên · đã nhận {(selected.sponsored_total / 1_000_000).toFixed(1)}M₫ tài trợ đã duyệt.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-light">
            Số tiền hiển thị bằng VNĐ. Doanh nghiệp nhận báo cáo tiến độ dự án định kỳ 2 tháng.
          </p>
        </Card>
      </section>

      <section aria-labelledby="history-heading">
        <Card>
          <h2 id="history-heading" className="font-semibold text-ink mb-3">Lịch sử tài trợ</h2>
          {data.length === 0 ? (
            <p className="text-sm text-muted" role="status">Chưa có tài trợ nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums" role="grid">
                <thead>
                  <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line">
                    <th className="pb-2" scope="col">Dự án</th>
                    <th className="pb-2" scope="col">Lĩnh vực</th>
                    <th className="pb-2 text-right" scope="col">Số tiền</th>
                    <th className="pb-2" scope="col">Điều kiện</th>
                    <th className="pb-2 text-center" scope="col">Trạng thái</th>
                    <th className="pb-2 text-right" scope="col">Ngày</th>
                    <th className="pb-2 text-right" scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.sponsorship_id} className="border-b border-line hover:bg-canvas-soft/50 transition-colors duration-150">
                      <td className="py-2.5 font-medium text-ink">{d.project_title}</td>
                      <td className="py-2.5 text-muted capitalize">{d.field.replace("_", " ")}</td>
                      <td className="py-2.5 text-right font-semibold text-ink tabular-nums">
                        <DollarSign size={12} className="inline mr-1" aria-hidden="true" /> {(d.amount / 1_000_000).toFixed(1)}M₫
                      </td>
                      <td className="py-2.5 text-muted-light max-w-xs truncate" title={d.conditions || "—"}>
                        {d.conditions || "—"}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            d.status === "approved" ? "bg-portal-soft text-portal-dark" : "bg-portal text-white"
                          }`}
                        >
                          {d.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-muted-light tabular-nums">{d.created_at}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1" role="group" aria-label={`Thao tác cho tài trợ ${d.project_title}`}>
                          <button
                            type="button"
                            onClick={() => handleEdit(d)}
                            className="text-xs px-2 py-1 rounded-lg border border-line text-ink hover:bg-canvas-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
                            aria-label={`Chỉnh sửa tài trợ ${d.project_title}`}
                          >
                            <Edit size={14} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(d)}
                            className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
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
          )}
        </Card>
      </section>
    </div>
  );
}

// Get selected project for confirm dialog
function selectedProject() {
  // This is a workaround since we can't access `selected` from outside the component
  // The actual selected project is computed in the component body
  return null;
}