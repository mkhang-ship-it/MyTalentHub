import { useEffect, useState } from "react";
import { CalendarDays, Flame, Sparkles, Trophy, Users } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "../../components/ui";
import { SkillOrbit } from "../../components/three/SkillOrbit";

interface Overview {
  full_name: string;
  class_name: string;
  grade: number;
  education_level: string;
  talent_score: number;
  experience_hours: number;
  school_rank: number;
  school_total: number;
  unlocked_badges: { code: string; name: string; icon: string; color: string }[];
  ai_analysis: string | null;
  roadmap: { title: string; content: string }[];
  activities: { id: number; title: string; field: string; status: string; hours: number }[];
  streak: number;
}

const FIELD_LABELS: Record<string, string> = {
  ky_thuat: "Kỹ thuật",
  nghe_thuat: "Nghệ thuật",
  kinh_doanh: "Kinh doanh",
  the_thao: "Thể thao",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Overview>("/student/overview").then(setData).catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const skillTotals = data.activities.reduce<Record<string, number>>((totals, activity) => {
    totals[activity.field] = (totals[activity.field] || 0) + activity.hours;
    return totals;
  }, {});
  const orbitData = {
    skills: Object.entries(skillTotals).map(([field, hours]) => ({
      name: FIELD_LABELS[field] || field,
      level: Math.min(10, Math.max(1, Math.round(hours))),
    })),
    badges: data.unlocked_badges.map((badge) => ({ name: badge.name, color: badge.color, unlocked: true })),
    talent_score: data.talent_score,
    experience_hours: data.experience_hours,
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
      <PageHeader
        title="Tổng quan cá nhân"
        subtitle="Hiển thị điểm năng lực, huy hiệu, giờ trải nghiệm của bạn."
      />

      {/* Hero banner */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6"
        style={{
          background: "var(--hero-gradient)",
          animation: "fadeUp 0.7s ease-out both",
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
        <div className="relative px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              Chào mừng trở lại, {data.full_name}! 👋
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {data.experience_hours}h trải nghiệm · {data.education_level === "CDDH" ? "Khoá" : "Khối"} {data.grade} · {data.education_level} · Hạng #{data.school_rank}/{data.school_total}
            </p>
            {/* Streak chip */}
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-sm font-semibold backdrop-blur-sm">
                <Flame size={14} aria-hidden="true" />
                {data.streak > 0 ? `Chuỗi ${data.streak} ngày` : "Bắt đầu chuỗi hôm nay"}
              </span>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-white/90">Điểm năng lực</div>
            <div className="text-4xl font-extrabold text-white">{data.talent_score}</div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6" style={{ animation: "fadeUp 0.7s ease-out 0.1s both" }}>
        <StatCard label="Điểm năng lực" value={data.talent_score} delta="Thang điểm 100" icon={<Trophy size={18} />} color="text-portal-dark" />
        <StatCard label="Giờ trải nghiệm" value={`${data.experience_hours}h`} delta="Tích lũy tự động qua check-in" icon={<Flame size={18} />} color="text-portal-dark" />
        <StatCard label="Xếp hạng" value={`#${data.school_rank}/${data.school_total}`} delta={`${data.education_level === "CDDH" ? "Khoá" : "Khối"} ${data.grade} · {data.education_level} · ${data.school_total} bạn`} icon={<Users size={18} />} color="text-portal" />
        <StatCard label="Huy hiệu đã mở" value={data.unlocked_badges.length} delta="Explorer/Innovator/Expert/Master" icon={<Sparkles size={18} />} color="text-portal" />
      </div>

      <Card className="mb-6 overflow-hidden" interactive>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Skill Orbit</h2>
            <p className="text-sm text-muted">Năng lực và hành trình của bạn trong một không gian dữ liệu.</p>
          </div>
          <span className="rounded-full bg-portal-soft px-3 py-1 text-xs font-semibold text-portal-dark">{data.talent_score}/100</span>
        </div>
        <SkillOrbit data={orbitData} className="w-full" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animation: "fadeUp 0.7s ease-out 0.2s both" }}>
        {/* AI analysis */}
        <Card className="hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(51_50_77/0.08)] transition-all duration-200 ease-out">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">AI phân tích năng lực</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {data.ai_analysis ?? "Đang phân tích — hoàn thành bài test năng khiếu để nhận gợi ý."}
          </p>
          <a
            href="/student/roadmap"
            className="mt-4 block rounded-xl bg-portal-soft border border-portal-soft p-4 text-sm text-ink-soft hover:border-portal hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-200 ease-out"
          >
            💡 Xem lộ trình 3 tháng được AI gợi ý riêng cho bạn →
          </a>
        </Card>

        {/* Roadmap */}
        <Card className="hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(51_50_77/0.08)] transition-all duration-200 ease-out">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">Lộ trình gợi ý 3 tháng tới</h2>
          </div>
          <div className="space-y-3">
            {data.roadmap.length === 0 && (
              <p className="text-sm text-muted">Chưa có lộ trình — AI sẽ gợi ý sau bài khảo sát năng khiếu.</p>
            )}
            {data.roadmap.map((r, idx) => (
              <div key={r.title} className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-portal-soft text-portal-dark flex items-center justify-center text-xs font-bold">
                  T{idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{r.title}</div>
                  <div className="text-xs text-muted">{r.content}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activities */}
      <div className="mt-6" style={{ animation: "fadeUp 0.7s ease-out 0.3s both" }}>
        <Card className="hover:shadow-[0_8px_30px_rgb(51_50_77/0.05)] transition-shadow duration-200 ease-out">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-portal" aria-hidden="true" />
            <h2 className="font-semibold text-ink">Hoạt động của bạn</h2>
          </div>
          {data.activities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line-strong bg-canvas-soft/60 px-4 py-8 text-center text-sm text-muted">
              <p>Bạn chưa tham gia hoạt động nào — khám phá sân chơi ngay!</p>
              <a href="/student/activities" className="inline-block mt-3 text-sm text-portal font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded">Khám phá sân chơi →</a>
            </div>
          ) : (
            <div className="overflow-x-auto" role="region" aria-label="Danh sách hoạt động đã tham gia" tabIndex={0}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-light text-xs uppercase tracking-wider">
                    <th className="pb-2" scope="col">Hoạt động</th>
                    <th className="pb-2" scope="col">Lĩnh vực</th>
                    <th className="pb-2" scope="col">Trạng thái</th>
                    <th className="pb-2 text-right" scope="col">Giờ tích lũy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activities.map((a) => (
                    <tr key={a.id} className="border-t border-line hover:bg-portal-soft/30 transition-colors duration-150 ease-out">
                      <td className="py-2.5 font-medium text-ink whitespace-nowrap">{a.title}</td>
                      <td className="py-2.5 text-muted capitalize whitespace-nowrap">{a.field.replace("_", " ")}</td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-portal-soft text-portal-dark">{a.status}</span>
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums whitespace-nowrap">{a.hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}