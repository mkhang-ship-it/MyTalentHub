import { useEffect, useState } from "react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Activity {
  id: number;
  title: string;
  field: string;
}

interface Student {
  registration_id: number;
  student_id: number;
  full_name: string;
  class_name: string;
  hours: number;
  role: string;
}

const CRITERIA = [
  { key: "chuyen_mon", label: "Chuyên môn", max: 40 },
  { key: "sang_tao", label: "Sáng tạo", max: 20 },
  { key: "ky_luat", label: "Kỷ luật", max: 20 },
  { key: "lam_viec_nhom", label: "Làm việc nhóm", max: 20 },
] as const;

type Criterion = (typeof CRITERIA)[number]["key"];

const BLANK = { chuyen_mon: 0, sang_tao: 0, lam_viec_nhom: 0, ky_luat: 0 };

export default function Grading() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityId, setActivityId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [scores, setScores] = useState<Record<number, Record<Criterion, number>>>({});
  const [comment, setComment] = useState<Record<number, string>>({});
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    get<Activity[]>("/teacher/activities").then((d) => {
      setActivities(d);
      if (d.length > 0) setActivityId(d[0].id);
    }).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  useEffect(() => {
    if (!activityId) return;
    setStudents(null);
    get<Student[]>(`/teacher/activities/${activityId}/students`)
      .then((d) => {
        setStudents(d);
        if (d.length > 0) setSelectedId(d[0].registration_id);
      })
      .catch(() => setStudents([]));
  }, [activityId]);

  const submit = async (s: Student) => {
    const sc = scores[s.registration_id] ?? { ...BLANK };
    await post("/teacher/evaluations", {
      activity_id: activityId,
      student_id: s.student_id,
      chuyen_mon: sc.chuyen_mon,
      sang_tao: sc.sang_tao,
      lam_viec_nhom: sc.lam_viec_nhom,
      ky_luat: sc.ky_luat,
      comment: comment[s.registration_id] ?? "",
    });
    setOkMsg(`Đã lưu điểm cho ${s.full_name}`);
    setTimeout(() => setOkMsg(""), 2500);
  };

  if (error) return <ErrorBox message={error} />;

  const selected = students?.find((s) => s.registration_id === selectedId) ?? null;
  const sc = selected ? scores[selected.registration_id] ?? { ...BLANK } : { ...BLANK };
  const activity = activities.find((a) => a.id === activityId);

  const setScore = (key: Criterion, v: number) => {
    if (!selected) return;
    const c = CRITERIA.find((x) => x.key === key)!;
    setScores({
      ...scores,
      [selected.registration_id]: { ...sc, [key]: Math.min(c.max, Math.max(0, v)) },
    });
  };

  return (
    <div>
      <PageHeader
        title="Chấm điểm"
        subtitle={`${students?.length ?? 0} bài đang chờ — hãy hoàn tất chấm điểm (slide 22).`}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted">Sân chơi:</span>
        <select
          value={activityId ?? ""}
          onChange={(e) => setActivityId(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-line bg-white text-sm"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
        {okMsg && <span className="text-sm text-portal font-medium">{okMsg}</span>}
      </div>

      {!students ? (
        <Loading />
      ) : students.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Sân chơi này chưa có học viên đăng ký.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Hàng chờ (slide 22) */}
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-3">
              Hàng chờ
            </div>
            <div className="space-y-2">
              {students.map((s) => {
                const active = s.registration_id === selectedId;
                return (
                  <button
                    key={s.registration_id}
                    onClick={() => setSelectedId(s.registration_id)}
                    className={`w-full text-left rounded-xl px-4 py-3 transition ${
                      active ? "cta-gradient text-white shadow" : "hover:bg-canvas-soft"
                    }`}
                  >
                    <div className={`text-sm font-bold ${active ? "text-white" : "text-ink"}`}>
                      {s.full_name}
                    </div>
                    <div className={`text-xs mt-0.5 ${active ? "text-white/80" : "text-muted"}`}>
                      {activity?.title} · {s.class_name}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Đang chấm (slide 22) */}
          <Card className="lg:col-span-2">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    Đang chấm
                  </div>
                  <span className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold">
                    {selected.full_name.charAt(0)}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-ink">{selected.full_name}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {activity?.title} · {selected.class_name}
                </p>

                <div className="mt-5 space-y-4">
                  {CRITERIA.map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-ink">
                          {c.label} ({c.max})
                        </span>
                        <span className="font-bold text-orange-500">
                          {sc[c.key]} <span className="font-normal text-muted">/ {c.max}</span>
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={c.max}
                        value={sc[c.key]}
                        onChange={(e) => setScore(c.key, Number(e.target.value))}
                        className="w-full accent-orange-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="text-sm font-medium text-ink mb-1.5">Nhận xét</div>
                  <textarea
                    value={comment[selected.registration_id] ?? ""}
                    onChange={(e) =>
                      setComment({ ...comment, [selected.registration_id]: e.target.value })
                    }
                    placeholder="Ghi nhận tiến bộ, góp ý cải thiện..."
                    rows={3}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-line outline-none focus:border-portal resize-y"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setComment({ ...comment, [selected.registration_id]: "" })}
                    className="text-sm px-4 py-2 rounded-full border border-line font-semibold text-ink hover:bg-canvas-soft"
                  >
                    Lưu nháp
                  </button>
                  <button
                    onClick={() => submit(selected)}
                    className="text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold"
                  >
                    ✓ Gửi đánh giá
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Chọn học viên trong hàng chờ để chấm.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
