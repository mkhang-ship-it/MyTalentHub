import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Briefcase,
  CalendarDays,
  FileCheck2,
  IdCard,
  Target,
} from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { PassportHoloCard } from "../../components/three/PassportHoloCard";
import { PassportDetailDialog } from "./PassportDetailDialog";
import { FIELD_NAMES, type Passport } from "./shared";

export default function Passport() {
  const { studentId } = useParams();
  const [data, setData] = useState<Passport | null>(null);
  const [error, setError] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    get<Passport>(`/passport/${studentId ?? 1}`)
      .then(setData)
      .catch((e) => setError(String((e as Error).message || e)));
  }, [studentId]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const s = data.student;

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .anim-fade-up { animation: fadeUp 0.6s ease-out both; }
        .reveal { opacity: 0; transform: translateY(14px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .reveal.reveal-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .anim-fade-up { animation: fadeIn 0.15s ease both; } .reveal { transition: opacity 0.15s ease; } }
      `}</style>
    <div>
      <PageHeader
        reveal
        title="Talent Passport"
        subtitle="Hồ sơ năng lực số của học sinh — dữ liệu cá nhân, thành tích và hoạt động trải nghiệm tập trung một nơi."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái - thẻ 2D bấm để mở chi tiết */}
        <div className="space-y-4 h-full">
          <PassportHoloCard data={data} onRequestOpen={() => setDetailOpen(true)} className="h-full" />
        </div>

        {/* Cột phải - nội dung chi tiết */}
        <div className="lg:col-span-2 space-y-4">
          <Card reveal revealDelay={3} className="shadow-soft hover:shadow-lift transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Giới thiệu & Sở thích</h2>
            </div>
            <p className="text-sm text-muted line-clamp-3">{s.bio ?? "Chưa cập nhật giới thiệu."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(s.interests ?? "").split(", ").filter(Boolean).map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-portal-soft text-portal-dark">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card reveal revealDelay={4}>
              <div className="flex items-center gap-2 mb-3">
                <FileCheck2 size={18} className="text-portal-dark" />
                <h2 className="font-semibold text-ink">Chứng chỉ & Giấy khen</h2>
              </div>
              <div className="space-y-2.5">
                {data.certificates.map((c, i) => (
                  <div key={i} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                    <div className="text-sm font-medium text-ink">{c.title}</div>
                    <div className="text-xs text-muted-light">
                      {c.issuer}{c.issued_at ? ` · ${c.issued_at}` : ""}
                    </div>
                  </div>
                ))}
                {data.certificates.length === 0 && (
                  <p className="text-sm text-muted">Chưa có chứng chỉ.</p>
                )}
              </div>
            </Card>

            <Card reveal revealDelay={4}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={18} className="text-portal" />
                <h2 className="font-semibold text-ink">Dự án cá nhân</h2>
              </div>
              <div className="space-y-2.5">
                {data.projects.map((p, i) => (
                  <div key={i} className="rounded-xl border border-line bg-canvas-soft/50 px-3 py-2.5">
                    <div className="text-sm font-medium text-ink">{p.title}</div>
                    <div className="text-xs text-muted-light capitalize">
                      {FIELD_NAMES[p.field] ?? p.field} · {p.status === "active" ? "Đang triển khai" : p.status}
                    </div>
                    {p.description && <div className="text-xs text-muted mt-1 line-clamp-2">{p.description}</div>}
                  </div>
                ))}
                {data.projects.length === 0 && (
                  <p className="text-sm text-muted">Chưa tham gia dự án.</p>
                )}
              </div>
            </Card>
          </div>

          <Card reveal revealDelay={5}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Hoạt động trải nghiệm</h2>
            </div>
            <div className="space-y-2.5">
              {data.activities.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3 hover:bg-canvas-soft/80 transition-colors duration-150">
                  <div>
                    <div className="text-sm font-medium text-ink">{a.title}</div>
                    <div className="text-xs text-muted-light capitalize">
                      {FIELD_NAMES[a.field] ?? a.field}{a.role ? ` · ${a.role}` : ""}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-portal">{a.hours}h</span>
                </div>
              ))}
              {data.activities.length === 0 && (
                <p className="text-sm text-muted">Chưa tham gia hoạt động nào.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-light">
        <IdCard size={13} />
        FTalentHub — Hồ sơ năng lực số, xác thực bởi trường THPT FTI Cần Thơ
      </div>

      {detailOpen && (
        <PassportDetailDialog data={data} open onClose={() => setDetailOpen(false)} />
      )}
    </div>
    </>
  );
}