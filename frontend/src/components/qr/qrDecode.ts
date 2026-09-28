// Bộ GIẢI MÃ QR tối thiểu: chỉ hỗ trợ đúng tập mà bộ mã hoá sinh ra
// (chế độ byte, một đoạn dữ liệu, phiên bản 1–10). Dùng cho tự kiểm vòng lặp
// mã hoá → giải mã, KHÔNG thay thế app quét trên điện thoại.

import {
  BANG_PHIEU_BAN,
  BIT_MUC_SUA_LOI,
  bitDemKyTu,
  tongByteDuLieu,
  tongSoKhoi,
  type MucSuaLoi,
} from "./qrTables";
import { congThucMatNa, nhanGF, tinhOChucNang } from "./qrEncode";

/** Kết quả giải mã một ma trận QR. */
export interface KetQuaGiaiMa {
  noiDung: string;
  phienBan: number;
  mucSuaLoi: MucSuaLoi;
  matNa: number;
}

/** Đọc 15 bit định dạng (bản quanh góc trên-trái) rồi kiểm tra BCH. */
function docThongTinDinhDang(maTran: boolean[][]): { mucSuaLoi: MucSuaLoi; matNa: number } {
  const bit = (x: number, y: number): number => (maTran[y][x] ? 1 : 0);
  let tho = 0;
  for (let i = 0; i <= 5; i += 1) tho |= bit(8, i) << i;
  tho |= bit(8, 7) << 6;
  tho |= bit(8, 8) << 7;
  tho |= bit(7, 8) << 8;
  for (let i = 9; i < 15; i += 1) tho |= bit(14 - i, 8) << i;
  const goMatNa = tho ^ 0x5412;
  const duLieu5bit = (goMatNa >> 10) & 0x1f;
  // Kiểm tra BCH: tính lại 10 bit dư từ 5 bit dữ liệu rồi so sánh.
  let du = duLieu5bit;
  for (let i = 0; i < 10; i += 1) {
    du = (du << 1) ^ ((du >> 9) * 0x537);
  }
  if ((goMatNa & 0x3ff) !== du) {
    throw new Error("Thông tin định dạng QR không qua kiểm tra BCH");
  }
  const bitMuc = (duLieu5bit >> 3) & 0x3;
  const muc = (Object.keys(BIT_MUC_SUA_LOI) as MucSuaLoi[]).find(
    (m) => BIT_MUC_SUA_LOI[m] === bitMuc,
  );
  if (!muc) throw new Error(`Mức sửa lỗi QR không hợp lệ (bit ${bitMuc})`);
  return { mucSuaLoi: muc, matNa: duLieu5bit & 0x7 };
}

/** Gỡ mặt nạ rồi đọc toàn bộ bit dữ liệu theo đường zíc-zắc (kể cả bit dư ở cuối). */
function docBitDuLieu(
  maTran: boolean[][],
  laChucNang: boolean[][],
  kichThuoc: number,
  matNa: number,
): number[] {
  const bit: number[] = [];
  for (let cotPhai = kichThuoc - 1; cotPhai >= 1; cotPhai -= 2) {
    if (cotPhai === 6) cotPhai = 5; // né cột thời gian (giống lúc mã hoá)
    for (let hang = 0; hang < kichThuoc; hang += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = cotPhai - j;
        const diLen = ((cotPhai + 1) & 2) === 0;
        const y = diLen ? kichThuoc - 1 - hang : hang;
        if (laChucNang[y][x]) continue;
        const dao = congThucMatNa(matNa, x, y);
        bit.push(maTran[y][x] !== dao ? 1 : 0);
      }
    }
  }
  return bit;
}

/** Đảo xen kẽ: tách luồng byte thành các khối (dữ liệu + sửa lỗi) như lúc mã hoá. */
function goXenKe(
  tatCaByte: number[],
  doDaiKhoi: number[],
  byteECMoiKhoi: number,
): { khoiDuLieu: number[][]; khoiEC: number[][] } {
  const soKhoi = doDaiKhoi.length;
  const khoiDuLieu: number[][] = doDaiKhoi.map(() => []);
  let viTri = 0;
  const doDaiLonNhat = Math.max(...doDaiKhoi);
  for (let i = 0; i < doDaiLonNhat; i += 1) {
    for (let k = 0; k < soKhoi; k += 1) {
      if (i < doDaiKhoi[k]) khoiDuLieu[k].push(tatCaByte[viTri++]);
    }
  }
  const khoiEC: number[][] = Array.from({ length: soKhoi }, () => []);
  for (let i = 0; i < byteECMoiKhoi; i += 1) {
    for (let k = 0; k < soKhoi; k += 1) khoiEC[k].push(tatCaByte[viTri++]);
  }
  return { khoiDuLieu, khoiEC };
}

/** Kiểm tra hội chứng Reed–Solomon: đa thức thu được phải triệt tiêu tại α^0…α^(E−1). */
export function kiemTraHoiChung(khoiDayDu: number[], soByteEC: number): boolean {
  for (let luyThua = 0; luyThua < soByteEC; luyThua += 1) {
    let tong = 0;
    // Đánh giá đa thức tại α^luyThua bằng lược đồ Horner trên GF(256).
    for (const heSo of khoiDayDu) {
      tong = nhanGF(tong, muAlpha(luyThua)) ^ heSo;
    }
    if (tong !== 0) return false;
  }
  return true;
}

/** α^luyThua trong GF(256) (đa thức rút gọn 0x11D). */
function muAlpha(luyThua: number): number {
  let ketQua = 1;
  for (let i = 0; i < luyThua; i += 1) {
    ketQua <<= 1;
    if (ketQua >= 256) ketQua ^= 0x11d;
  }
  return ketQua;
}

/** Giải mã ma trận QR do chính bộ mã hoá sinh ra. */
export function giaiMaQR(maTran: boolean[][]): KetQuaGiaiMa {
  const kichThuoc = maTran.length;
  if ((kichThuoc - 21) % 4 !== 0 || kichThuoc < 21 || kichThuoc > 57) {
    throw new Error(`Kích thước ma trận QR không hợp lệ: ${kichThuoc}`);
  }
  const phienBan = (kichThuoc - 21) / 4 + 1;
  const { mucSuaLoi, matNa } = docThongTinDinhDang(maTran);
  const { laChucNang } = tinhOChucNang(phienBan);
  const bitTho = docBitDuLieu(maTran, laChucNang, kichThuoc, matNa);

  const ban = BANG_PHIEU_BAN[phienBan - 1];
  const cauTruc = ban.cauTruc[mucSuaLoi];
  const soKhoi = tongSoKhoi(cauTruc);
  const tongByteMa = tongByteDuLieu(cauTruc) + soKhoi * cauTruc.byteECMoiKhoi;
  const byteNhan: number[] = [];
  for (let i = 0; i < tongByteMa; i += 1) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | (bitTho[i * 8 + j] ?? 0);
    byteNhan.push(byte);
  }
  const doDaiKhoi: number[] = [];
  for (const nhom of cauTruc.nhom) {
    for (let k = 0; k < nhom.soKhoi; k += 1) doDaiKhoi.push(nhom.byteDuLieu);
  }
  const { khoiDuLieu, khoiEC } = goXenKe(byteNhan, doDaiKhoi, cauTruc.byteECMoiKhoi);
  for (let k = 0; k < soKhoi; k += 1) {
    if (!kiemTraHoiChung([...khoiDuLieu[k], ...khoiEC[k]], cauTruc.byteECMoiKhoi)) {
      throw new Error(`Khối ${k} không qua kiểm tra sửa lỗi Reed–Solomon`);
    }
  }
  // Ghép lại luồng bit dữ liệu gốc rồi phân tích đoạn byte duy nhất.
  const bitDuLieu: number[] = [];
  for (const khoi of khoiDuLieu) {
    for (const byte of khoi) {
      for (let j = 7; j >= 0; j -= 1) bitDuLieu.push((byte >> j) & 1);
    }
  }
  let viTri = 0;
  const doc = (soBit: number): number => {
    let giaTri = 0;
    for (let i = 0; i < soBit; i += 1) giaTri = (giaTri << 1) | (bitDuLieu[viTri++] ?? 0);
    return giaTri;
  };
  const cheDo = doc(4);
  if (cheDo !== 0b0100) throw new Error(`Bộ giải mã chỉ hỗ trợ chế độ byte, nhận mode ${cheDo}`);
  const soByte = doc(bitDemKyTu(phienBan));
  const byteNoiDung: number[] = [];
  for (let i = 0; i < soByte; i += 1) byteNoiDung.push(doc(8));
  return {
    noiDung: new TextDecoder().decode(new Uint8Array(byteNoiDung)),
    phienBan,
    mucSuaLoi,
    matNa,
  };
}
