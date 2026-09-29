import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, History, ScanLine } from "lucide-react";
import { get, post } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Card, Empty, ErrorBox, PageHeader } from "../../components/ui";
import { QrCode } from "../../components/qr/QrCode";
import {
  CHU_KY_MA_GIAY,
  giayConLai,
  layMaNguon,
  taoMaCheckin,
  tinhCuaSoHienTai,
} from "../../components/qr/maCheckin";

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

interface PassportToiThieu {
  qr_code: string;
}

/** Đổi lỗi API thành thông báo tiếng Việt, không hiện mã kỹ thuật thô. */
function loiTiengViet(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.";
  if (msg.includes("→ 403")) return "Bạn cần đăng nhập bằng tài khoản học sinh để check-in.";
  if (msg.includes("→ 404")) return "Không tìm thấy đăng ký hoạt động hợp lệ để check-in.";
  return msg;
}

export default function Checkin() {
  const { user } = useAuth();
  const [maNguon, setMaNguon] = useState<string | null>(null);
  const [loiNguon, setLoiNguon] = useState("");
  const [qr, setQr] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [history, setHistory] = useState<CheckinItem[] | null>(null);
  // Lỗi tải lịch sử tách riêng khỏi rỗng (đặc tả 01 B5): null = đang tải, "" = không lỗi.
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Giờ hiện tại (giây) để đổi mã theo chu kỳ và đếm ngược.
  const [bayGio, setBayGio] = useState(() => Math.floor(Date.now() / 1000));

  const loadHistory = useCallback(() => {
    setHistoryError("");
    get<CheckinItem[]>("/student/checkins")
      .then((danhSach) => {
        setHistory(danhSach);
      })
      .catch(() => {
        setHistory([]);
        setHistoryError("Không tải được lịch sử check-in, bạn thử lại sau nhé.");
      });
  }, []);

  useEffect(loadHistory, [loadHistory]);

  // Đồng hồ đổi mã: cập nhật mỗi giây để đếm ngược và sang chu kỳ mới đúng giờ.
  useEffect(() => {
    const id = window.setInterval(() => setBayGio(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Lấy mã định danh của chính học sinh đang đăng nhập (mã passport của backend).
  // Tách thành hàm để nút "Thử lại" gọi lại được (đặc tả 01 B6).
  const reloadMaNguon = useCallback(() => {
    if (!user) {
      setLoiNguon("Bạn chưa đăng nhập, vui lòng đăng nhập lại để xem mã QR.");
      return;
    }
    setLoiNguon("");
    get<PassportToiThieu>(`/passport/${user.id}`)
      .then((p) => {
        const ketQua = layMaNguon(p.qr_code, user.id);
        if ("ma" in ketQua) {
          setMaNguon(ketQua.ma);
          setLoiNguon("");
        } else {
          setMaNguon(null);
          setLoiNguon(ketQua.loi);
        }
      })
      .catch(() => {
        // Chưa có passport: dùng mã dự phòng theo id, vẫn quét được và vẫn gửi được lên backend.
        const duPhong = layMaNguon(null, user.id);
        if ("ma" in duPhong) {
          setMaNguon(duPhong.ma);
          setLoiNguon("");
        } else {
          setMaNguon(null);
          setLoiNguon(duPhong.loi);
        }
      });
  }, [user]);

  useEffect(() => {
    reloadMaNguon();
  }, [reloadMaNguon]);

  const cuaSo = tinhCuaSoHienTai(bayGio, CHU_KY_MA_GIAY);
  const maHienTai = maNguon ? taoMaCheckin(maNguon, cuaSo) : "";
  const conLai = giayConLai(bayGio, CHU_KY_MA_GIAY);
  // Mã hiện tại đã từng check-in thì coi như đã dùng, phải chờ mã mới (chống tái sử dụng).
  const daDung = maHienTai !== "" && (history ?? []).some((h) => h.qr_code === maHienTai);

  const doCheckin = async () => {
    const maGui = qr.trim() || maHienTai;
    if (!maGui) {
      setError("Chưa có mã để check-in. Vui lòng đăng nhập lại hoặc nhập mã thủ công.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await post<CheckinResult>(
        `/student/checkin?qr_code=${encodeURIComponent(maGui)}`,
        {}
      );
      setResult(res);
      setQr("");
      loadHistory();
    } catch (e) {
      setError(loiTiengViet(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Check-in hoạt động"
        subtitle="Quét mã QR tại buổi sinh hoạt để tự động cộng giờ trải nghiệm — thật nhanh, không cần giấy tờ."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Thẻ QR: scrim bắt buộc trên gradient, chữ trắng toàn phần (đặc tả 01 B3) */}
        <div
          className="rounded-[20px] p-5 md:p-6 text-white shadow-lg reveal-up transition-responsive"
          style={{
            backgroundImage: "var(--scrim-navy), var(--hero-gradient)",
            animationDelay: "0.05s",
          }}
        >
          <div className="mx-auto flex max-w-[384px] flex-col items-center text-center">
            <h2 className="text-lg font-bold">Check-in trải nghiệm</h2>
            <p className="mt-1 text-sm leading-relaxed text-white max-w-[384px]">
              Scan QR tại điểm hoạt động — giờ trải nghiệm sẽ được cộng tự động.
            </p>

            {/* Mã QR thật của chính học sinh đang đăng nhập, đổi theo chu kỳ.
                Tham số QrCode GIỮ NGUYÊN (ràng buộc QR1–QR3): kichThuoc=184. */}
            <div className="mt-5" role="img" aria-label={`Mã QR check-in của bạn${maHienTai ? `, hiệu lực ${conLai} giây nữa` : ""}`}>
              {maHienTai ? (
                <QrCode
                  ma={maHienTai}
                  kichThuoc={184}
                  hienChu
                  nhan={`Mã QR check-in của bạn, mã ${maHienTai}, hiệu lực ${conLai} giây nữa`}
                />
              ) : loiNguon ? (
                <div className="w-full max-w-[384px] rounded-xl bg-white p-3">
                  <ErrorBox message={loiNguon} retryLabel="Thử lại" onRetry={reloadMaNguon} />
                </div>
              ) : (
                <div className="inline-block rounded-2xl bg-white p-3" aria-busy="true" aria-label="Đang tải mã QR của bạn">
                  <span className="flex items-center gap-2 px-2 py-8 text-sm text-muted-strong">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-portal" aria-hidden="true" />
                    Đang tải mã QR của bạn...
                  </span>
                </div>
              )}
            </div>

            <h3 className="mt-4 text-lg font-bold">Mã QR của bạn</h3>
            <p className="mt-1 text-xs leading-relaxed text-white max-w-[320px]">
              Đưa cho ban tổ chức scan, hoặc nhập mã bên dưới để check-in. Mã tự đổi sau{" "}
              <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-sm font-bold tabular-nums text-portal-dark">
                {conLai}s
              </span>{" "}
              để chống chụp màn hình dùng lại.
            </p>
            {daDung && (
              <p role="status" className="mt-2 w-full max-w-[384px] rounded-xl bg-[#FFF7ED] px-4 py-3 text-sm font-semibold text-[#9A3412]">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
                  Mã này đã được dùng để check-in. Vui lòng chờ mã mới sau {conLai}s.
                </span>
              </p>
            )}

            <label htmlFor="qr-input" className="sr-only">Nhập mã QR để check-in</label>
            <input
              id="qr-input"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Nhập mã của ban tổ chức (để trống để dùng mã của bạn)"
              className="input-control mt-4 w-full max-w-[320px]"
              autoComplete="off"
            />
            <button
              onClick={doCheckin}
              disabled={busy || (maHienTai === "" && qr.trim() === "")}
              className="mt-3 w-full max-w-[320px] h-11 rounded-[12px] text-sm font-semibold bg-white text-[#1B2A5E] hover:bg-white/90 disabled:bg-white disabled:text-muted-strong disabled:border disabled:border-line-control disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-responsive focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus-visible:shadow-[0_0_0_4px_rgba(27,42,94,.55)]"
              aria-busy={busy}
            >
              <ScanLine size={16} aria-hidden="true" />
              {busy ? "Đang xác nhận..." : "Xác nhận check-in"}
            </button>
            {result && (
              <div className="mt-3 w-full max-w-[384px] rounded-xl bg-[#ECFDF5] px-4 py-3 text-sm font-semibold text-[#047857] flex items-center justify-center gap-2 reveal-up transition-responsive" role="status" aria-live="polite" style={{ animationDelay: "0.1s" }}>
                <CheckCircle2 size={16} aria-hidden="true" />
                {result.message} · +{result.hours}h
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="mb-4">
              <ErrorBox message={error} />
            </div>
          )}

          {/* Lịch sử check-in: 4 trạng thái tách bạch (đặc tả 01 B5) */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <History size={18} className="text-portal" aria-hidden="true" />
              <h3 className="text-lg font-bold text-ink">Lịch sử check-in</h3>
            </div>
            {!history ? (
              <div aria-busy="true" aria-label="Đang tải lịch sử check-in">
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-14 rounded-xl" aria-hidden="true" />
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-strong">Đang tải lịch sử…</p>
              </div>
            ) : historyError ? (
              <ErrorBox message={historyError} retryLabel="Thử lại" onRetry={loadHistory} />
            ) : history.length === 0 ? (
              <Empty
                text="Chưa có lượt check-in nào — quét QR ở hoạt động đầu tiên để bắt đầu tích lũy giờ."
                icon={<History size={32} aria-hidden="true" />}
                action={
                  <a href="/student/activities" className="btn-secondary inline-flex h-11 px-5">
                    Xem hoạt động đang mở
                  </a>
                }
              />
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto" role="list" aria-label="Danh sách check-in" tabIndex={0}>
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 text-sm rounded-xl border border-line px-3 py-2.5 min-h-[56px] transition-responsive"
                  >
                    <span className="h-9 w-9 shrink-0 rounded-full bg-portal-soft text-portal-dark flex items-center justify-center" aria-hidden="true">
                      <History size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink truncate">{h.activity}</div>
                      <div className="text-xs text-muted-strong tabular-nums">
                        {h.checked_in_at}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-portal-dark tabular-nums">+{h.hours_added}h</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card reveal revealDelay={0.1} className="transition-responsive">
            <h3 className="text-lg font-bold text-ink mb-2">Cách hoạt động</h3>
            <ol className="space-y-2 text-sm leading-relaxed text-muted-strong list-decimal list-inside">
              <li>Học sinh mở mã QR của mình trên trang này, mã tự đổi mỗi {CHU_KY_MA_GIAY / 60} phút.</li>
              <li>Ban tổ chức quét mã bằng camera điện thoại để xác nhận có mặt.</li>
              <li>Hệ thống tự động cộng giờ trải nghiệm vào hồ sơ.</li>
              <li>Giờ tích lũy quy đổi thành huy hiệu Explorer → Innovator → Expert → Master.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
