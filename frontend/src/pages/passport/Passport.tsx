import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Briefcase,
  CalendarDays,
  FileCheck2,
  IdCard,
  Target,
} from "lucide-react";
import { get } from "../../api/client";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";
import { PassportCard2D } from "./PassportCard2D";
import { PassportDetailDialog } from "./PassportDetailDialog";
import { FIELD_NAMES, type Passport } from "./shared";

/** Dịch lỗi API sang tiếng Việt (giữ cách làm của Dashboard, đặc tả 02 B6). */
function loiTiengViet(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để xem hồ sơ.";
  if (msg.includes("→ 403")) return "Bạn cần đăng nhập để xem hồ sơ này.";
  if (msg.includes("→ 404")) return "Không tìm thấy hồ sơ học sinh này.";
  return "Không tải được hồ sơ, bạn thử lại sau nhé.";
}

export default function Passport() {
  const { studentId } = useParams();
  const [data, setData] = useState<Passport | null>(null);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Tải hồ sơ (tách riêng để nút "Thử lại" gọi lại được).
  const load = useCallback(() => {
    setError("");
    get<Passport>(`/passport/${studentId ?? 1}`)
      .then(setData)
      .catch((e) => setError(loiTiengViet(e)));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const khungTrang = (noiDung: React.ReactNode) => (
    <div>
      <PageHeader
        reveal
        title="Talent Passport"
        subtitle="Hồ sơ năng lực số của học sinh — dữ liệu cá nhân, thành tích và hoạt động trải nghiệm tập trung một nơi."
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
      <div aria-busy="true" aria-label="Đang tải hồ sơ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="skeleton h-[400px] rounded-[20px]" aria-hidden="true" />
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-[168px] rounded-[20px]" aria-hidden="true" />
            <div className="skeleton h-[200px] rounded-[20px]" aria-hidden="true" />
            <div className="skeleton h-[200px] rounded-[20px]" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-strong">Đang tải hồ sơ…</p>
      </div>
    );
  }

  const s = data.student;

  return (
    <div>
      <PageHeader
        reveal
        title="Talent Passport"
        subtitle="Hồ sơ năng lực số của học sinh — dữ liệu cá nhân, thành tích và hoạt động trải nghiệm tập trung một nơi."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Cột trái - thẻ 2D bấm để mở chi tiết */}
        <div className="space-y-4 h-full">
          <PassportCard2D data={data} onRequestOpen={() => setDetailOpen(true)} className="h-full" />
        </div>

        {/* Cột phải - nội dung chi tiết */}
        <div className="lg:col-span-2 space-y-4">
          <Card reveal revealDelay={0.06}>
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-portal" />
              <h2 className="text-lg font-bold text-ink">Giới thiệu & Sở thích</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-strong line-clamp-3">{s.bio ?? "Chưa cập nhật giới thiệu."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(s.interests ?? "").split(", ").filter(Boolean).map((t, i) => (
                <span key={i} className="inline-flex h-6 items-center rounded-full bg-portal-soft px-2.5 text-xs font-semibold text-portal-dark">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card reveal revealDelay={0.12}>
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 size={18} className="text-portal-dark" />
                <h2 className="text-lg font-bold text-ink">Chứng chỉ & Giấy khen</h2>
              </div>
              {data.certificates.length === 0 ? (
                <Empty text="Chưa có chứng chỉ." icon={<FileCheck2 size={32} aria-hidden="true" />} />
              ) : (
                <div className="space-y-3">
                  {data.certificates.map((c, i) => (
                    <div key={i} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                      <div className="text-sm font-semibold text-ink">{c.title}</div>
                      <div className="text-xs text-muted-strong">
                        {c.issuer}{c.issued_at ? ` · ${c.issued_at}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card reveal revealDelay={0.12}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={18} className="text-portal" />
                <h2 className="text-lg font-bold text-ink">Dự án cá nhân</h2>
              </div>
              {data.projects.length === 0 ? (
                <Empty text="Chưa tham gia dự án." icon={<Briefcase size={32} aria-hidden="true" />} />
              ) : (
                <div className="space-y-3">
                  {data.projects.map((p, i) => (
                    <div key={i} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                      <div className="text-sm font-semibold text-ink">{p.title}</div>
                      <div className="text-xs text-muted-strong capitalize">
                        {FIELD_NAMES[p.field] ?? p.field} · {p.status === "active" ? "Đang triển khai" : p.status}
                      </div>
                      {p.description && <div className="text-xs leading-relaxed text-muted-strong mt-1 line-clamp-2">{p.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card reveal revealDelay={0.18}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={18} className="text-portal" />
              <h2 className="text-lg font-bold text-ink">Hoạt động trải nghiệm</h2>
            </div>
            {data.activities.length === 0 ? (
              <Empty text="Chưa tham gia hoạt động nào." icon={<CalendarDays size={32} aria-hidden="true" />} />
            ) : (
              <div className="space-y-3">
                {data.activities.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-ink">{a.title}</div>
                      <div className="text-xs text-muted-strong capitalize">
                        {FIELD_NAMES[a.field] ?? a.field}{a.role ? ` · ${a.role}` : ""}
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-portal-dark">{a.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-strong">
        <IdCard size={13} aria-hidden="true" />
        FTalentHub — Hồ sơ năng lực số, xác thực bởi trường THPT FTI Cần Thơ
      </div>

      {detailOpen && (
        <PassportDetailDialog data={data} open onClose={() => setDetailOpen(false)} />
      )}
    </div>
  );
}
