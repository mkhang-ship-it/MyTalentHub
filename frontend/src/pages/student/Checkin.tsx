import { useEffect, useState } from "react";
import { CheckCircle2, History, ScanLine } from "lucide-react";
import { get, post } from "../../api/client";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";

interface CheckinResult {
  ok: boolean;
  message: string;
  registration_id: number;
  hours: number;
  chk_total: number | null;
}

interface CheckinItem {
  id: number;
  activity: string;
  qr_code: string;
  hours_added: number;
  checked_in_at: string;
}

export default function Checkin() {
  const [qr, setQr] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [history, setHistory] = useState<CheckinItem[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadHistory = () => {
    get<CheckinItem[]>("/student/checkins")
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  useEffect(loadHistory, []);

  const doCheckin = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await post<CheckinResult>(
        `/student/checkin?qr_code=${encodeURIComponent(qr || "DEMO-QR")}`,
        {}
      );
      setResult(res);
      setQr("");
      loadHistory();
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Check-in hoạt động"
        subtitle="Quét mã QR tại buổi sinh hoạt để tự động cộng giờ trải nghiệm — thật nhanh, không cần giấy tờ (slide 14)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thẻ QR gradient (slide 14) */}
        <div className="rounded-2xl hero-gradient p-6 text-white shadow-lg">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-bold text-lg">Check-in trải nghiệm</h2>
            <p className="mt-1 text-sm text-white/85 max-w-sm">
              Scan QR tại điểm hoạt động — giờ trải nghiệm sẽ được cộng tự động.
            </p>

            {/* QR mock */}
            <div className="mt-5 bg-white rounded-2xl p-4 shadow">
              <div className="w-44 h-44 grid grid-cols-7 gap-[3px]">
                {Array.from({ length: 49 }).map((_, i) => {
                  const row = Math.floor(i / 7);
                  const col = i % 7;
                  const inCorner =
                    (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                  const filled = inCorner || (i * 11 + 5) % 3 !== 0;
                  return (
                    <div
                      key={i}
                      className={`rounded-[2px] ${filled ? "bg-ink" : "bg-transparent"}`}
                    />
                  );
                })}
              </div>
            </div>

            <h3 className="mt-4 font-bold">Mã QR của bạn</h3>
            <p className="mt-1 text-xs text-white/80 max-w-xs">
              Đưa cho ban tổ chức scan, hoặc nhập mã bên dưới để check-in.
            </p>

            <label htmlFor="qr-input" className="sr-only">Nhập mã QR để check-in</label>
            <input
              id="qr-input"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Nhập mã QR (demo: bỏ trống rồi bấm)"
              className="mt-4 w-full max-w-xs text-sm px-3 py-2.5 rounded-xl border-0 bg-white text-ink outline-none focus:ring-2 focus:ring-white"
              autoComplete="off"
            />
            <button
              onClick={doCheckin}
              disabled={busy}
              className="mt-3 max-w-xs w-full text-sm py-2.5 rounded-full font-semibold bg-white text-ink hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2"
              aria-busy={busy}
            >
              <ScanLine size={16} aria-hidden="true" />
              {busy ? "Đang xác nhận..." : "Mở camera scan"}
            </button>
            {result && (
              <div className="mt-3 max-w-xs w-full rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2" role="status" aria-live="polite">
                <CheckCircle2 size={16} aria-hidden="true" />
                {result.message} · +{result.hours}h
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {error && <ErrorBox message={error} />}

          {/* Lịch sử check-in (slide 14) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <History size={18} className="text-portal" aria-hidden="true" />
              <h3 className="font-semibold text-ink">Lịch sử check-in</h3>
            </div>
            {!history ? (
              <Loading />
            ) : history.length === 0 ? (
              <div className="text-center py-8" role="status" aria-live="polite">
                <History size={32} className="mx-auto text-muted-light" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted">Chưa có lượt check-in nào.</p>
                <p className="mt-1 text-xs text-muted-light">Quét QR tại hoạt động đầu tiên để bắt đầu tích lũy giờ.</p>
              </div>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto" role="list" aria-label="Danh sách check-in">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 text-sm rounded-xl border border-line px-3 py-2.5"
                  >
                    <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center" aria-hidden="true">
                      <History size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink truncate">{h.activity}</div>
                      <div className="text-xs text-muted-light tabular-nums">
                        {h.checked_in_at}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-pink-600 tabular-nums">+{h.hours_added}h</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-ink mb-2">Cách hoạt động</h3>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
              <li>Giáo viên hiển thị mã QR trên màn hình tại buổi sinh hoạt.</li>
              <li>Học sinh quét mã bằng camera / nhập mã thủ công.</li>
              <li>Hệ thống tự động cộng giờ trải nghiệm vào hồ sơ.</li>
              <li>Giờ tích lũy quy đổi thành huy hiệu Explorer → Innovator → Expert → Master.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}