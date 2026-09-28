/** Hộp thoại hiển thị kết quả phân tích AI và lộ trình (tiếng Việt). */
import type { AiAnalysis, AiRoadmap } from "./api";

interface KhungKetQuaProps {
  mo: boolean;
  dangTaiLoTrinh: boolean;
  phanTich: AiAnalysis | null;
  loTrinh: AiRoadmap | null;
  laDuPhong: boolean;
  onDong: () => void;
  onTaoLoTrinh: () => void;
}

export default function AiResultDialog({
  mo,
  dangTaiLoTrinh,
  phanTich,
  loTrinh,
  laDuPhong,
  onDong,
  onTaoLoTrinh,
}: KhungKetQuaProps) {
  if (!mo || !phanTich) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kết quả phân tích bằng AI"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onDong}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">Kết quả phân tích bằng AI</h2>
          <button
            type="button"
            onClick={onDong}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-canvas-soft"
            aria-label="Đóng kết quả phân tích"
          >
            Đóng
          </button>
        </div>

        {laDuPhong && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900" role="note">
            Đây là gợi ý theo quy tắc có sẵn vì backend chưa có khóa AI, không phải do Gemini tạo.
          </p>
        )}

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{phanTich.summary}</p>
        <p className="mt-2 text-xs text-muted">Độ tin cậy: {phanTich.confidence_score}/100</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-ink">Điểm mạnh</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {phanTich.strengths.map((diem) => (
                <li key={diem}>{diem}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Cần cải thiện</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {phanTich.weaknesses.map((diem) => (
                <li key={diem}>{diem}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">Lĩnh vực phù hợp</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {phanTich.recommended_fields.map((linhVuc) => (
              <span key={linhVuc} className="rounded-full bg-portal-soft px-2.5 py-1 text-xs font-semibold text-portal-dark">
                {linhVuc}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-bold text-ink">Gợi ý nghề nghiệp</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {phanTich.career_suggestions.map((nghe) => (
              <li key={nghe}>{nghe}</li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-ink">Lộ trình 3 tháng</h3>
            {!loTrinh && (
              <button
                type="button"
                onClick={onTaoLoTrinh}
                disabled={dangTaiLoTrinh}
                aria-busy={dangTaiLoTrinh}
                className="rounded-xl bg-portal px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {dangTaiLoTrinh ? "Đang tạo lộ trình…" : "Tạo lộ trình 3 tháng"}
              </button>
            )}
          </div>
          {!loTrinh && !dangTaiLoTrinh && (
            <p className="mt-1 text-[13px] text-muted">Nhấn nút để AI gợi ý lộ trình theo từng tháng (tốn thêm một lần gọi API).</p>
          )}
          {dangTaiLoTrinh && (
            <p className="mt-1 text-[13px] text-muted" role="status" aria-live="polite">
              Đang tạo lộ trình, vui lòng chờ trong giây lát…
            </p>
          )}
          {loTrinh && (
            <div className="mt-2 space-y-3">
              <p className="text-sm text-ink-soft">{loTrinh.overall_goal}</p>
              {loTrinh.months.map((thang) => (
                <div key={thang.month} className="rounded-xl border border-line bg-canvas-soft/50 p-3">
                  <div className="text-sm font-bold text-ink">
                    Tháng {thang.month}: {thang.title}
                  </div>
                  <div className="mt-1 text-[13px] text-ink-soft">Mục tiêu: {thang.goal}</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-soft">
                    {thang.actions.map((hanhDong) => (
                      <li key={hanhDong}>{hanhDong}</li>
                    ))}
                  </ul>
                  <div className="mt-1 text-[13px] text-muted">Kết quả mong đợi: {thang.expected_outcome}</div>
                </div>
              ))}
              {loTrinh.key_milestones.length > 0 && (
                <div>
                  <div className="text-[13px] font-bold text-ink">Cột mốc quan trọng</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-soft">
                    {loTrinh.key_milestones.map((moc) => (
                      <li key={moc}>{moc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
