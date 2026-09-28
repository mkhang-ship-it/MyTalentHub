import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { get } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { AiAnalyzeButton } from "../../components/ai";

interface Overview {
  id: number;
  roadmap: { title: string; content: string }[];
  ai_analysis: string | null;
}

export default function Roadmap() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    get<Overview>("/student/overview").then(setData).catch((e) => setError(String((e as Error).message || e)));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading />;

  return (
    <div>
      <PageHeader
        title="Lộ trình AI cá nhân hóa"
        subtitle="AI phân tích kết quả test năng khiếu + quá trình trải nghiệm, gợi ý lộ trình phát triển từng tháng (slide 16)."
      />

      <Card className="mb-6">
        <h2 className="mb-1 font-semibold text-ink">Phân tích mới bằng AI</h2>
        <p className="mb-3 text-sm text-muted">
          Nhấn nút để gọi AI phân tích lại hồ sơ hiện tại của bạn (điểm năng lực, kỹ năng, đánh giá, hoạt động).
        </p>
        <AiAnalyzeButton studentId={data.id} />
      </Card>

      {data.ai_analysis && (
        <Card interactive reveal revealDelay={0.1} className="rounded-2xl hero-gradient p-5 text-white mb-6 shadow-lg transition-responsive">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} />
            <h2 className="font-semibold">AI phân tích năng lực của bạn</h2>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{data.ai_analysis}</p>
        </Card>
      )}

      <h2 className="text-lg font-semibold text-ink mb-4">Lộ trình 3 tháng tiếp theo</h2>
      <div className="relative">
        {/* timeline */}
        <div className="absolute left-[22px] top-2 bottom-2 w-0.5 hero-gradient" />
        <div className="space-y-4">
          {data.roadmap.length === 0 && (
            <Card>
              <p className="text-sm text-muted">
                Chưa có lộ trình — hoàn thành bài khảo sát năng khiếu ở mục "Khám phá năng khiếu" để AI gợi ý.
              </p>
            </Card>
          )}
          {data.roadmap.map((r, i) => (
            <Card key={i} interactive reveal revealDelay={0.05 * (i + 1)} className="relative pl-14 transition-responsive hover-lift">
              <div className="absolute left-[10px] top-5 h-6 w-6 rounded-full bg-white border-2 border-portal flex items-center justify-center transition-responsive shadow-sm hover:shadow-md">
                <CheckCircle2 size={14} className="text-portal" />
              </div>
              <div className="text-xs text-portal font-semibold uppercase tracking-wide">{r.title}</div>
              <div className="text-sm text-muted mt-0.5">{r.content}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}