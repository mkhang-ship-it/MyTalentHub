// Test tự kiểm vòng lặp mã hoá → giải mã (không cần thư viện ngoài).
// Chạy bằng Node sau khi biên dịch thư mục qr/ (xem báo cáo p3-out.md).

import { BANG_PHIEU_BAN, tongByteDuLieu, tongSoKhoi, type MucSuaLoi } from "./qrTables";
import { maHoaQR, tinhBitDinhDang } from "./qrEncode";
import { giaiMaQR } from "./qrDecode";
import { maTranSangSvg } from "./qrSvg";
import { phanTichMaCheckin, taoMaCheckin } from "./maCheckin";

/** Một ca kiểm tra và kết quả đạt/không đạt. */
export interface KetQuaTuKiem {
  ten: string;
  dat: boolean;
  chiTiet: string;
}

function ketQua(ten: string, dat: boolean, chiTiet: string): KetQuaTuKiem {
  return { ten, dat, chiTiet };
}

/** Kiểm tra bảng phiên bản: tổng byte dữ liệu + sửa lỗi phải bằng tổng byte chuẩn. */
function kiemTraBang(): KetQuaTuKiem {
  for (const ban of BANG_PHIEU_BAN) {
    for (const muc of ["L", "M", "Q", "H"] as MucSuaLoi[]) {
      const cauTruc = ban.cauTruc[muc];
      const tinh = tongByteDuLieu(cauTruc) + tongSoKhoi(cauTruc) * cauTruc.byteECMoiKhoi;
      if (tinh !== ban.tongByte) {
        return ketQua(
          "Bảng phiên bản cộng đủ tổng byte",
          false,
          `Phiên bản ${ban.phienBan} mức ${muc}: tính được ${tinh}, chuẩn ${ban.tongByte}`,
        );
      }
    }
  }
  return ketQua("Bảng phiên bản cộng đủ tổng byte", true, "10 phiên bản × 4 mức sửa lỗi đều khớp tổng byte");
}

/** Kiểm tra thông tin định dạng: BCH tự kiểm cho mọi mức sửa lỗi × mặt nạ. */
function kiemTraDinhDang(): KetQuaTuKiem {
  for (const muc of ["L", "M", "Q", "H"] as MucSuaLoi[]) {
    for (let matNa = 0; matNa < 8; matNa += 1) {
      const bit15 = tinhBitDinhDang(muc, matNa);
      if (bit15 >> 15 !== 0) {
        return ketQua("Thông tin định dạng BCH", false, `Mức ${muc} mặt nạ ${matNa}: tràn quá 15 bit`);
      }
      // Giải ngược: gỡ XOR rồi kiểm tra BCH giống bộ giải mã.
      const goMatNa = bit15 ^ 0x5412;
      const duLieu5bit = (goMatNa >> 10) & 0x1f;
      let du = duLieu5bit;
      for (let i = 0; i < 10; i += 1) du = (du << 1) ^ ((du >> 9) * 0x537);
      if ((goMatNa & 0x3ff) !== du) {
        return ketQua("Thông tin định dạng BCH", false, `Mức ${muc} mặt nạ ${matNa}: BCH không khớp`);
      }
    }
  }
  return ketQua("Thông tin định dạng BCH", true, "4 mức sửa lỗi × 8 mặt nạ đều qua kiểm tra BCH");
}

/** Các chuỗi kiểm tra vòng lặp, kèm phiên bản tối thiểu kỳ vọng ở mức M. */
const CHUOI_VONG_LAP: Array<{ chuoi: string; phienBanToiThieu: number }> = [
  { chuoi: "TP-1001", phienBanToiThieu: 1 },
  { chuoi: taoMaCheckin("TP-1001", 123456), phienBanToiThieu: 2 },
  { chuoi: "HELLO WORLD", phienBanToiThieu: 1 },
  { chuoi: "Nguyễn Văn An — trải nghiệm", phienBanToiThieu: 3 },
  { chuoi: "FTH:HS-27:9876543", phienBanToiThieu: 2 },
  { chuoi: "0123456789ABCDEFGHIJKLMNOPQRSTUVWX", phienBanToiThieu: 3 },
  { chuoi: "a".repeat(100), phienBanToiThieu: 6 },
  { chuoi: "b".repeat(200), phienBanToiThieu: 10 },
];

/** Vòng lặp mã hoá → giải mã phải thu đúng chuỗi gốc, đúng phiên bản tối thiểu. */
function kiemTraVongLap(): KetQuaTuKiem[] {
  return CHUOI_VONG_LAP.map(({ chuoi, phienBanToiThieu }, chiSo) => {
    const ten = `Vòng lặp mã hoá/giải mã #${chiSo + 1} (${chuoi.length} ký tự)`;
    try {
      const ma = maHoaQR(chuoi, "M");
      const giai = giaiMaQR(ma.maTran);
      if (giai.noiDung !== chuoi) {
        return ketQua(ten, false, `Giải ra khác chuỗi gốc (phiên bản ${ma.phienBan})`);
      }
      if (giai.phienBan !== ma.phienBan || giai.matNa !== ma.matNa || giai.mucSuaLoi !== "M") {
        return ketQua(ten, false, "Siêu dữ liệu giải ra không khớp lúc mã hoá");
      }
      if (ma.phienBan !== phienBanToiThieu) {
        return ketQua(ten, false, `Dùng phiên bản ${ma.phienBan}, kỳ vọng tối thiểu ${phienBanToiThieu}`);
      }
      // Mã hoá phải tất định: cùng chuỗi cho cùng ma trận.
      const ma2 = maHoaQR(chuoi, "M");
      const giong = ma.maTran.every((dong, y) => dong.every((o, x) => o === ma2.maTran[y][x]));
      if (!giong) return ketQua(ten, false, "Mã hoá không tất định");
      return ketQua(ten, true, `Phiên bản ${ma.phienBan}, mặt nạ ${ma.matNa}, giải đúng ${chuoi.length} ký tự`);
    } catch (e) {
      return ketQua(ten, false, e instanceof Error ? e.message : String(e));
    }
  });
}

/** Kiểm tra cấu trúc: mẫu tìm 3 góc, dải thời gian, ô đen cố định. */
function kiemTraCauTruc(): KetQuaTuKiem {
  try {
    const { maTran } = maHoaQR("FTH:TP-1001:777", "M");
    const n = maTran.length;
    // Mẫu tìm 7×7 kỳ vọng (viền đen, vành trắng, lõi đen 3×3).
    const mauTimDung = (x0: number, y0: number): boolean => {
      for (let dy = 0; dy < 7; dy += 1) {
        for (let dx = 0; dx < 7; dx += 1) {
          const bien = dx === 0 || dy === 0 || dx === 6 || dy === 6;
          const loi = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          if (maTran[y0 + dy][x0 + dx] !== (bien || loi)) return false;
        }
      }
      return true;
    };
    if (!mauTimDung(0, 0) || !mauTimDung(n - 7, 0) || !mauTimDung(0, n - 7)) {
      return ketQua("Cấu trúc mẫu tìm/thời gian", false, "Mẫu tìm ở 3 góc không đúng hình 7×7");
    }
    for (let i = 8; i < n - 8; i += 1) {
      if (maTran[6][i] !== (i % 2 === 0) || maTran[i][6] !== (i % 2 === 0)) {
        return ketQua("Cấu trúc mẫu tìm/thời gian", false, `Dải thời gian sai tại vị trí ${i}`);
      }
    }
    if (!maTran[n - 8][8]) return ketQua("Cấu trúc mẫu tìm/thời gian", false, "Thiếu ô đen cố định");
    return ketQua("Cấu trúc mẫu tìm/thời gian", true, `Ma trận ${n}×${n}, đủ mẫu tìm/thời gian/ô đen cố định`);
  } catch (e) {
    return ketQua("Cấu trúc mẫu tìm/thời gian", false, e instanceof Error ? e.message : String(e));
  }
}

/** Đổi 1 bit dữ liệu phải làm kiểm tra Reed–Solomon thất bại (byte sửa lỗi là thật). */
function kiemTraSuaLoi(): KetQuaTuKiem {
  const ten = "Byte sửa lỗi phát hiện dữ liệu bị đổi";
  try {
    const { maTran } = maHoaQR("FTH:TP-1001:777", "M");
    const n = maTran.length;
    const hong = maTran.map((dong) => [...dong]);
    hong[n - 1][n - 1] = !hong[n - 1][n - 1]; // ô dữ liệu góc dưới-phải
    try {
      giaiMaQR(hong);
      return ketQua(ten, false, "Đổi 1 bit mà vẫn giải mã được (byte sửa lỗi vô dụng)");
    } catch {
      return ketQua(ten, true, "Đổi 1 bit dữ liệu thì kiểm tra Reed–Solomon báo hỏng");
    }
  } catch (e) {
    return ketQua(ten, false, e instanceof Error ? e.message : String(e));
  }
}

/** SVG phải có lề trắng ≥ 4 module, ô ≥ 2px, từ chối tham số sai. */
function kiemTraSvg(): KetQuaTuKiem {
  const ten = "SVG đủ lề trắng và ô tối thiểu 2px";
  try {
    const { maTran } = maHoaQR("TP-1001", "M");
    const svg = maTranSangSvg(maTran, { oVuongPx: 4, leTrang: 4, nhan: "Mã QR mẫu" });
    const rong = (maTran.length + 8) * 4;
    if (!svg.includes(`width="${rong}"`) || !svg.includes('aria-label="Mã QR mẫu"')) {
      return ketQua(ten, false, "SVG thiếu kích thước hoặc nhãn trợ năng");
    }
    let tuChoi = 0;
    try {
      maTranSangSvg(maTran, { oVuongPx: 1, leTrang: 4 });
    } catch {
      tuChoi += 1;
    }
    try {
      maTranSangSvg(maTran, { oVuongPx: 4, leTrang: 2 });
    } catch {
      tuChoi += 1;
    }
    if (tuChoi !== 2) return ketQua(ten, false, "Không từ chối ô 1px hoặc lề 2 module");
    return ketQua(ten, true, `SVG ${rong}×${rong}px, lề 4 module, ô 4px, từ chối tham số sai`);
  } catch (e) {
    return ketQua(ten, false, e instanceof Error ? e.message : String(e));
  }
}

/** Định dạng mã check-in phải tròn một vòng tạo → phân tích. */
function kiemTraMaCheckin(): KetQuaTuKiem {
  const ma = taoMaCheckin("TP-1001", 42);
  const phanTich = phanTichMaCheckin(ma);
  if (!phanTich || phanTich.maNguon !== "TP-1001" || phanTich.cuaSo !== 42) {
    return ketQua("Định dạng mã check-in", false, `Tạo "${ma}" nhưng phân tích không khớp`);
  }
  if (phanTichMaCheckin("QR-GIA-MAO") !== null || phanTichMaCheckin("FTH:::") !== null) {
    return ketQua("Định dạng mã check-in", false, "Chấp nhận chuỗi sai định dạng");
  }
  return ketQua("Định dạng mã check-in", true, `"${ma}" tạo và phân tích khớp, từ chối chuỗi lạ`);
}

/** Chạy toàn bộ tự kiểm, trả về từng ca và tổng số đạt. */
export function chayTuKiem(): { ketQua: KetQuaTuKiem[]; tongDat: number; tong: number } {
  const ketQuaKiem = [
    kiemTraBang(),
    kiemTraDinhDang(),
    ...kiemTraVongLap(),
    kiemTraCauTruc(),
    kiemTraSuaLoi(),
    kiemTraSvg(),
    kiemTraMaCheckin(),
  ];
  return { ketQua: ketQuaKiem, tongDat: ketQuaKiem.filter((k) => k.dat).length, tong: ketQuaKiem.length };
}
