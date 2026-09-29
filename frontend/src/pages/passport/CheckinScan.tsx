import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AlertTriangle, Check, CheckCircle2, ScanLine } from "lucide-react";
import { API_BASE } from "../../api/client";
import { ErrorBox } from "../../components/ui";
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
  // Icon kèm dòng đánh giá để màu không là tín hiệu duy nhất (00/7.7).
  const iconDanhGia =
    !danhGia || danhGia.trangThai === "hien-hanh" ? (
      <Check size={12} className="shrink-0 text-[#047857]" aria-hidden="true" />
    ) : (
      <AlertTriangle size={12} className="shrink-0 text-[#9A3412]" aria-hidden="true" />
    );

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
      <div className="w-full max-w-md rounded-[20px] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        {/* Đầu trang nêu rõ luồng: quét xong tới đây, không cần đăng nhập. */}
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-strong">FTalentHub · Điểm danh công khai</p>
        <h1 className="mt-1 text-[22px] md:text-2xl font-extrabold leading-[1.25] text-ink">Điểm danh hoạt động</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-strong">
          Quét mã QR trên màn hình học sinh sẽ mở ra trang này — không cần đăng nhập, bấm xác nhận là xong.
        </p>

        <label htmlFor="ma-diem-danh" className="mt-4 block text-[13px] font-semibold text-ink">
          Mã điểm danh
        </label>
        <input
          id="ma-diem-danh"
          data-testid="o-nhap-ma"
          value={maNhap}
          onChange={(e) => setMaNhap(e.target.value)}
          placeholder="Tự điền từ mã QR, hoặc dán đường dẫn vừa quét"
          className="input-control mt-1 font-mono"
          autoComplete="off"
        />
        {maThamSo === "" && (
          <p className="mt-1 text-xs text-muted-strong">
            Thiếu mã trên đường dẫn — dán mã hoặc quét lại QR.
          </p>
        )}
        {danhGia && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-strong" aria-live="polite">
            {iconDanhGia}
            {danhGia.thongDiep}
          </p>
        )}

        <button
          type="button"
          data-testid="nut-xac-nhan"
          onClick={xacNhan}
          disabled={dangGui || !maNhap.trim()}
          className="btn-primary mt-3 w-full"
          aria-busy={dangGui}
        >
          <ScanLine size={16} aria-hidden="true" />
          {dangGui ? "Đang xác nhận..." : "Xác nhận điểm danh"}
        </button>

        {loi && (
          <div data-testid="diem-danh-loi" className="mt-3">
            <ErrorBox message={loi} />
          </div>
        )}
        {ketQua && (
          <div data-testid="diem-danh-thanh-cong" className="mt-3 rounded-xl bg-[#ECFDF5] p-4 text-[#047857]" role="status">
            <p className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={18} aria-hidden="true" /> {ketQua.message}
            </p>
            <p className="mt-1 text-sm">
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
