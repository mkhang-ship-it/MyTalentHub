import { Award, BarChart3, PieChart, Trophy, Users } from "lucide-react";
import { Card, PageHeader } from "../../components/ui";

const KPIS = [
  { label: "Học sinh hoạt động", value: "2,148", delta: "+12% so với tháng trước", chip: "bg-gradient-to-br from-violet-500 to-purple-700", icon: Users },
  { label: "Hoạt động/tháng", value: "1,820", delta: "+18% so với tháng trước", chip: "bg-gradient-to-br from-blue-500 to-indigo-700", icon: BarChart3 },
  { label: "Tỷ lệ tham gia", value: "87%", delta: "+4% so với tháng trước", chip: "bg-gradient-to-br from-orange-400 to-orange-600", icon: PieChart },
  { label: "Tỷ lệ hoàn thành", value: "92%", delta: "+2% so với tháng trước", chip: "bg-gradient-to-br from-pink-500 to-rose-600", icon: Trophy },
];

const DONUT = [
  { field: "Kỹ thuật", pct: 28, color: "#F97316" },
  { field: "Học thuật", pct: 24, color: "#FBBF24" },
  { field: "Kinh doanh", pct: 20, color: "#EC4899" },
  { field: "Nghệ thuật", pct: 16, color: "#8B5CF6" },
  { field: "Thể thao", pct: 12, color: "#14B8A6" },
];

const BARS = [
  { m: "T1", dk: 320, ht: 270 },
  { m: "T2", dk: 430, ht: 370 },
  { m: "T3", dk: 390, ht: 340 },
  { m: "T4", dk: 580, ht: 510 },
  { m: "T5", dk: 690, ht: 600 },
  { m: "T6", dk: 830, ht: 700 },
];

const TOPS = [
  { name: "Khối Kỹ thuật", sub: "+24% giờ trải nghiệm", chip: "bg-gradient-to-br from-orange-400 to-orange-600", bar: "w-3/4" },
  { name: "CLB Khởi nghiệp", sub: "12 dự án gọi vốn thành công", chip: "bg-gradient-to-br from-violet-500 to-purple-700", bar: "w-3/5" },
  { name: "Đội Robotics", sub: "Top 3 cuộc thi quốc gia", chip: "bg-gradient-to-br from-pink-500 to-rose-600", bar: "w-4/5" },
];

export default function Statistics() {
  const gradient = (() => {
    let acc = 0;
    return DONUT.map((s) => {
      const from = acc;
      acc += s.pct;
      return `${s.color} ${from}% ${acc}%`;
    }).join(", ");
  })();
  const maxBar = 830;

  return (
    <div>
      <PageHeader
        title="Thống kê"
        subtitle="Tổng quan năng lực toàn trường — dành cho ban giám hiệu (slide 18)."
      />

      {/* KPI (slide 18) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <div className="flex items-center gap-3">
              <span className={`h-12 w-12 shrink-0 rounded-full ${k.chip} text-white flex items-center justify-center shadow`}>
                <k.icon size={22} />
              </span>
              <div>
                <div className="text-xs text-muted">{k.label}</div>
                <div className="text-2xl font-extrabold text-ink leading-tight">{k.value}</div>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold text-emerald-600">↑ {k.delta}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut phân bổ (slide 18) */}
        <Card>
          <h2 className="font-bold text-ink">Phân bổ năng khiếu</h2>
          <p className="text-xs text-muted mb-4">Theo định hướng toàn trường</p>
          <div className="flex items-center gap-6">
            <div
              className="h-40 w-40 shrink-0 rounded-full"
              style={{
                background: `conic-gradient(${gradient})`,
                mask: "radial-gradient(circle, transparent 55%, black 56%)",
                WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
              }}
            />
            <div className="flex-1 space-y-2.5">
              {DONUT.map((s) => (
                <div key={s.field} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-muted">{s.field}</span>
                  <span className="font-bold text-ink">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Cột nhóm T1–T6 (slide 18) */}
        <Card>
          <h2 className="font-bold text-ink">Tham gia & hoàn thành</h2>
          <p className="text-xs text-muted mb-4">6 tháng gần nhất</p>
          <div className="flex items-end justify-between gap-3 h-48">
            {BARS.map((b) => (
              <div key={b.m} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-36">
                  <div
                    className="w-4 rounded-t bg-orange-500"
                    style={{ height: `${Math.round((b.dk / maxBar) * 100)}%` }}
                  />
                  <div
                    className="w-4 rounded-t bg-pink-500"
                    style={{ height: `${Math.round((b.ht / maxBar) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted font-medium">{b.m}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Đăng ký
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-pink-500" /> Hoàn thành
            </span>
          </div>
        </Card>
      </div>

      {/* Top khoa/khối (slide 18) */}
      <div className="mt-6">
        <h2 className="font-bold text-ink mb-3">Top khoa / khối nổi bật</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TOPS.map((t) => (
            <Card key={t.name}>
              <div className="flex items-center gap-3">
                <span className={`h-11 w-11 shrink-0 rounded-xl ${t.chip} text-white flex items-center justify-center font-bold`}>
                  {t.name.includes("Kỹ thuật") ? "</>" : "★"}
                </span>
                <div>
                  <div className="text-sm font-bold text-ink">{t.name}</div>
                  <div className="text-xs font-semibold text-emerald-600">{t.sub}</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-canvas-soft overflow-hidden">
                <div className={`h-full rounded-full hero-gradient ${t.bar}`} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
