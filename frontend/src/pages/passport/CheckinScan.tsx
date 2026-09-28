import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, ScanLine } from "lucide-react";
import { API_BASE } from "../../api/client";
import { danhGiaMa, trichMaTuLienKet } from "../../components/qr/maCheckin";

// Kết quả điểm danh công khai: chỉ tên + lớp để ban tổ chức đối chiếu.
interface KetQuaDiemDanh {
  ok: boolean;
  message: string;
  hoc_sinh: { ho_ten: string; lop: string };
  hours: number;
}

// Trang điểm danh CÔNG KHAI cho ban tổ chức: quét QR trên màn hình học sinh sẽ
// tới `/checkin?code=...`. Người quét không cần đăng nhập, bấm nút xác nhận là
// backend ghi nhận giờ. Mã hết hạn/dùng rồi đều báo tiếng Việt rõ ràng.
export default function CheckinScan() {
  // Mã lấy từ ?code= trong URL mà QR chứa (chấp nhận cả URL dán nhầm).
  const [thamSo] = useSearchParams();
  const maThamSo = trichMaTuLienKet(thamSo.get("code") ?? "");
  // Cho phép dán tay khi camera không quét được.
  const [maNhap, setMaNhap] = useState(maThamSo);
  // Kết quả sau khi bấm xác nhận và cờ đang gửi.
  const [ketQua, setKetQua] = useState<KetQuaDiemDanh | null>(null);
  const [loi, setLoi] = useState("");
  const [dangGui, setDangGui] = useState(false);

  // Đánh giá nhanh hạn dùng ngay trên máy để báo trước khi gửi.
  const danhGia = maNhap.trim() ? danhGiaMa(maNhap.trim(), Math.floor(Date.now() / 1000)) : null;

  // Gửi mã lên endpoint công khai (không token) để ghi nhận điểm danh.
  const xacNhan = async () => {
    const maGui = maNhap.trim();
    if (!maGui) {
      setLoi("Chưa có mã để điểm danh. Vui lòng quét lại mã QR trên màn hình học sinh.");
      return;
    }
    setDangGui(true);
    setLoi("");
    setKetQua(null);
    try {
      const res = await fetch(`${API_BASE}/student/checkin/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: maGui }),
      });
      const duLieu = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(duLieu?.detail || `Máy chủ trả lỗi ${res.status}`));
      setKetQua(duLieu as KetQuaDiemDanh);
    } catch (e: unknown) {
      setLoi(e instanceof Error ? e.message : "Điểm danh chưa thành công, vui lòng thử lại.");
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-soft">
        {/* Đầu trang nêu rõ luồng: quét xong tới đây, không cần đăng nhập. */}
        <p className="text-xs font-semibold text-muted">FTalentHub · Điểm danh công khai</p>
        <h1 className="mt-1 text-xl font-extrabold text-ink">Điểm danh hoạt động</h1>
        <p className="mt-1 text-sm text-muted">
          Quét mã QR trên màn hình học sinh sẽ mở ra trang này — không cần đăng nhập, bấm xác nhận là xong.
        </p>

        <label htmlFor="ma-diem-danh" className="mt-4 block text-sm font-semibold text-ink">
          Mã điểm danh
        </label>
        <input
          id="ma-diem-danh"
          data-testid="o-nhap-ma"
          value={maNhap}
          onChange={(e) => setMaNhap(e.target.value)}
          placeholder="Tự điền từ mã QR, hoặc dán đường dẫn vừa quét"
          className="mt-1 w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 font-mono text-sm text-ink outline-none"
          autoComplete="off"
        />
        {danhGia && (
          <p className="mt-1 text-xs text-muted" aria-live="polite">
            {danhGia.thongDiep}
          </p>
        )}

        <button
          type="button"
          data-testid="nut-xac-nhan"
          onClick={xacNhan}
          disabled={dangGui || !maNhap.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white cta-gradient disabled:opacity-50"
          aria-busy={dangGui}
        >
          <ScanLine size={16} aria-hidden="true" />
          {dangGui ? "Đang xác nhận..." : "Xác nhận điểm danh"}
        </button>

        {loi && (
          <div data-testid="diem-danh-loi" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {loi}
          </div>
        )}
        {ketQua && (
          <div data-testid="diem-danh-thanh-cong" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
            <p className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} aria-hidden="true" /> {ketQua.message}
            </p>
            <p className="mt-1">
              {ketQua.hoc_sinh.ho_ten} · Lớp {ketQua.hoc_sinh.lop}
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
