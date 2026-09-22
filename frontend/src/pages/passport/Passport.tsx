import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Award,
  Briefcase,
  CalendarDays,
  FileCheck2,
  IdCard,
  Lightbulb,
  QrCode,
  Star,
  Target,
} from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Passport {
  qr_code: string;
  updated_at: string;
  student: {
    id: number;
    full_name: string;
    class_name: string;
    grade: number;
    avatar_url: string | null;
    bio: string | null;
    interests: string | null;
    talent_score: number;
    experience_hours: number;
  };
  certificates: { title: string; issuer: string; issued_at: string | null }[];
  projects: { title: string; field: string; status: string; description: string | null }[];
  activities: { title: string; field: string; hours: number; role: string | null }[];
  skills: { name: string; level: number }[];
  badges: { code: string; name: string; icon: string; color: string }[];
}

const FIELD_NAMES: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

export default function Passport() {
  const { studentId } = useParams();
  const [data, setData] = useState<Passport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Passport>(`/passport/${studentId ?? 1}`)
      .then(setData)
      .catch((e) => setError(String((e as Error).message || e)));
  }, [studentId]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const s = data.student;
  const avgLevel =
    data.skills.length > 0 ? (data.skills.reduce((sum, k) => sum + k.level, 0) / data.skills.length) : 0;

  return (
    <div>
      <PageHeader
        title="Talent Passport"
        subtitle="Hồ sơ năng lực số của học sinh — mọi dữ liệu cá nhân, thành tích và hoạt động trải nghiệm tích hợp một nơi (slide 32)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái - thông tin cá nhân + QR */}
        <div className="space-y-4">
          <Card className="text-center">
            <div className="mx-auto h-24 w-24 rounded-full hero-gradient text-white flex items-center justify-center text-3xl font-bold shadow-lg">
              {s.full_name.charAt(0)}
            </div>
            <h2 className="mt-3 text-xl font-bold text-ink">{s.full_name}</h2>
            <p className="text-sm text-muted">
              Lớp {s.class_name} · Khối {s.grade}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-portal-soft p-2">
                <Star size={14} className="mx-auto text-portal" />
                <div className="text-lg font-bold text-portal-dark">{s.talent_score}</div>
                <div className="text-[10px] text-muted">Điểm năng lực</div>
              </div>
              <div className="rounded-xl bg-portal-soft p-2">
                <CalendarDays size={14} className="mx-auto text-portal" />
                <div className="text-lg font-bold text-portal">{s.experience_hours}h</div>
                <div className="text-[10px] text-muted">Trải nghiệm</div>
              </div>
              <div className="rounded-xl bg-portal-soft p-2">
                <Award size={14} className="mx-auto text-portal" />
                <div className="text-lg font-bold text-portal">{data.badges.length}</div>
                <div className="text-[10px] text-muted">Huy hiệu</div>
              </div>
            </div>
          </Card>

          <Card className="hero-gradient text-white text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-light mb-3">
              <QrCode size={14} /> Mã định danh Talent Passport
            </div>
            {/* QR mock */}
            <div className="mx-auto w-36 h-36 bg-white rounded-xl p-2.5 grid grid-cols-5 gap-1">
              {Array.from({ length: 25 }).map((_, i) => {
                // mã giả lập vị trí module QR
                const corners = [0, 4, 20, 24, 2, 22];
                const randomish = (i * 7 + s.id * 13) % 3 !== 0;
                const filled = corners.includes(i) || randomish;
                return <div key={i} className={filled ? "bg-ink rounded-[2px]" : "bg-transparent"} />;
              })}
            </div>
            <div className="mt-3 text-sm font-mono text-muted-light">{data.qr_code}</div>
            <div className="text-[11px] text-muted-light">Cập nhật: {data.updated_at}</div>
            <div className="mt-3 text-[11px] text-muted-light">
              Quét mã để xác thực hồ sơ — khi xin học bổng, thực tập hoặc tuyển dụng.
            </div>
          </Card>
        </div>

        {/* Cột giữa + phải - nội dung chi tiết */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Target size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Giới thiệu & Sở thích</h2>
            </div>
            <p className="text-sm text-muted">{s.bio ?? "Chưa cập nhật giới thiệu."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(s.interests ?? "").split(", ").filter(Boolean).map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-portal-soft text-portal-dark">
                  {t}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Kỹ năng năng lực</h2>
              <span className="ml-auto text-xs text-muted-light">TB: {avgLevel.toFixed(1)}/10</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {data.skills.map((k) => (
                <div key={k.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-soft">{k.name}</span>
                    <span className="text-muted-light">{k.level}/10</span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-soft overflow-hidden">
                    <div
                      className="h-full rounded-full hero-gradient"
                      style={{ width: `${Math.min(100, k.level * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
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

            <Card>
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

          <Card>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={18} className="text-portal" />
              <h2 className="font-semibold text-ink">Hoạt động trải nghiệm</h2>
            </div>
            <div className="space-y-2.5">
              {data.activities.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3">
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
    </div>
  );
}