import { useEffect, useState } from "react";
import { CheckCircle2, History, ScanLine } from "lucide-react";
import { get, post } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Giờ hiện tại (giây) để đổi mã theo chu kỳ và đếm ngược.
  const [bayGio, setBayGio] = useState(() => Math.floor(Date.now() / 1000));

  const loadHistory = () => {
    get<CheckinItem[]>("/student/checkins")
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  useEffect(loadHistory, []);

  // Đồng hồ đổi mã: cập nhật mỗi giây để đếm ngược và sang chu kỳ mới đúng giờ.
  useEffect(() => {
    const id = window.setInterval(() => setBayGio(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Lấy mã định danh của chính học sinh đang đăng nhập (mã passport của backend).
  useEffect(() => {
    if (!user) {
      setLoiNguon("Bạn chưa đăng nhập, vui lòng đăng nhập lại để xem mã QR.");
      return;
    }
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
        subtitle="Quét mã QR tại buổi sinh hoạt để tự động cộng giờ trải nghiệm — thật nhanh, không cần giấy tờ (slide 14)."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Thẻ QR gradient (slide 14) */}
        <div className="rounded-2xl hero-gradient p-6 text-white shadow-lg interactive reveal-up transition-responsive" style={{ animationDelay: "0.05s" }}>
          <div className="flex flex-col items-center text-center">
            <h2 className="font-bold text-lg">Check-in trải nghiệm</h2>
            <p className="mt-1 text-sm text-white/85 max-w-sm">
              Scan QR tại điểm hoạt động — giờ trải nghiệm sẽ được cộng tự động.
            </p>

            {/* Mã QR thật của chính học sinh đang đăng nhập, đổi theo chu kỳ */}
            <div className="mt-5" role="img" aria-label={`Mã QR check-in của bạn${maHienTai ? `, hiệu lực ${conLai} giây nữa` : ""}`}>
              {maHienTai ? (
                <QrCode
                  ma={maHienTai}
                  kichThuoc={184}
                  hienChu
                  nhan={`Mã QR check-in của bạn, mã ${maHienTai}, hiệu lực ${conLai} giây nữa`}
                />
              ) : (
                <Loading label={loiNguon || "Đang tải mã QR của bạn..."} />
              )}
            </div>
            {loiNguon && !maHienTai && <ErrorBox message={loiNguon} />}

            <h3 className="mt-4 font-bold">Mã QR của bạn</h3>
            <p className="mt-1 text-xs text-white/80 max-w-xs">
              Đưa cho ban tổ chức scan, hoặc nhập mã bên dưới để check-in. Mã tự đổi sau{" "}
              <span className="font-bold tabular-nums">{conLai}s</span> để chống chụp màn hình dùng lại.
            </p>
            {daDung && (
              <p role="status" className="mt-2 max-w-xs w-full rounded-xl bg-amber-300/90 px-3 py-2 text-xs font-semibold text-amber-950">
                Mã này đã được dùng để check-in. Vui lòng chờ mã mới sau {conLai}s.
              </p>
            )}

            <label htmlFor="qr-input" className="sr-only">Nhập mã QR để check-in</label>
            <input
              id="qr-input"
              value={qr}
              onChange={(e) => setQr(e.target.value)}
              placeholder="Nhập mã của ban tổ chức (để trống để dùng mã của bạn)"
              className="mt-4 w-full max-w-xs text-sm px-3 py-2.5 rounded-xl border-0 bg-white text-ink outline-none focus:ring-2 focus:ring-white transition-responsive"
              autoComplete="off"
            />
            <button
              onClick={doCheckin}
              disabled={busy || (maHienTai === "" && qr.trim() === "")}
              className="mt-3 max-w-xs w-full text-sm py-2.5 rounded-full font-semibold bg-white text-ink hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-responsive hover-glow"
              aria-busy={busy}
            >
              <ScanLine size={16} aria-hidden="true" />
              {busy ? "Đang xác nhận..." : "Xác nhận check-in"}
            </button>
            {result && (
              <div className="mt-3 max-w-xs w-full rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 reveal-up transition-responsive" role="status" aria-live="polite" style={{ animationDelay: "0.1s" }}>
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
              <ul className="space-y-2 max-h-96 overflow-y-auto stagger-children" role="list" aria-label="Danh sách check-in">
                {history.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 text-sm rounded-xl border border-line px-3 py-2.5 interactive hover-lift transition-responsive reveal-up"
                    style={{ animationDelay: `${0.05 * (history?.indexOf(h) ?? 0)}s` }}
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

          <Card interactive reveal revealDelay={0.1} className="transition-responsive">
            <h3 className="font-semibold text-ink mb-2">Cách hoạt động</h3>
            <ol className="space-y-2 text-sm text-muted list-decimal list-inside">
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
