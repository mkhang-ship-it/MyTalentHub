// Bảng tra cứu QR theo chuẩn ISO/IEC 18004 (phiên bản 1–10).
// Mọi chú thích trong thư mục qr/ đều viết bằng tiếng Việt.

/** Mức sửa lỗi Reed–Solomon của mã QR. */
export type MucSuaLoi = "L" | "M" | "Q" | "H";

/** Một nhóm khối dữ liệu: gồm `soKhoi` khối, mỗi khối chứa `byteDuLieu` byte dữ liệu. */
export interface NhomKhoi {
  soKhoi: number;
  byteDuLieu: number;
}

/** Cấu trúc sửa lỗi của một phiên bản ở một mức sửa lỗi. */
export interface CauTrucEC {
  /** Các nhóm khối dữ liệu (1–2 nhóm). */
  nhom: NhomKhoi[];
  /** Số byte sửa lỗi trong MỖI khối. */
  byteECMoiKhoi: number;
}

/** Thông số cố định của một phiên bản QR. */
export interface ThongSoPhienBan {
  phienBan: number;
  /** Tổng số byte mã (dữ liệu + sửa lỗi). */
  tongByte: number;
  /** Vị trí tâm của mẫu căn chỉnh (rỗng với phiên bản 1). */
  viTriCanChinh: number[];
  cauTruc: Record<MucSuaLoi, CauTrucEC>;
  /** Số bit dư (remainder) phải giữ sáng ở cuối vùng dữ liệu. */
  bitDu: number;
}

/** Giá trị 2 bit mức sửa lỗi dùng trong thông tin định dạng. Chuẩn quy định: L=01, M=00, Q=11, H=10. */
export const BIT_MUC_SUA_LOI: Record<MucSuaLoi, number> = { L: 1, M: 0, Q: 3, H: 2 };

/** Bảng phiên bản 1–10. Tổng byte và cấu trúc khối theo đặc tả (được kiểm tra tổng bằng test tự kiểm). */
export const BANG_PHIEU_BAN: ThongSoPhienBan[] = [
  {
    phienBan: 1, tongByte: 26, viTriCanChinh: [], bitDu: 0,
    cauTruc: {
      L: { nhom: [{ soKhoi: 1, byteDuLieu: 19 }], byteECMoiKhoi: 7 },
      M: { nhom: [{ soKhoi: 1, byteDuLieu: 16 }], byteECMoiKhoi: 10 },
      Q: { nhom: [{ soKhoi: 1, byteDuLieu: 13 }], byteECMoiKhoi: 13 },
      H: { nhom: [{ soKhoi: 1, byteDuLieu: 9 }], byteECMoiKhoi: 17 },
    },
  },
  {
    phienBan: 2, tongByte: 44, viTriCanChinh: [6, 18], bitDu: 7,
    cauTruc: {
      L: { nhom: [{ soKhoi: 1, byteDuLieu: 34 }], byteECMoiKhoi: 10 },
      M: { nhom: [{ soKhoi: 1, byteDuLieu: 28 }], byteECMoiKhoi: 16 },
      Q: { nhom: [{ soKhoi: 1, byteDuLieu: 22 }], byteECMoiKhoi: 22 },
      H: { nhom: [{ soKhoi: 1, byteDuLieu: 16 }], byteECMoiKhoi: 28 },
    },
  },
  {
    phienBan: 3, tongByte: 70, viTriCanChinh: [6, 22], bitDu: 7,
    cauTruc: {
      L: { nhom: [{ soKhoi: 1, byteDuLieu: 55 }], byteECMoiKhoi: 15 },
      M: { nhom: [{ soKhoi: 1, byteDuLieu: 44 }], byteECMoiKhoi: 26 },
      Q: { nhom: [{ soKhoi: 2, byteDuLieu: 17 }], byteECMoiKhoi: 18 },
      H: { nhom: [{ soKhoi: 2, byteDuLieu: 13 }], byteECMoiKhoi: 22 },
    },
  },
  {
    phienBan: 4, tongByte: 100, viTriCanChinh: [6, 26], bitDu: 7,
    cauTruc: {
      L: { nhom: [{ soKhoi: 1, byteDuLieu: 80 }], byteECMoiKhoi: 20 },
      M: { nhom: [{ soKhoi: 2, byteDuLieu: 32 }], byteECMoiKhoi: 18 },
      Q: { nhom: [{ soKhoi: 2, byteDuLieu: 24 }], byteECMoiKhoi: 26 },
      H: { nhom: [{ soKhoi: 4, byteDuLieu: 9 }], byteECMoiKhoi: 16 },
    },
  },
  {
    phienBan: 5, tongByte: 134, viTriCanChinh: [6, 30], bitDu: 7,
    cauTruc: {
      L: { nhom: [{ soKhoi: 1, byteDuLieu: 108 }], byteECMoiKhoi: 26 },
      M: { nhom: [{ soKhoi: 2, byteDuLieu: 43 }], byteECMoiKhoi: 24 },
      Q: { nhom: [{ soKhoi: 2, byteDuLieu: 15 }, { soKhoi: 2, byteDuLieu: 16 }], byteECMoiKhoi: 18 },
      H: { nhom: [{ soKhoi: 2, byteDuLieu: 11 }, { soKhoi: 2, byteDuLieu: 12 }], byteECMoiKhoi: 22 },
    },
  },
  {
    phienBan: 6, tongByte: 172, viTriCanChinh: [6, 34], bitDu: 7,
    cauTruc: {
      L: { nhom: [{ soKhoi: 2, byteDuLieu: 68 }], byteECMoiKhoi: 18 },
      M: { nhom: [{ soKhoi: 4, byteDuLieu: 27 }], byteECMoiKhoi: 16 },
      Q: { nhom: [{ soKhoi: 4, byteDuLieu: 19 }], byteECMoiKhoi: 24 },
      H: { nhom: [{ soKhoi: 4, byteDuLieu: 15 }], byteECMoiKhoi: 28 },
    },
  },
  {
    phienBan: 7, tongByte: 196, viTriCanChinh: [6, 22, 38], bitDu: 0,
    cauTruc: {
      L: { nhom: [{ soKhoi: 2, byteDuLieu: 78 }], byteECMoiKhoi: 20 },
      M: { nhom: [{ soKhoi: 4, byteDuLieu: 31 }], byteECMoiKhoi: 18 },
      Q: { nhom: [{ soKhoi: 2, byteDuLieu: 14 }, { soKhoi: 4, byteDuLieu: 15 }], byteECMoiKhoi: 18 },
      H: { nhom: [{ soKhoi: 4, byteDuLieu: 13 }, { soKhoi: 1, byteDuLieu: 14 }], byteECMoiKhoi: 26 },
    },
  },
  {
    phienBan: 8, tongByte: 242, viTriCanChinh: [6, 24, 42], bitDu: 0,
    cauTruc: {
      L: { nhom: [{ soKhoi: 2, byteDuLieu: 97 }], byteECMoiKhoi: 24 },
      M: { nhom: [{ soKhoi: 2, byteDuLieu: 38 }, { soKhoi: 2, byteDuLieu: 39 }], byteECMoiKhoi: 22 },
      Q: { nhom: [{ soKhoi: 4, byteDuLieu: 18 }, { soKhoi: 2, byteDuLieu: 19 }], byteECMoiKhoi: 22 },
      H: { nhom: [{ soKhoi: 4, byteDuLieu: 14 }, { soKhoi: 2, byteDuLieu: 15 }], byteECMoiKhoi: 26 },
    },
  },
  {
    phienBan: 9, tongByte: 292, viTriCanChinh: [6, 26, 46], bitDu: 0,
    cauTruc: {
      L: { nhom: [{ soKhoi: 2, byteDuLieu: 116 }], byteECMoiKhoi: 30 },
      M: { nhom: [{ soKhoi: 3, byteDuLieu: 36 }, { soKhoi: 2, byteDuLieu: 37 }], byteECMoiKhoi: 22 },
      Q: { nhom: [{ soKhoi: 4, byteDuLieu: 16 }, { soKhoi: 4, byteDuLieu: 17 }], byteECMoiKhoi: 20 },
      H: { nhom: [{ soKhoi: 4, byteDuLieu: 12 }, { soKhoi: 4, byteDuLieu: 13 }], byteECMoiKhoi: 24 },
    },
  },
  {
    phienBan: 10, tongByte: 346, viTriCanChinh: [6, 28, 50], bitDu: 0,
    cauTruc: {
      L: { nhom: [{ soKhoi: 2, byteDuLieu: 68 }, { soKhoi: 2, byteDuLieu: 69 }], byteECMoiKhoi: 18 },
      M: { nhom: [{ soKhoi: 4, byteDuLieu: 43 }, { soKhoi: 1, byteDuLieu: 44 }], byteECMoiKhoi: 26 },
      Q: { nhom: [{ soKhoi: 6, byteDuLieu: 19 }, { soKhoi: 2, byteDuLieu: 20 }], byteECMoiKhoi: 24 },
      H: { nhom: [{ soKhoi: 6, byteDuLieu: 15 }, { soKhoi: 2, byteDuLieu: 16 }], byteECMoiKhoi: 28 },
    },
  },
];

/** Số bit đếm ký tự của chế độ byte: phiên bản 1–9 dùng 8 bit, phiên bản 10+ dùng 16 bit. */
export function bitDemKyTu(phienBan: number): number {
  return phienBan <= 9 ? 8 : 16;
}

/** Cạnh ma trận (số module) của một phiên bản: 21 + 4 × (phiên bản − 1). */
export function kichThuocMaTran(phienBan: number): number {
  return 21 + 4 * (phienBan - 1);
}

/** Tổng số byte dữ liệu (không tính byte sửa lỗi) của một cấu trúc EC. */
export function tongByteDuLieu(cauTruc: CauTrucEC): number {
  return cauTruc.nhom.reduce((tong, nhom) => tong + nhom.soKhoi * nhom.byteDuLieu, 0);
}

/** Tổng số khối của một cấu trúc EC. */
export function tongSoKhoi(cauTruc: CauTrucEC): number {
  return cauTruc.nhom.reduce((tong, nhom) => tong + nhom.soKhoi, 0);
}
