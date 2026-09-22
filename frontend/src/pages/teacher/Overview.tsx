import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, School } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, StatCard } from "../../components/ui";
import { Link } from "react-router-dom";

interface Overview {
  id: number;
  full_name: string;
  subject: string;
  activity_count: number;
  learner_count: number;
  eval_count: number;
  homeroom_classes: { id: number; name: string; grade: number }[];
  activities: { id: number; title: string; field: string; capacity: number; status: string; start_date: string | null }[];
}

export default function Overview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Overview>("/teacher/overview").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      {/* Hero chào mừng (slide 20) */}
      <div className="relative rounded-2xl overflow-hidden mb-6 hero-gradient">
        <div className="relative px-6 py-5">
          <p className="text-sm text-white/80">Xin chào</p>
          <h2 className="text-2xl font-extrabold text-white">
            {data.full_name} 👩‍🏫
          </h2>
          <p className="text-sm text-white/80 mt-1">
            Hôm nay có {data.activity_count} sân chơi đang mở và {data.eval_count} bài
            đánh giá đã chấm.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink">
              + Tạo sân chơi mới
            </span>
            <span className="rounded-full border border-white/60 px-4 py-1.5 text-xs font-semibold text-white">
              Vào chấm điểm
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sân chơi phụ trách" value={data.activity_count} icon={<BookOpen size={18} />} color="text-portal" />
        <StatCard label="Học viên" value={data.learner_count} icon={<GraduationCap size={18} />} color="text-portal" />
        <StatCard label="Bài đánh giá đã chấm" value={data.eval_count} icon={<ClipboardCheck size={18} />} color="text-portal" />
        <StatCard label="Lớp chủ nhiệm" value={data.homeroom_classes.length} icon={<School size={18} />} color="text-portal-dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-ink">Sân chơi của tôi</h2>
              <Link to="/teacher/activities" className="text-xs text-portal hover:underline">
                Quản lý →
              </Link>
            </div>
            {data.activities.length === 0 ? (
              <p className="text-sm text-muted">Chưa phụ trách sân chơi nào.</p>
            ) : (
              <div className="space-y-3">
                {data.activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-line bg-canvas-soft/50 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium text-ink text-sm">{a.title}</div>
                      <div className="text-xs text-muted-light mt-0.5 capitalize">
                        {a.field.replace("_", " ")} · {a.start_date ?? "Sắp mở"}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        a.status === "open" ? "bg-portal-soft text-portal" : "bg-canvas-soft text-muted"
                      }`}
                    >
                      {a.status === "open" ? "Đang mở" : a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold text-ink mb-3">Lớp chủ nhiệm</h2>
            {data.homeroom_classes.length === 0 ? (
              <p className="text-sm text-muted">Không phụ trách lớp nào.</p>
            ) : (
              <div className="space-y-2">
                {data.homeroom_classes.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-portal-soft px-4 py-3"
                  >
                    <div className="font-semibold text-ink text-sm">{c.name}</div>
                    <div className="text-xs text-muted">Khối {c.grade}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-portal to-portal-dark text-white p-5">
            <h3 className="font-semibold mb-1">Bộ tiêu chí chấm điểm 📋</h3>
            <p className="text-sm text-violet-100">
              Rubric 4 tiêu chí: <b>Chuyên môn 40</b> · <b>Sáng tạo 20</b> · <b>Làm việc nhóm 20</b> ·{" "}
              <b>Kỷ luật 20</b>. Tổng tối đa 100 điểm.
            </p>
            <Link
              to="/teacher/grading"
              className="mt-3 inline-block text-xs px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25"
            >
              Đi chấm điểm →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}