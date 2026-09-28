// Nguồn dữ liệu DÙNG CHUNG cho mọi mã QR check-in trong ứng dụng.
// Mã THÔ: FTH:<mã gốc>:<cửa sổ thời gian> — ngắn gọn để vừa phiên bản QR nhỏ.
// Nội dung THẬT trong QR là URL công khai (xem noiDungMaQR): camera thường quét
// là mở được trang xác minh/điểm danh, không cần đăng nhập.

// Chu kỳ đổi mã (giây). 120 giây: đủ nhanh để mã cũ hết giá trị trình diễn,
// đủ chậm để ban tổ chức kịp quét trong buổi sinh hoạt.
export const CHU_KY_MA_GIAY = 120;

// Mã nguồn (passport "TP-1001" hoặc dự phòng "HS-<id>") tối đa 12 ký tự ASCII.
const MA_NGUON_HOP_LE = /^[A-Za-z0-9-]{1,12}$/;
// Toàn bộ mã check-in phải là ASCII ngắn để vừa phiên bản QR 1–2.
const MA_CHECKIN_HOP_LE = /^FTH:([A-Za-z0-9-]{1,12}):(\d{1,10})$/;

/** Chuẩn hoá mã nguồn (mã passport). Trả về null kèm lý do nếu không dùng được. */
export function chuanHoaMaNguon(ma: string | null | undefined): { ma: string } | { loi: string } {
  const gon = (ma ?? "").trim();
  if (!gon) return { loi: "Chưa có mã định danh, vui lòng đăng nhập lại" };
  if (!MA_NGUON_HOP_LE.test(gon)) {
    return { loi: `Mã định danh "${gon}" chứa ký tự không hỗ trợ cho mã QR` };
  }
  return { ma: gon };
}

/** Lấy mã nguồn ưu tiên: mã passport của backend, dự phòng theo id học sinh. */
export function layMaNguon(qrPassport: string | null | undefined, idHocSinh: number | null | undefined): { ma: string } | { loi: string } {
  const tuPassport = chuanHoaMaNguon(qrPassport);
  if ("ma" in tuPassport) return tuPassport;
  if (idHocSinh != null && Number.isInteger(idHocSinh) && idHocSinh > 0) {
    return { ma: `HS-${idHocSinh}` };
  }
  return { loi: "Chưa xác định được học sinh đang đăng nhập, vui lòng đăng nhập lại" };
}

/** Cửa sổ thời gian hiện tại = số chu kỳ đã trôi qua từ epoch. */
export function tinhCuaSoHienTai(gioUnixGiay: number, chuKyGiay: number = CHU_KY_MA_GIAY): number {
  return Math.floor(gioUnixGiay / chuKyGiay);
}

/** Giây còn lại trước khi sang cửa sổ mới (để hiển thị đếm ngược). */
export function giayConLai(gioUnixGiay: number, chuKyGiay: number = CHU_KY_MA_GIAY): number {
  return chuKyGiay - (gioUnixGiay % chuKyGiay);
}

/** Ghép mã check-in đầy đủ từ mã nguồn và cửa sổ thời gian. */
export function taoMaCheckin(maNguon: string, cuaSo: number): string {
  return `FTH:${maNguon}:${cuaSo}`;
}

// ---------- Nội dung QR dạng ĐƯỜNG DẪN (quét bằng camera thường là mở được) ----------
// VÌ SAO: mã thô `FTH:...` hay `TP-1001` quét ra chỉ hiện chữ, người dùng không
// làm được gì ("quét ra chưa có hoạt động"). Mã phải là URL mở bằng trình duyệt,
// không cần đăng nhập, đúng hai loại phân biệt bằng đường dẫn:
//   - mã passport  → /passport/verify?code=... (xem tối thiểu để xác minh)
//   - mã check-in  → /checkin?code=... (trang điểm danh công khai)

/** Kiểu khai báo tối thiểu cho biến môi trường Vite (tsconfig không nạp vite/client). */
interface EnvCongKhai {
  VITE_PUBLIC_URL?: string;
  VITE_FRONTEND_URL?: string;
}

/** Gốc công khai để dựng URL trong QR: ưu tiên biến môi trường, rồi tới domain đang mở. */
export function layGocCongKhai(): string {
  const env = (import.meta as unknown as { env?: EnvCongKhai }).env;
  const tuEnv = (env?.VITE_PUBLIC_URL ?? env?.VITE_FRONTEND_URL ?? "").trim().replace(/\/+$/, "");
  if (tuEnv) return tuEnv;
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://127.0.0.1:5174";
}

/** Dựng URL điểm danh công khai từ mã check-in thô (mã ngắn để vừa QR nhỏ). */
export function taoLienKetCheckin(maCheckin: string): string {
  return `${layGocCongKhai()}/checkin?code=${encodeURIComponent(maCheckin.trim())}`;
}

/** Dựng URL xác minh passport công khai từ mã nguồn (ví dụ TP-1001). */
export function taoLienKetPassport(maNguon: string): string {
  return `${layGocCongKhai()}/passport/verify?code=${encodeURIComponent(maNguon.trim())}`;
}

/** Trích mã thô từ dữ liệu nhập/dán: chấp nhận URL đầy đủ lẫn mã thô. */
export function trichMaTuLienKet(dauVao: string): string {
  const gon = (dauVao ?? "").trim();
  if (!gon) return "";
  const timCode = gon.match(/[?&]code=([^&#]*)/);
  if (timCode) {
    try {
      return decodeURIComponent(timCode[1]).trim();
    } catch {
      return timCode[1].trim();
    }
  }
  if (/^https?:\/\//i.test(gon)) {
    const duoi = gon.split("?")[0].replace(/\/+$/, "").split("/").pop() ?? "";
    try {
      return decodeURIComponent(duoi).trim();
    } catch {
      return duoi.trim();
    }
  }
  return gon;
}

/**
 * Nội dung thật được mã hoá vào QR: mã thô FTalentHub được nâng thành URL
 * công khai để camera điện thoại mở được ngay. Đã là URL thì giữ nguyên,
 * chuỗi lạ giữ nguyên để QrCode báo lỗi rõ ràng thay vì đoán mò.
 */
export function noiDungMaQR(ma: string): string {
  const gon = (ma ?? "").trim();
  if (!gon) return gon;
  if (/^https?:\/\//i.test(gon)) return gon;
  if (MA_CHECKIN_HOP_LE.test(gon)) return taoLienKetCheckin(gon);
  if (MA_NGUON_HOP_LE.test(gon)) return taoLienKetPassport(gon);
  return gon;
}

/** Phân tích mã check-in thành mã nguồn và cửa sổ. Null nếu sai định dạng. */
export function phanTichMaCheckin(ma: string): { maNguon: string; cuaSo: number } | null {
  const khop = MA_CHECKIN_HOP_LE.exec(ma.trim());
  if (!khop) return null;
  return { maNguon: khop[1], cuaSo: Number(khop[2]) };
}

/** Kết quả đánh giá hạn dùng của một mã check-in. */
export type TrangThaiMa = "hien-hanh" | "duoc-chap-nhan-lech-gio" | "het-han" | "sai-dinh-dang";

/**
 * Đánh giá mã còn quét được không so với thời điểm hiện tại.
 * Chấp nhận lệch 1 cửa sổ để không loại oan khi đồng hồ hai máy chênh nhau.
 */
export function danhGiaMa(
  ma: string,
  gioUnixGiay: number,
  chuKyGiay: number = CHU_KY_MA_GIAY,
): { trangThai: TrangThaiMa; thongDiep: string } {
  const phanTich = phanTichMaCheckin(ma);
  if (!phanTich) {
    return { trangThai: "sai-dinh-dang", thongDiep: "Mã không đúng định dạng check-in của FTalentHub" };
  }
  const hienTai = tinhCuaSoHienTai(gioUnixGiay, chuKyGiay);
  if (phanTich.cuaSo === hienTai) {
    return { trangThai: "hien-hanh", thongDiep: "Mã đang hiệu lực, đưa cho ban tổ chức quét" };
  }
  if (phanTich.cuaSo === hienTai - 1) {
    return {
      trangThai: "duoc-chap-nhan-lech-gio",
      thongDiep: "Mã vừa hết chu kỳ nhưng vẫn chấp nhận trong giây lát, hãy dùng mã mới",
    };
  }
  return { trangThai: "het-han", thongDiep: "Mã đã hết hạn, vui lòng dùng mã mới đang hiển thị" };
}
