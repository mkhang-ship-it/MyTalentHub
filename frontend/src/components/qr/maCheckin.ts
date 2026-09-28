// Nguồn dữ liệu DÙNG CHUNG cho mọi mã QR check-in trong ứng dụng.
// Nội dung mã: FTH:<mã gốc>:<cửa sổ thời gian> — ngắn gọn để vừa phiên bản QR nhỏ.

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
