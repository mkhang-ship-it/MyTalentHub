import { useEffect, useState } from "react";
import { CalendarDays, Flame, Sparkles, Trophy, Users } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "../../components/ui";

interface Overview {
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  experience_hours: number;
  school_rank: number;
  school_total: number;
  unlocked_badges: { code: string; name: string; icon: string; color: string }[];
  ai_analysis: string | null;
  roadmap: { title: string; content: string }[];
  activities: { id: number; title: string; field: string; status: string; hours: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Overview>("/student/overview").then(setData).catch((e) => setError(String(e.message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Tổng quan cá nhân"
        subtitle="Hiển thị điểm năng lực, huy hiệu, giờ trải nghiệm của bạn."
      />

      {/* Hero banner */}
      <div
        className="relative rounded-2xl overflow-hidden mb-6"
        style={{
          background: "var(--hero-gradient)",
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
        <div className="relative px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              Chào mừng trở lại, {data.full_name}! 👋
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {data.experience_hours}h trải nghiệm · Khối {data.grade} · Hạng #{data.school_rank}/{data.school_total}
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-white/90">Điểm năng lực</div>
            <div className="text-4xl font-extrabold text-white">{data.talent_score}</div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Điểm năng lực" value={data.talent_score} delta="Thang điểm 100" icon={<Trophy size={18} />} color="text-portal-dark" />
        <StatCard label="Giờ trải nghiệm" value={`${data.experience_hours}h`} delta="Tích lũy tự động qua check-in" icon={<Flame size={18} />} color="text-portal-dark" />
        <StatCard label="Xếp hạng khối" value={`#${data.school_rank}/${data.school_total}`} delta={`Khối ${data.grade} · ${data.school_total} bạn`} icon={<Users size={18} />} color="text-portal" />
        <StatCard label="Huy hiệu đã mở" value={data.unlocked_badges.length} delta="Explorer/Innovator/Expert/Master" icon={<Sparkles size={18} />} color="text-portal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI analysis */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">AI phân tích năng lực</h2>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {data.ai_analysis ?? "Đang phân tích — hoàn thành bài test năng khiếu để nhận gợi ý."}
          </p>
          <a
            href="/student/roadmap"
            className="mt-4 block rounded-xl bg-portal-soft border border-portal-soft p-4 text-sm text-ink-soft hover:border-portal"
          >
            💡 Xem lộ trình 3 tháng được AI gợi ý riêng cho bạn →
          </a>
        </Card>

        {/* Roadmap */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">Lộ trình gợi ý 3 tháng tới</h2>
          </div>
          <div className="space-y-3">
            {data.roadmap.length === 0 && (
              <p className="text-sm text-muted">Chưa có lộ trình — AI sẽ gợi ý sau bài khảo sát năng khiếu.</p>
            )}
            {data.roadmap.map((r) => (
              <div key={r.title} className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-portal-soft text-portal-dark flex items-center justify-center text-xs font-bold">
                  {r.title.replace("Tháng ", "T")}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink">{r.title}</div>
                  <div className="text-xs text-muted">{r.content}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent activities */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-portal" aria-hidden="true" />
            <h2 className="font-semibold text-ink">Hoạt động của bạn</h2>
          </div>
          {data.activities.length === 0 ? (
            <p className="text-sm text-muted">
              Bạn chưa tham gia hoạt động nào — khám phá sân chơi ngay!
            </p>
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
                    <tr key={a.id} className="border-t border-line">
                      <td className="py-2.5 font-medium text-ink">{a.title}</td>
                      <td className="py-2.5 text-muted capitalize">{a.field.replace("_", " ")}</td>
                      <td className="py-2.5">
                        <span className="text-xs px-2 py-1 rounded-full bg-portal-soft text-portal-dark">
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">{a.hours}h</td>
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