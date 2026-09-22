import { useEffect, useState } from "react";
import { Award, BookOpen, Briefcase, Star } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Profile {
  full_name: string;
  class_name: string;
  grade: number;
  talent_score: number;
  experience_hours: number;
  interests: string | null;
  bio: string | null;
  skills: { code: string; name: string; level: number }[];
  badges: { code: string; name: string; icon: string; color: string }[];
  evaluation_count: number;
  certificates: { title: string; issuer: string; issued_at: string | null }[];
  projects: { id: number; title: string; field: string; status: string; role: string }[];
}

interface Evaluation {
  id: number;
  activity: string;
  reviewer: string;
  criteria: { name: string; score: number; max: number }[];
  total: number;
  xep_loai: string;
  comment: string | null;
  date: string;
}

const SKILL_BARS = ["skillbar-a", "skillbar-b", "skillbar-c", "skillbar-d"];

export default function Profile() {
  const [data, setData] = useState<Profile | null>(null);
  const [evals, setEvals] = useState<Evaluation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Profile>("/student/profile").then(setData).catch((e) => setError(String(e.message || e)));
    get<Evaluation[]>("/student/evaluations").then(setEvals).catch(() => setEvals([]));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader title="Hồ sơ năng lực" subtitle="Quản lý thông tin cá nhân, theo dõi năng lực, thành tích, chứng chỉ và dự án (slide 11)." />

      {/* Header card với cover gradient (slide 11) */}
      <Card className="overflow-hidden !p-0 mb-6">
        <div className="h-24 hero-gradient" />
        <div className="px-6 pb-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <div className="-mt-10 h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg border-4 border-white">
                {data.full_name.charAt(0)}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-extrabold text-ink">{data.full_name}</h2>
                <p className="text-sm text-muted">
                  Lớp {data.class_name} · Khối {data.grade}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <button className="rounded-full border border-line bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-canvas-soft">
                Chia sẻ hồ sơ
              </button>
              <button className="rounded-full cta-gradient px-4 py-1.5 text-xs font-semibold text-white">
                Chỉnh sửa
              </button>
            </div>
          </div>
          {/* Stats cam (slide 11) */}
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4">
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.talent_score}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Điểm năng lực</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.badges.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Huy hiệu</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-orange-500">{data.projects.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Dự án</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kỹ năng — 2 cột + thanh gradient (slide 11) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Kỹ năng</h2>
          </div>
          {data.skills.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <BookOpen size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa có kỹ năng được đánh giá.</p>
              <p className="mt-1 text-xs text-muted-light">Hoàn thành bài test hoặc nhận đánh giá từ GV để thấy kỹ năng ở đây.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4" role="list" aria-label="Danh sách kỹ năng">
              {data.skills.map((s, i) => (
                <div key={s.code} role="listitem">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="text-muted tabular-nums">{s.level * 10}</span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-soft overflow-hidden" role="progressbar" aria-valuenow={Math.min(100, s.level * 10)} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.name}: ${s.level * 10} phần trăm`}>
                    <div
                      className={`h-full rounded-full ${SKILL_BARS[i % SKILL_BARS.length]}`}
                      style={{ width: `${Math.min(100, s.level * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          {(data.interests || data.bio) && (
            <div className="mt-4 text-sm text-muted border-t border-line pt-3">
              {data.interests && <p><span className="font-medium text-ink">Sở thích:</span> {data.interests}</p>}
              {data.bio && <p className="mt-1"><span className="font-medium text-ink">Giới thiệu:</span> {data.bio}</p>}
            </div>
          )}
        </Card>

        {/* Chứng chỉ (slide 11) */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Chứng chỉ</h2>
          </div>
          {data.certificates.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Award size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa có chứng chỉ nào.</p>
              <p className="mt-1 text-xs text-muted-light">Chứng chỉ sẽ hiện ở đây sau khi bạn hoàn thành các khóa học.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.certificates.map((c, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center">
                    <Award size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{c.title}</div>
                    <div className="text-xs text-muted">
                      {c.issuer}{c.issued_at ? ` · ${c.issued_at}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Dự án đã tham gia (slide 11) */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-pink-500" />
            <h2 className="font-semibold text-ink">Dự án đã tham gia</h2>
          </div>
          {data.projects.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Briefcase size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa tham gia dự án nào.</p>
              <p className="mt-1 text-xs text-muted-light">Dự án sẽ hiện ở đây khi bạn tham gia các hoạt động nhóm.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.projects.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{p.title}</div>
                    <div className="text-xs text-muted mt-1 capitalize">
                      {p.field.replace("_", " ")} · {p.status}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full cta-gradient px-2.5 py-1 text-[11px] font-semibold text-white">
                    {p.role === "owner" ? "Trưởng nhóm" : "Thành viên"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Đánh giá từ GV/HLV — slide 15 */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} className="text-portal" />
            <h2 className="font-semibold text-ink">Đánh giá từ giáo viên & huấn luyện viên</h2>
          </div>
          {!evals ? (
            <Loading />
          ) : evals.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <Star size={32} className="mx-auto text-muted-light" aria-hidden="true" />
              <p className="mt-2 text-sm text-muted">Chưa có đánh giá nào được công bố.</p>
              <p className="mt-1 text-xs text-muted-light">Đánh giá từ GV/HLV sẽ hiện ở đây khi có.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {evals.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-ink">{ev.activity}</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-portal-soft text-portal-dark font-medium">
                      {ev.total}/100 · {ev.xep_loai}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ev.criteria.map((c) => (
                      <div key={c.name} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-muted">{c.name}</span>
                          <span className="font-medium text-ink">
                            {c.score}/{c.max}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-canvas-soft overflow-hidden">
                          <div
                            className="h-full rounded-full hero-gradient"
                            style={{ width: `${Math.min(100, (c.score / c.max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {ev.comment && (
                    <p className="mt-3 text-sm text-muted italic">“{ev.comment}”</p>
                  )}
                  <div className="mt-2 text-xs text-muted-light">
                    {ev.reviewer} · {ev.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
