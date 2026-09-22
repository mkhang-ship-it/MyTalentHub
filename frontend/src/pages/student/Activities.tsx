import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Search, Users } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Activity {
  id: number;
  title: string;
  field: string;
  description: string | null;
  capacity: number;
  start_date: string | null;
  registered: boolean;
  slots_left: number;
}

const FIELD_NAMES: Record<string, string> = {
  nghe_thuat: "Nghệ thuật",
  the_thao: "Thể thao",
  kinh_doanh: "Kinh doanh",
  ky_thuat: "Kỹ thuật",
  hoc_thuat: "Học thuật",
  sang_tao: "Sáng tạo",
};

/** Banner card theo lĩnh vực (slide 13): Kỹ thuật/Công nghệ = cam, còn lại = hồng-tím */
function fieldBanner(field: string): string {
  return field === "ky_thuat" || field === "hoc_thuat"
    ? "field-banner-tech"
    : "hero-gradient";
}

export default function Activities() {
  const [data, setData] = useState<Activity[] | null>(null);
  const [field, setField] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [registeringId, setRegisteringId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (field) params.set("field", field);
    if (q) params.set("q", q);
    get<Activity[]>(`/student/activities?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(String(e.message || e)));
  }, [field, q]);

  useEffect(() => {
    load();
  }, [load]);

  const register = async (id: number) => {
    setRegisteringId(id);
    setError("");
    try {
      await post(`/student/activities/${id}/register`, {});
      load();
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setRegisteringId(null);
    }
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const filters = ["", ...Object.keys(FIELD_NAMES)];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <PageHeader
          title="Đăng ký hoạt động"
          subtitle="Săn slot các lab, câu lạc bộ, cuộc thi đang mở."
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo lĩnh vực">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              aria-pressed={field === f}
              aria-label={f === "" ? "Tất cả lĩnh vực" : `Lĩnh vực ${FIELD_NAMES[f]}`}
              className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-colors ${
                field === f
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-muted border-line hover:border-portal"
              }`}
            >
              {f === "" ? "Tất cả" : FIELD_NAMES[f]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex rounded-xl bg-white border border-line overflow-hidden items-center px-3 mb-6 max-w-sm">
        <label htmlFor="activity-search" className="sr-only">Tìm hoạt động</label>
        <Search size={15} className="text-muted-light" aria-hidden="true" />
        <input
          id="activity-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm hoạt động..."
          className="px-2 py-2 text-sm outline-none w-full bg-transparent"
          autoComplete="off"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((a) => {
          const taken = Math.max(0, a.capacity - a.slots_left);
          const pct = a.capacity > 0 ? Math.round((taken / a.capacity) * 100) : 0;
          return (
            <div key={a.id} className="rounded-2xl border border-line bg-white overflow-hidden shadow-soft">
              {/* Banner màu theo lĩnh vực (slide 13) */}
              <div className={`${fieldBanner(a.field)} px-4 pt-3 pb-8`}>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/25 text-white font-medium">
                  {FIELD_NAMES[a.field] ?? a.field}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-ink">{a.title}</h3>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} /> {a.start_date ?? "Sắp mở"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} /> {a.description ?? "Địa điểm cập nhật sau"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} /> {taken}/{a.capacity}
                    <span className="ml-auto font-semibold text-emerald-600">
                      {a.slots_left > 0 ? `Còn ${a.slots_left} chỗ` : "Hết chỗ"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-canvas-soft overflow-hidden">
                  <div className="h-full rounded-full hero-gradient" style={{ width: `${pct}%` }} />
                </div>
                <button
                  onClick={() => register(a.id)}
                  disabled={a.registered || a.slots_left <= 0 || registeringId === a.id}
                  className="mt-3 w-full text-sm py-2 rounded-full font-semibold text-white cta-gradient disabled:opacity-40"
                >
                  {registeringId === a.id ? "Đang đăng ký..." : a.registered ? "Đã đăng ký ✓" : "Đăng ký ngay"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner tham gia (slide 13) */}
      <Card className="mt-6">
        <div className="flex items-center gap-4">
          <span className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center">
            <CalendarDays size={22} />
          </span>
          <div>
            <div className="font-bold text-ink">Tham gia – Trải nghiệm – Phát triển</div>
            <p className="text-sm text-muted">
              Tham gia các hoạt động phù hợp với sở thích để nâng cao kỹ năng mỗi ngày.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
