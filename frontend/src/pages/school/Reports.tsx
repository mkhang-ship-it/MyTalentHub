import { useEffect, useState, useCallback } from "react";
import {
  Download,
  FileText,
  Users,
  Activity,
  ClipboardList,
  BadgeCheck,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ReportRow {
  [key: string]: unknown;
}

type ReportType = "students" | "activities" | "evaluations" | "badges";

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ReactNode; iconBg: string; description: string }[] = [
  { key: "students", label: "Danh sách học sinh", icon: <Users size={18} className="text-white" />, iconBg: "bg-gradient-to-br from-violet-500 to-purple-700", description: "Thông tin HS, lớp, khối, điểm năng lực, giờ trải nghiệm" },
  { key: "activities", label: "Hoạt động", icon: <Activity size={18} className="text-white" />, iconBg: "bg-gradient-to-br from-orange-400 to-orange-600", description: "Đăng ký hoạt động, vai trò, trạng thái, giờ được ghi nhận" },
  { key: "evaluations", label: "Điểm đánh giá", icon: <ClipboardList size={18} className="text-white" />, iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600", description: "Chuyên môn, sáng tạo, làm việc nhóm, kỷ luật, tổng điểm" },
  { key: "badges", label: "Huy hiệu", icon: <BadgeCheck size={18} className="text-white" />, iconBg: "bg-gradient-to-br from-rose-500 to-pink-600", description: "Huy hiệu đạt được, điều kiện, thời gian nhận" },
];

function toCsv(rows: ReportRow[]): string {
  if (!rows.length) return "\ufeff";
  const header = Object.keys(rows[0] as object);
  const lines = rows.map((r) => header.map((h) => String((r as Record<string, unknown>)[h] ?? "")).join(","));
  return "\ufeff" + [header.join(","), ...lines].join("\n");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [type, setType] = useState<ReportType>("students");
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState("");
  const [previewLimit, setPreviewLimit] = useState(20);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [downloading, setDownloading] = useState<"json" | "csv" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((t: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type: t, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 4000);
  }, []);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await get<ReportRow[]>(`/school/reports?type=${type}&format=json`);
      setData(res);
    } catch (_e) {
      setError(String(_e || "Lỗi tải dữ liệu"));
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    load().finally(() => setTimeout(() => setIsRefreshing(false), 600));
  };

  const handleDownloadJson = () => {
    if (!data) return;
    setDownloading("json");
    try {
      const filename = `bao-cao-${type}-${new Date().toISOString().slice(0, 10)}.json`;
      download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
      showToast("success", "Đã tải xuống file JSON thành công");
    } catch {
      showToast("error", "Có lỗi xảy ra khi tải JSON");
    } finally {
      setTimeout(() => setDownloading(null), 300);
    }
  };

  const handleDownloadCsv = () => {
    if (!data) return;
    setDownloading("csv");
    try {
      const filename = `bao-cao-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      download(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), filename);
      showToast("success", "Đã tải xuống file CSV (UTF-8 BOM)");
    } catch {
      showToast("error", "Có lỗi xảy ra khi tải CSV");
    } finally {
      setTimeout(() => setDownloading(null), 300);
    }
  };

  const currentType = REPORT_TYPES.find((t) => t.key === type)!;
  const filteredData = data
    ? data.filter((r) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return Object.values(r as Record<string, unknown>).some((v) => String(v ?? "").toLowerCase().includes(q));
      })
    : [];
  const previewRows = filteredData.slice(0, previewLimit);
  const totalRows = filteredData.length;

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const getColumns = (): string[] => {
    if (!previewRows.length) return [];
    return Object.keys(previewRows[0] as object);
  };

  const renderCell = (row: ReportRow, col: string) => {
    const val = (row as Record<string, unknown>)[col];
    if (typeof val === "number") return val.toLocaleString();
    return String(val ?? "");
  };

  const columns = getColumns();

  return (
    <div className="relative">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-label="Thông báo">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] animate-in slide-in-from-top-2 ${
              t.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle size={18} className="shrink-0" aria-hidden />
            ) : (
              <AlertCircle size={18} className="shrink-0" aria-hidden />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <PageHeader
        title="Báo cáo"
        subtitle="Tải về các báo cáo định kỳ và tổng kết nhanh chóng, dễ dàng (slide 26)."
      />

      <Card className="mb-6 overflow-hidden">
        {/* Filter tabs with motion */}
        <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Loại báo cáo">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => { setType(t.key); setPreviewLimit(20); setSearchQuery(""); }}
              role="tab"
              aria-selected={type === t.key}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 ${
                type === t.key
                  ? "bg-portal-soft/60 border-portal shadow-[0_2px_12px_rgba(168,85,247,0.15)] scale-[1.02] text-portal-dark font-extrabold"
                  : "border-line bg-white text-muted hover:text-ink hover:border-portal/40 hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <span
                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-300 ${t.iconBg} shadow-sm group-hover:scale-105 ${type === t.key ? "shadow-md" : ""}`}
                aria-hidden
              >
                {t.icon}
              </span>
              <div className="text-left">
                <div className="text-sm font-bold tracking-tight leading-tight">{t.label}</div>
                <div className="text-[10px] text-muted-light leading-tight">{t.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Search + action bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bản ghi..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line bg-canvas-soft/50 text-sm text-ink placeholder:text-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 hover:border-portal/30"
            />
          </div>
          <button
            onClick={handleRefresh}
            aria-label="Làm mới dữ liệu"
            className={`p-2.5 rounded-xl border border-line bg-white text-muted hover:text-ink hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted uppercase tracking-wider">Tổng bản ghi</span>
              <div className="text-xl font-extrabold text-ink tabular-nums leading-none">{totalRows}</div>
            </div>
            <div className="w-px h-8 bg-line" aria-hidden />
            <div>
              <span className="text-xs text-muted uppercase tracking-wider">Đang hiển thị</span>
              <div className="text-xl font-extrabold text-portal tabular-nums leading-none">{previewRows.length}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="preview-limit" className="sr-only">Số dòng xem trước</label>
            <select
              id="preview-limit"
              value={previewLimit}
              onChange={(e) => setPreviewLimit(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-line text-xs bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-200 hover:border-portal/40"
            >
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={500}>500 dòng</option>
              <option value={1000}>1000 dòng</option>
            </select>
          </div>
        </div>

        {/* Download actions */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleDownloadJson}
            disabled={downloading === "json" || !data}
            className="flex items-center gap-2 text-sm px-3.5 py-2.5 rounded-full border border-line bg-white text-muted font-semibold hover:text-ink hover:-translate-y-0.5 hover:shadow-md disabled:opacity-40 disabled:hover:translate-y-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            aria-label="Tải xuống file JSON"
          >
            <Download size={15} aria-hidden />
            {downloading === "json" ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-t-transparent border-muted animate-spin" />
                Đang tải...
              </span>
            ) : (
              "JSON"
            )}
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={downloading === "csv" || !data}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-full bg-gradient-to-r from-portal to-portal-dark text-white font-semibold hover:brightness-110 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:hover:translate-y-0 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
            aria-label="Tải xuống file CSV (UTF-8 BOM)"
          >
            <Download size={15} aria-hidden />
            {downloading === "csv" ? (
              <span className="flex items-center gap-1.5 text-xs">
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-t-transparent border-white/60 animate-spin" />
                Đang tải...
              </span>
            ) : (
              "Tải CSV"
            )}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-line shadow-[0_1px_3px_rgba(51,50,77,0.04)]">
          <table className="w-full text-sm tabular-nums" role="table" aria-label={`Báo cáo ${currentType.label}`}>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest bg-canvas-soft text-muted">
                {columns.map((col) => (
                  <th key={col} scope="col" className="px-3.5 py-3 font-bold whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={i}
                  className={`transition-colors duration-200 hover:bg-canvas-soft/60 ${i % 2 === 0 ? "bg-white" : "bg-canvas-soft/30"}`}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3.5 py-3 border-t border-line/40 whitespace-nowrap">{renderCell(row, col)}</td>
                  ))}
                </tr>
              ))}
              {!previewRows.length && (
                <tr>
                  <td colSpan={columns.length || 1} className="px-6 py-12 text-center text-muted">
                    <div className="flex flex-col items-center gap-3">
                      <Filter size={32} className="text-muted-light" aria-hidden />
                      <div className="text-sm font-medium">Không tìm thấy bản ghi phù hợp</div>
                      <div className="text-xs text-muted-light">Thử điều chỉnh từ khóa tìm kiếm hoặc chọn loại báo cáo khác</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalRows > previewLimit && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted">Hiển thị {previewLimit} / {totalRows} bản ghi. Tải về để có dữ liệu đầy đủ.</p>
            <div className="w-48 h-1.5 rounded-full bg-canvas-soft overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-portal transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, (previewLimit / Math.max(totalRows, 1)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="text-[11px] text-muted flex items-center gap-1.5">
        <FileText size={13} aria-hidden />
        Dữ liệu từ API{" "}
        <code className="bg-canvas-soft px-1.5 py-0.5 rounded text-portal font-mono">/school/reports</code>
        — xuất CSV (UTF-8 BOM) hoặc JSON.
      </div>
    </div>
  );
}
