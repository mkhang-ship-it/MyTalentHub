// Component React DÙNG CHUNG để hiện mã QR quét được (SVG sắc nét, không cần thư viện).
// Mọi nơi hiện mã QR trong ứng dụng đều phải dùng component này.

import { useMemo } from "react";
import { maHoaQR, type MaTranQR } from "./qrEncode";
import { maTranSangSvg } from "./qrSvg";
import type { MucSuaLoi } from "./qrTables";

export interface QrCodeProps {
  /** Chuỗi cần mã hoá (ví dụ mã check-in "FTH:TP-1001:123456"). */
  ma: string;
  /** Chiều rộng SVG mong muốn (px). Ô module luôn ≥ 2px để quét được. */
  kichThuoc?: number;
  /** Lề trắng quanh mã (số module), tối thiểu 4 theo chuẩn. */
  leTrang?: number;
  mucSuaLoi?: MucSuaLoi;
  /** Nhãn tiếng Việt cho trợ năng và hướng dẫn quét. */
  nhan?: string;
  className?: string;
  /** Hiện chuỗi gốc dưới mã để nhập tay khi không quét được. */
  hienChu?: boolean;
}

/** Tính ma trận QR, ném lỗi tiếng Việt nếu chuỗi không mã hoá được. */
export function tinhMaTranQR(ma: string, mucSuaLoi: MucSuaLoi): MaTranQR {
  return maHoaQR(ma, mucSuaLoi);
}

export function QrCode({
  ma,
  kichThuoc = 176,
  leTrang = 4,
  mucSuaLoi = "M",
  nhan = "Mã QR FTalentHub — dùng camera điện thoại để quét",
  className = "",
  hienChu = false,
}: QrCodeProps) {
  const ketQua = useMemo(() => {
    try {
      const maTran = tinhMaTranQR(ma, mucSuaLoi);
      // Ô module tối thiểu 2px; phóng to theo kích thước yêu cầu.
      const oVuong = Math.max(2, Math.floor(kichThuoc / (maTran.kichThuoc + leTrang * 2)));
      const svg = maTranSangSvg(maTran.maTran, { oVuongPx: oVuong, leTrang, nhan });
      return { ok: true as const, svg, rong: (maTran.kichThuoc + leTrang * 2) * oVuong };
    } catch (e) {
      const loi = e instanceof Error ? e.message : String(e);
      return { ok: false as const, loi: `Không tạo được mã QR: ${loi}` };
    }
  }, [ma, kichThuoc, leTrang, mucSuaLoi, nhan]);

  if (!ketQua.ok) {
    return (
      <div role="alert" className={`rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}>
        {ketQua.loi}
      </div>
    );
  }
  return (
    <figure className={`inline-block rounded-2xl bg-white p-3 shadow ${className}`}>
      {/* SVG do chính bộ mã hoá nội bộ sinh ra từ chuỗi mã, không chứa dữ liệu ngoài */}
      <span
        className="block overflow-hidden rounded-lg"
        style={{ width: ketQua.rong, height: ketQua.rong }}
        dangerouslySetInnerHTML={{ __html: ketQua.svg }}
      />
      <figcaption className="mt-2 max-w-full text-center text-[11px] leading-snug text-slate-500">
        {hienChu ? (
          <span className="block break-all font-mono text-xs font-semibold text-slate-700">{ma}</span>
        ) : null}
        Dùng camera điện thoại để quét mã
      </figcaption>
    </figure>
  );
}
