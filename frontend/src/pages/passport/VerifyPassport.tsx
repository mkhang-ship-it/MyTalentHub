import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { API_BASE } from "../../api/client";
import { ErrorBox, Loading } from "../../components/ui";

// Kết quả xác minh tối thiểu từ endpoint công khai (không email, không điểm số).
interface KetQuaXacMinh {
  qr_code: string;
  full_name: string;
  class_name: string;
  grade: number;
  school_name: string;
  verified: boolean;
  updated_at: string;
}

// Trang xác minh Talent Passport CÔNG KHAI: người quét (giáo viên, doanh nghiệp,
// nhà trường) thường không đăng nhập nên trang này KHÔNG đọc token, chỉ gọi
// endpoint công khai. Cố ý chỉ hiện tên/lớp/trạng thái để bảo vệ riêng tư.
export default function VerifyPassport() {
  // Mã lấy từ ?code= trong URL mà QR chứa (camera quét là tới thẳng đây).
  const [thamSo] = useSearchParams();
  const ma = (thamSo.get("code") ?? "").trim();
  // Ba trạng thái: đang tải, xong (đúng/sai), lỗi mạng.
  const [dangTai, setDangTai] = useState(true);
  const [ketQua, setKetQua] = useState<KetQuaXacMinh | null>(null);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    if (!ma) {
      setDangTai(false);
      setLoi("Đường dẫn thiếu mã xác minh. Vui lòng quét lại mã QR trên thẻ.");
      return;
    }
    let conHieuLuc = true;
    setDangTai(true);
    setLoi("");
    // Gọi thẳng bằng fetch, không gắn token: người quét không cần đăng nhập.
    fetch(`${API_BASE}/passport/verify?code=${encodeURIComponent(ma)}`)
      .then(async (res) => {
        const duLieu = await res.json().catch(() => null);
        if (!res.ok) throw new Error(String(duLieu?.detail || `Máy chủ trả lỗi ${res.status}`));
        return duLieu as KetQuaXacMinh;
      })
      .then((duLieu) => {
        if (conHieuLuc) setKetQua(duLieu);
      })
      .catch((e: unknown) => {
        if (conHieuLuc) setLoi(e instanceof Error ? e.message : "Không xác minh được, vui lòng thử lại.");
      })
      .finally(() => {
        if (conHieuLuc) setDangTai(false);
      });
    return () => {
      conHieuLuc = false;
    };
  }, [ma]);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        {/* Đầu trang nêu rõ đây là trang công khai, ai quét cũng mở được. */}
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-strong">FTalentHub · Xác minh công khai</p>
        <h1 className="mt-1 text-[22px] md:text-2xl font-extrabold leading-[1.25] text-ink">Xác minh Talent Passport</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-strong">
          Quét mã QR trên thẻ sẽ tới trang này — không cần đăng nhập, chỉ hiện thông tin tối thiểu.
        </p>

        {dangTai ? (
          <div data-testid="xac-minh-dang-tai" className="mt-6">
            <Loading label="Đang xác minh mã..." />
          </div>
        ) : ketQua ? (
          <div data-testid="xac-minh-thanh-cong" className="mt-6 rounded-xl bg-[#ECFDF5] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-[#047857]">
              <BadgeCheck size={18} aria-hidden="true" /> Đã xác minh
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-strong">Họ tên</dt>
                <dd className="font-semibold text-ink">{ketQua.full_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-strong">Lớp</dt>
                <dd className="font-semibold text-ink">
                  {ketQua.class_name} · Khối {ketQua.grade}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-strong">Trường</dt>
                <dd className="font-semibold text-ink">{ketQua.school_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-strong">Mã thẻ</dt>
                <dd className="font-mono font-semibold text-ink">{ketQua.qr_code}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-strong">Cập nhật</dt>
                <dd className="font-semibold text-ink">{ketQua.updated_at}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div data-testid="xac-minh-that-bai" className="mt-6">
            <ErrorBox message={loi} />
            <p className="mt-2 text-xs leading-relaxed text-muted-strong">
              Mẹo: nhập tay mã in dưới QR vào ô ?code= trên thanh địa chỉ rồi tải lại.
            </p>
          </div>
        )}

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-portal">
          Về trang chủ FTalentHub
        </Link>
      </div>
    </div>
  );
}
