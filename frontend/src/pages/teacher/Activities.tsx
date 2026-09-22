import { useCallback, useEffect, useState } from "react";
import { Clock, MoreHorizontal, Plus, Users } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Activity {
  id: number;
  title: string;
  field: string;
  description: string | null;
  capacity: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  registered_count: number;
}

const FIELDS = ["ky_thuat", "nghe_thuat", "kinh_doanh", "the_thao", "hoc_thuat", "sang_tao"];

const FIELD_ICONS = [
  "bg-gradient-to-br from-orange-400 to-orange-600",
  "bg-gradient-to-br from-pink-500 to-rose-600",
  "bg-gradient-to-br from-violet-500 to-purple-700",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
];

export default function Activities() {
  const [data, setData] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", field: "ky_thuat", description: "", capacity: 30 });

  const load = useCallback(() => {
    get<Activity[]>("/teacher/activities").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.title.trim()) return;
    await post("/teacher/activities", { ...form, start_date: null, end_date: null });
    setShowForm(false);
    setForm({ title: "", field: "ky_thuat", description: "", capacity: 30 });
    load();
  };

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Sân chơi của tôi"
        subtitle="Tạo, mở đăng ký và quản lý các hoạt động bạn phụ trách (slide 21)."
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full cta-gradient text-white font-semibold"
          >
            <Plus size={16} /> Tạo sân chơi mới
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6 border-line">
          <h3 className="font-semibold text-ink mb-3">Sân chơi mới</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tên sân chơi *"
              className="px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal"
            />
            <div className="flex gap-3">
              <select
                value={form.field}
                onChange={(e) => setForm({ ...form, field: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border border-line text-sm bg-white"
              >
                {FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ")}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                placeholder="Sức chứa"
                className="w-24 px-3 py-2 rounded-xl border border-line text-sm outline-none"
              />
            </div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn"
              className="md:col-span-2 px-3 py-2 rounded-xl border border-line text-sm outline-none focus:border-portal"
            />
            <div className="md:col-span-2 flex gap-2">
              <button onClick={create} className="text-sm px-4 py-2 rounded-xl bg-portal text-white font-medium">
                Lưu
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-xl bg-canvas-soft text-muted">
                Hủy
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-light text-xs uppercase tracking-wider border-b border-line bg-canvas-soft/60">
              <th className="px-5 py-3">Hoạt động</th>
              <th className="px-5 py-3">Lĩnh vực</th>
              <th className="px-5 py-3">Thời gian</th>
              <th className="px-5 py-3">Học viên</th>
              <th className="px-5 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  Chưa có sân chơi nào — bấm "Tạo sân chơi mới" để bắt đầu.
                </td>
              </tr>
            )}
            {data.map((a, i) => (
              <tr key={a.id} className="border-b border-line hover:bg-canvas-soft/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`h-9 w-9 shrink-0 rounded-full ${FIELD_ICONS[i % FIELD_ICONS.length]} text-white flex items-center justify-center`}>
                      <Users size={16} />
                    </span>
                    <span className="font-semibold text-ink">{a.title}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-canvas-soft text-muted font-medium capitalize">
                    {a.field.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Clock size={13} /> {a.start_date ?? "Sắp mở"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Users size={13} /> {a.registered_count}/{a.capacity}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-muted hover:text-ink" title="Tùy chọn">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <div className="text-xs text-muted">Đang phụ trách</div>
        <div className="text-lg font-extrabold text-ink">
          {data.length} sân chơi · {data.reduce((s, a) => s + a.registered_count, 0)} học viên
        </div>
      </Card>
    </div>
  );
}