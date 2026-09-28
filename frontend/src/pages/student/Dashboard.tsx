import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Flame, Sparkles, Trophy, Users } from "lucide-react";
import { get } from "../../api/client";
import { Card, Empty, ErrorBox, PageHeader, StatCard } from "../../components/ui";
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

/** Icon trạng thái kèm chữ cho badge bảng (file 00 mục 7.7: màu không là tín hiệu duy nhất). */
function iconTrangThai(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("hoàn thành") || s.includes("completed")) return "★";
  if (s.includes("duyệt") || s.includes("approved")) return "✓";
  if (s.includes("tham gia") || s.includes("registered") || s.includes("active") || s.includes("đang")) return "⟳";
  return "○";
}

export default function Dashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [dangTaiLai, setDangTaiLai] = useState(false);

  // Chuyển lỗi fetch thành thông điệp tiếng Việt rõ ràng (không hiện thô "API ... → 401").
  const fetchErrorMessage = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại để xem tổng quan cá nhân.";
    if (msg.includes("→ 403")) return "Bạn cần đăng nhập bằng tài khoản học sinh để xem tổng quan cá nhân.";
    return msg;
  };

  // Tải tổng quan (tách riêng để nút "Thử lại" gọi lại được — đặc tả 02 B7).
  const load = useCallback(() => {
    setDangTaiLai(true);
    setError("");
    get<Overview>("/student/overview")
      .then((d) => {
        setData(d);
        setDangTaiLai(false);
      })
      .catch((e) => {
        setError(fetchErrorMessage(e));
        setDangTaiLai(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Khung trang dùng chung: PageHeader luôn hiện để lỗi/skeleton không lệch bố cục.
  const khungTrang = (noiDung: React.ReactNode) => (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Tổng quan cá nhân"
        subtitle="Hiển thị điểm năng lực, huy hiệu, giờ trải nghiệm của bạn."
      />
      {noiDung}
    </div>
  );

  // Lỗi ngay dưới PageHeader + nút Thử lại (đặc tả 02 B7, ErrorBox mục 4.10).
  if (error) {
    return khungTrang(
      <ErrorBox
        message={error}
        retryLabel={dangTaiLai ? "Đang thử lại..." : "Thử lại"}
        onRetry={load}
      />
    );
  }

  // Skeleton khớp bố cục thật để không "nhảy" layout (đặc tả 02 B7, 00 mục 4.9).
  if (!data) {
    return khungTrang(
      <div aria-busy="true" aria-label="Đang tải tổng quan cá nhân">
        <div className="skeleton h-[132px] rounded-[20px] md:h-[148px]" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[116px] rounded-[20px]" />
          ))}
        </div>
        <div className="skeleton mt-8 h-[440px] rounded-[20px]" />
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="skeleton h-[240px] rounded-[20px]" />
          <div className="skeleton h-[240px] rounded-[20px]" />
        </div>
        <div className="skeleton mt-8 h-[260px] rounded-[20px]" />
        <p className="mt-4 text-center text-sm text-muted-strong">Đang tải…</p>
      </div>
    );
  }

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
  const heDaoTao = data.education_level === "CDDH" ? "Khoá" : "Khối";

  return khungTrang(
    <div className="space-y-8">
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

      {/* Hero banner: scrim bắt buộc + chữ trắng toàn phần (đặc tả 02 B2) */}
      <div
        className="relative overflow-hidden rounded-[20px] min-h-[132px] md:min-h-[148px] shadow-[0_8px_24px_rgba(51,50,77,.10)]"
        style={{
          backgroundImage:
            "linear-gradient(105deg, rgba(27,42,94,.62) 0%, rgba(27,42,94,.40) 55%, rgba(27,42,94,.18) 100%), var(--hero-gradient)",
          animation: "fadeUp 0.7s ease-out both",
        }}
      >
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-extrabold leading-[1.25] text-white">
              Chào mừng trở lại, {data.full_name}! 👋
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white">
              {data.experience_hours}h trải nghiệm · {heDaoTao} {data.grade} · Hạng {data.school_rank}/{data.school_total}
            </p>
            {/* Chip nền đặc trắng + chữ portal-dark (đặc tả 02 B2, 6,4–7,2:1) */}
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-bold text-portal-dark">
                <Flame size={14} fill="var(--portal)" className="text-portal" aria-hidden="true" />
                {data.streak > 0 ? `Chuỗi ${data.streak} ngày` : "Bắt đầu chuỗi hôm nay"}
              </span>
            </div>
          </div>
          {/* Hộp điểm: panel tách lớp, mobile full-width (đặc tả 02 B2) */}
          <div className="w-full rounded-2xl border border-[rgba(255,255,255,.22)] bg-[rgba(27,42,94,.50)] px-5 py-4 text-left sm:w-auto sm:min-w-[160px] sm:text-right">
            <div className="text-xs font-bold uppercase tracking-[0.06em] text-white">Điểm năng lực</div>
            <div className="text-[34px] sm:text-4xl font-extrabold leading-[1.05] tabular-nums text-white">{data.talent_score}</div>
          </div>
        </div>
      </div>

      {/* KPI: lưới 1/2/4 cột, icon统一 portal-dark (đặc tả 02 B3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" style={{ animation: "fadeUp 0.7s ease-out 0.1s both" }}>
        <StatCard label="Điểm năng lực" value={data.talent_score} delta="Thang điểm 100" icon={<Trophy size={18} />} color="bg-portal-soft text-portal-dark" />
        <StatCard label="Giờ trải nghiệm" value={`${data.experience_hours}h`} delta="Tích lũy tự động qua check-in" icon={<Flame size={18} />} color="bg-portal-soft text-portal-dark" />
        <StatCard label="Xếp hạng" value={`#${data.school_rank}/${data.school_total}`} delta={`${heDaoTao} ${data.grade} · ${data.school_total} bạn`} icon={<Users size={18} />} color="bg-portal-soft text-portal-dark" />
        <StatCard label="Huy hiệu đã mở" value={data.unlocked_badges.length} delta="Explorer/Innovator/Expert/Master" icon={<Sparkles size={18} />} color="bg-portal-soft text-portal-dark" />
      </div>

      <Card className="overflow-hidden" interactive>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-[-0.01em] text-ink">Skill Orbit</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-strong">Năng lực và hành trình của bạn trong một không gian dữ liệu.</p>
          </div>
          <span className="inline-flex h-6 items-center rounded-full bg-portal-soft px-2.5 text-xs font-semibold text-portal-dark">{data.talent_score}/100</span>
        </div>
        {/* Component 3D giữ nguyên; đã có fallback 2D nội bộ khi WebGL lỗi (không sửa three/**) */}
        <SkillOrbit data={orbitData} className="w-full" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ animation: "fadeUp 0.7s ease-out 0.2s both" }}>
        {/* AI analysis */}
        <Card className="hover-lift">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-portal" aria-hidden="true" />
            <h3 className="text-base font-bold text-ink">AI phân tích năng lực</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft min-h-[66px]">
            {data.ai_analysis ?? "Đang phân tích — hoàn thành bài test năng khiếu để nhận gợi ý."}
          </p>
          <a
            href="/student/roadmap"
            className="mt-4 block rounded-2xl bg-portal-soft border p-4 text-sm font-semibold text-portal-dark hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(51,50,77,.10)] hover:border-portal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal focus-visible:ring-offset-2 transition-all duration-200 ease-out"
            style={{ borderColor: "color-mix(in srgb, var(--portal) 25%, transparent)" }}
          >
            💡 Xem lộ trình 3 tháng được AI gợi ý riêng cho bạn →
          </a>
        </Card>

        {/* Roadmap */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-portal" aria-hidden="true" />
            <h3 className="text-base font-bold text-ink">Lộ trình gợi ý 3 tháng tới</h3>
          </div>
          <div className="space-y-4">
            {data.roadmap.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-muted-strong">
                <Sparkles size={16} className="shrink-0 text-muted" aria-hidden="true" />
                Chưa có lộ trình — AI sẽ gợi ý sau bài khảo sát năng khiếu.
              </p>
            )}
            {data.roadmap.map((r, idx, arr) => (
              <div key={r.title} className="relative flex gap-3">
                {/* Đường nối 2px từ đáy ô tròn tới mục tiếp theo */}
                {idx < arr.length - 1 && (
                  <span className="absolute top-8 bottom-[-16px] w-[2px] bg-line" style={{ marginLeft: 15 }} aria-hidden="true" />
                )}
                <div className="relative z-10 shrink-0 h-8 w-8 rounded-full bg-portal-soft text-portal-dark flex items-center justify-center text-xs font-bold">
                  T{idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink">{r.title}</div>
                  <div className="text-[13px] leading-relaxed text-muted-strong">{r.content}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Hoạt động của bạn: bảng ≥768, danh sách thẻ <768 (đặc tả 02 B6 + 00 mục 4.7) */}
      <div className="mt-0" style={{ animation: "fadeUp 0.7s ease-out 0.3s both" }}>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} className="text-portal" aria-hidden="true" />
            <h3 className="text-base font-bold text-ink">Hoạt động của bạn</h3>
          </div>
          {data.activities.length === 0 ? (
            <Empty
              text="Bạn chưa tham gia hoạt động nào — khám phá sân chơi ngay!"
              icon={<CalendarDays size={32} aria-hidden="true" />}
              action={
                <a
                  href="/student/activities"
                  className="btn-secondary inline-flex h-9 px-3.5 text-[13px]"
                >
                  Khám phá sân chơi →
                </a>
              }
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto" role="region" aria-label="Danh sách hoạt động đã tham gia" tabIndex={0}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-[0.06em] text-muted-strong">
                      <th className="px-3 py-2.5" scope="col">Hoạt động</th>
                      <th className="px-3 py-2.5" scope="col">Lĩnh vực</th>
                      <th className="px-3 py-2.5" scope="col">Trạng thái</th>
                      <th className="px-3 py-2.5 text-right" scope="col">Giờ tích lũy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activities.map((a) => (
                      <tr key={a.id} className="border-t border-line hover:bg-portal-soft/40 transition-colors duration-150 ease-out">
                        <td className="px-3 py-3 font-semibold text-ink">{a.title}</td>
                        <td className="px-3 py-3 text-ink-soft">{FIELD_LABELS[a.field] ?? a.field}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex h-6 items-center gap-1 px-2.5 text-xs font-semibold rounded-full bg-portal-soft text-portal-dark">
                            <span aria-hidden="true">{iconTrangThai(a.status)}</span>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-ink">{a.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Danh sách thẻ cho mobile: nhãn trái 12/600, giá trị phải 13/600 */}
              <div className="space-y-2 md:hidden" role="list" aria-label="Danh sách hoạt động đã tham gia">
                {data.activities.map((a) => (
                  <div key={a.id} role="listitem" className="rounded-2xl border border-line p-4">
                    <div className="text-sm font-semibold text-ink">{a.title}</div>
                    <dl className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-xs font-semibold text-muted-strong">Lĩnh vực</dt>
                        <dd className="text-[13px] font-semibold text-ink">{FIELD_LABELS[a.field] ?? a.field}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-strong">Trạng thái</dt>
                        <dd className="text-[13px] font-semibold text-ink">
                          <span aria-hidden="true">{iconTrangThai(a.status)} </span>
                          {a.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-muted-strong">Giờ tích lũy</dt>
                        <dd className="text-[13px] font-semibold tabular-nums text-ink">{a.hours}h</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
