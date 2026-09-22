import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, HandCoins, Search, Star, Users } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, StatCard } from "../../components/ui";

interface Overview {
  company_name: string;
  industry: string;
  post_count: number;
  applicant_count: number;
  sponsorship_count: number;
  total_sponsored: number;
  matching_profiles: number;
  recent_posts: { id: number; title: string; slots: number; status: string; applicants: number }[];
}

interface TopTalent {
  id: number;
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
}

export default function Overview() {
  const [data, setData] = useState<Overview | null>(null);
  const [top, setTop] = useState<TopTalent[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Overview>("/enterprise/overview").then(setData).catch((e) => setError(String((e as Error).message || e)));
    get<TopTalent[]>("/enterprise/talents?min_score=80")
      .then((t) => setTop(t.slice(0, 3)))
      .catch(() => setTop([]));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      {/* Hero chào mừng (slide 28) */}
      <div className="relative rounded-2xl overflow-hidden mb-6 hero-gradient">
        <div className="relative px-6 py-5">
          <p className="text-sm text-white/80" id="welcome-greeting">Xin chào</p>
          <h1 className="text-2xl font-extrabold text-white" id="welcome-title">
            {data.company_name} <span aria-hidden="true">🏢</span>
          </h1>
          <p className="text-sm text-white/80 mt-1" aria-live="polite">
            Hôm nay có {data.matching_profiles} hồ sơ mới phù hợp với nhu cầu của bạn.
          </p>
          <div className="mt-4 flex gap-2" role="group" aria-label="Hành động nhanh">
            <Link
              to="/enterprise/talents"
              className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-700 transition-colors"
            >
              Xem nhân tài
            </Link>
            <Link
              to="/enterprise/internships"
              className="rounded-full border border-white/60 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-700 transition-colors"
            >
              Đăng tin tuyển dụng
            </Link>
          </div>
        </div>
      </div>

      <section aria-labelledby="kpi-heading" className="mb-6">
        <h2 id="kpi-heading" className="sr-only">
          Chỉ số quan trọng
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Hồ sơ phù hợp"
            value={data.matching_profiles}
            delta="Điểm năng lực ≥ 70"
            icon={<Users size={18} aria-hidden="true" />}
            color="text-portal"
          />
          <StatCard
            label="Tin tuyển dụng"
            value={data.post_count}
            delta={`${data.recent_posts.length} tin gần đây`}
            icon={<Briefcase size={18} aria-hidden="true" />}
            color="text-portal"
          />
          <StatCard
            label="Ứng viên"
            value={data.applicant_count}
            delta="Đã nộp hồ sơ"
            icon={<Search size={18} aria-hidden="true" />}
            color="text-portal"
          />
          <StatCard
            label="Tổng tài trợ"
            value={`${(data.total_sponsored / 1_000_000).toFixed(0)}M₫`}
            delta={`${data.sponsorship_count} dự án`}
            icon={<HandCoins size={18} aria-hidden="true" />}
            color="text-portal"
          />
        </div>
      </section>

      <section aria-labelledby="recent-posts-heading">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 id="recent-posts-heading" className="font-semibold text-ink">
              Tin tuyển dụng gần đây
            </h2>
            <span className="text-xs text-muted-light">Xem thêm trong "Tuyển thực tập"</span>
          </div>
          {data.recent_posts.length === 0 ? (
            <p className="text-sm text-muted" role="status">Chưa có tin tuyển dụng nào.</p>
          ) : (
            <ul className="space-y-3" role="list">
              {data.recent_posts.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3">
                  <div>
                    <div className="font-medium text-ink text-sm">{p.title}</div>
                    <div className="text-xs text-muted-light mt-0.5">
                      {p.slots} vị trí · {p.applicants} ứng viên
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      p.status === "open" ? "bg-portal-soft text-portal-dark" : "bg-canvas-soft text-muted"
                    }`}
                    aria-label={`Trạng thái: ${p.status === "open" ? "Đang tuyển" : "Đóng"}`}
                  >
                    {p.status === "open" ? "Đang tuyển" : "Đóng"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section aria-labelledby="top-talents-heading" className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 id="top-talents-heading" className="font-semibold text-ink flex items-center gap-2">
              <Star size={16} className="text-portal" aria-hidden="true" /> Nhân tài nổi bật
            </h2>
            <Link
              to="/enterprise/talents"
              className="text-xs text-portal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded"
            >
              Xem tất cả →
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="text-sm text-muted" role="status">Chưa có hồ sơ điểm cao (≥ 80).</p>
          ) : (
            <ul className="space-y-3" role="list">
              {top.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3">
                  <div>
                    <div className="font-medium text-ink text-sm">{t.full_name}</div>
                    <div className="text-xs text-muted-light mt-0.5">
                      {t.class_name} · Khối {t.grade}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-portal" aria-label={`Điểm năng lực ${t.talent_score}`}>★ {t.talent_score}</span>
                    <Link
                      to={`/passport/${t.id}`}
                      className="text-xs text-portal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 rounded"
                    >
                      Xem passport →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}