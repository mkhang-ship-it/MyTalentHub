import { useEffect, useState } from "react";
import { Award, Download, FileSpreadsheet, FileText, Users, Activity, ClipboardList, BadgeCheck, AlertCircle, CheckCircle } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface StudentReportRow {
  id: number;
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  experience_hours: number;
}

interface ActivityReportRow {
  id: number;
  student_id: number;
  full_name: string;
  class_name: string;
  grade: number;
  activity_id: number;
  activity_title: string;
  activity_field: string;
  role: string;
  status: string;
  hours: number;
  registered_at: string;
}

interface EvaluationReportRow {
  id: number;
  student_id: number;
  full_name: string;
  class_name: string;
  grade: number;
  activity_id: number;
  activity_title: string;
  chuyen_mon: number;
  sang_tao: number;
  lam_viec_nhom: number;
  ky_luat: number;
  total: number;
  comment: string;
  evaluated_at: string;
}

interface BadgeReportRow {
  id: number;
  student_id: number;
  full_name: string;
  class_name: string;
  grade: number;
  badge_id: number;
  badge_code: string;
  badge_name: string;
  badge_min_hours: number;
  earned_at: string;
}

type ReportType = "students" | "activities" | "evaluations" | "badges";
type ReportRow = Record<string, unknown>;

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

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const load = async () => {
    setError("");
    try {
      const res = await get<ReportRow[]>(`/school/reports?type=${type}&format=json`);
      setData(res);
    } catch (e) {
      setError(String((e as Error).message || e));
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  const handleDownloadJson = () => {
    if (!data) return;
    setDownloading("json");
    try {
      const filename = `bao-cao-${type}-${new Date().toISOString().slice(0, 10)}.json`;
      download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
      showToast("success", "Đã tải xuống file JSON thành công");
    } catch (e) {
      showToast("error", "Có lỗi xảy ra khi tải JSON");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCsv = () => {
    if (!data) return;
    setDownloading("csv");
    try {
      const filename = `bao-cao-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      download(new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" }), filename);
      showToast("success", "Đã tải xuống file CSV thành công");
    } catch (e) {
      showToast("error", "Có lỗi xảy ra khi tải CSV");
    } finally {
      setDownloading(null);
    }
  };

  const currentType = REPORT_TYPES.find((t) => t.key === type)!;
  const previewRows = data?.slice(0, previewLimit) ?? [];
  const totalRows = data?.length ?? 0;

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

      <PageHeader
        title="Báo cáo"
        subtitle="Tải về các báo cáo định kỳ và tổng kết nhanh chóng, dễ dàng (slide 26)."
      />

      <Card className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Loại báo cáo">
          {REPORT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => { setType(t.key); setPreviewLimit(20); }}
              role="tab"
              aria-selected={type === t.key}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition ${type === t.key ? "bg-portal-soft border-portal text-portal" : "border-line bg-white hover:border-portal"}`}
            >
              <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${t.iconBg}`} aria-hidden="true">{t.icon}</span>
              <div className="text-left">
                <div className="font-medium text-ink text-sm">{t.label}</div>
                <div className="text-xs text-muted-light">{t.description}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted">Tổng: <span className="font-medium text-ink tabular-nums">{totalRows}</span> bản ghi</div>
          <div className="flex items-center gap-2">
            <label htmlFor="preview-limit" className="sr-only">Số dòng xem trước</label>
            <select
              id="preview-limit"
              value={previewLimit}
              onChange={(e) => setPreviewLimit(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-line text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              autoComplete="off"
            >
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
              <option value={500}>500 dòng</option>
              <option value={1000}>1000 dòng</option>
            </select>
            <button 
              onClick={handleDownloadJson} 
              disabled={downloading === "json"}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-full border border-line bg-white hover:bg-canvas-soft text-muted font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              aria-label="Tải xuống file JSON"
            >
              <Download size={14} aria-hidden="true" /> {downloading === "json" ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Đang tải...
                </span>
              ) : "JSON"}
            </button>
            <button 
              onClick={handleDownloadCsv} 
              disabled={downloading === "csv"}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-portal text-white hover:bg-portal-dark font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2"
              aria-label="Tải xuống file CSV (UTF-8 BOM)"
            >
              <Download size={14} aria-hidden="true" /> {downloading === "csv" ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Đang tải...
                </span>
              ) : "Tải CSV"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm tabular-nums" role="table" aria-label={`Báo cáo ${currentType.label} - xem trước ${previewLimit} / ${totalRows} bản ghi`}>
            <thead>
              <tr className="text-left text-muted-light text-xs uppercase tracking-wider bg-canvas-soft">
                {getColumns().map((col) => (
                  <th key={col} scope="col" className="px-3 py-2">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-canvas-soft/50"} >
                  {getColumns().map((col) => (
                    <td key={col} className="px-3 py-2 border-t border-line/50">{renderCell(row, col)}</td>
                  ))}
                </tr>
              ))}
              {!previewRows.length && (
                <tr>
                  <td colSpan={getColumns().length || 1} className="px-4 py-8 text-center text-muted">
                    Không có dữ liệu cho loại báo cáo này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalRows > previewLimit && (
          <p className="mt-2 text-xs text-muted-light text-center">
            Hiển thị {previewLimit} / {totalRows} bản ghi. Tải về để có dữ liệu đầy đủ.
          </p>
        )}
      </Card>

      <div className="text-xs text-muted-light flex items-center gap-1.5">
        <FileText size={13} aria-hidden="true" />
        Dữ liệu từ API <code className="bg-canvas-soft px-1.5 py-0.5 rounded text-portal">/school/reports?type=students|activities|evaluations|badges&format=json|csv</code> — xuất CSV (UTF-8 BOM, Excel đọc được) hoặc JSON.
      </div>
    </div>
  );
}