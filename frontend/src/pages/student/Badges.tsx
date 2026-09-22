import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface Badge {
  code: string;
  name: string;
  min_hours: number;
  icon: string;
  color: string;
  description: string;
  unlocked: boolean;
  current_hours: number;
  progress_pct: number;
}

export default function Badges() {
  const [data, setData] = useState<Badge[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Badge[]>("/student/badges").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  const unlocked = data.filter((b) => b.unlocked).length;

  if (data.length === 0) {
    return (
      <div>
        <PageHeader
          title="Huy hiệu năng lực"
          subtitle="Chưa có huy hiệu nào trong hệ thống."
        />
        <div className="text-center py-12" role="status" aria-live="polite">
          <Award size={48} className="mx-auto text-muted-light" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">Chưa có huy hiệu nào.</p>
          <p className="mt-1 text-xs text-muted-light">Liên hệ quản trị viên để thiết lập huy hiệu.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Huy hiệu năng lực"
        subtitle={`Đã mở khóa ${unlocked}/${data.length} huy hiệu — tích lũy giờ trải nghiệm để thăng cấp (slide 17).`}
      />

      <div className="rounded-2xl border border-line bg-white p-5 mb-6" role="progressbar" aria-valuenow={(unlocked / Math.max(data.length, 1)) * 100} aria-valuemin={0} aria-valuemax={100} aria-label={`Tiến trình tổng: ${unlocked} trên ${data.length} huy hiệu`}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">Tiến trình tổng</span>
          <span className="font-semibold text-ink tabular-nums">
            {unlocked}/{data.length} huy hiệu
          </span>
        </div>
        <div className="h-3 rounded-full bg-canvas-soft overflow-hidden">
          <div
            className="h-full rounded-full hero-gradient"
            style={{ width: `${(unlocked / Math.max(data.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.map((b) =>
          b.unlocked ? (
            <article
              key={b.code}
              className="relative rounded-2xl hero-gradient p-5 text-white shadow-lg flex items-center gap-4"
              aria-labelledby={`badge-${b.code}-name`}
            >
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center" aria-hidden="true">
                <Award size={30} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div id={`badge-${b.code}-name`} className="font-bold text-lg">{b.name}</div>
                <div className="text-sm text-white/85">{b.description}</div>
              </div>
              <span className="shrink-0 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold" aria-label={`${b.name} đã đạt`}>
                Đã đạt
              </span>
            </article>
          ) : (
            <article key={b.code} className="relative" aria-labelledby={`badge-locked-${b.code}-name`}>
              <Card>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-2xl bg-canvas-soft text-muted flex items-center justify-center" aria-hidden="true">
                    <Award size={30} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div id={`badge-locked-${b.code}-name`} className="font-bold text-lg text-ink">{b.name}</div>
                    <div className="text-sm text-muted">
                      {b.min_hours} giờ trải nghiệm — chuyên gia trẻ
                    </div>
                  </div>
                </div>
                {/* progress */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted mb-1.5">
                    <span>Tiến độ</span>
                    <span className="font-semibold text-ink tabular-nums">
                      {b.current_hours}/{b.min_hours}h
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-soft overflow-hidden" role="progressbar" aria-valuenow={b.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Huy hiệu ${b.name}: ${b.progress_pct} phần trăm, ${b.current_hours} trên ${b.min_hours} giờ`}>
                    <div
                      className="h-full rounded-full hero-gradient"
                      style={{ width: `${b.progress_pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            </article>
          )
        )}
      </div>
    </div>
  );
}