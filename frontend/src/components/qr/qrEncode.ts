// Bộ MÃ HOÁ QR thuần TypeScript theo ISO/IEC 18004 (chế độ byte, UTF-8).
// Không gọi dịch vụ ngoài, không dùng thư viện ngoài — mã check-in không rời khỏi trình duyệt.

import {
  BANG_PHIEU_BAN,
  BIT_MUC_SUA_LOI,
  bitDemKyTu,
  kichThuocMaTran,
  tongByteDuLieu,
  type CauTrucEC,
  type MucSuaLoi,
} from "./qrTables";

/** Kết quả mã hoá: ma trận bit (true = ô đen) kèm siêu dữ liệu. */
export interface MaTranQR {
  /** Ma trận vuông, true là ô đen, false là ô trắng. Chưa gồm lề trắng (quiet zone). */
  maTran: boolean[][];
  phienBan: number;
  mucSuaLoi: MucSuaLoi;
  /** Mặt nạ đã chọn (0–7) sau khi chấm điểm phạt. */
  matNa: number;
  /** Cạnh ma trận (số module). */
  kichThuoc: number;
}

// ---------- Trường hữu hạn GF(256) cho Reed–Solomon ----------

/** Đa thức rút gọn của GF(256) trong chuẩn QR: x^8 + x^4 + x^3 + x^2 + 1. */
const DA_THUC_GF = 0x11d;

const BANG_MU: number[] = new Array(512);
const BANG_LOG: number[] = new Array(256);

function khoiTaoTruongGF(): void {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    BANG_MU[i] = x;
    BANG_LOG[x] = i;
    x <<= 1;
    if (x >= 256) x ^= DA_THUC_GF;
  }
  for (let i = 255; i < 512; i += 1) BANG_MU[i] = BANG_MU[i - 255];
}

khoiTaoTruongGF();

/** Nhân hai phần tử trong GF(256). */
export function nhanGF(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return BANG_MU[BANG_LOG[a] + BANG_LOG[b]];
}

/** Nhân hai đa thức trên GF(256). Hệ số ghi từ bậc cao xuống bậc thấp. */
function nhanDaThuc(a: number[], b: number[]): number[] {
  const ketQua = new Array(a.length + b.length - 1).fill(0) as number[];
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      ketQua[i + j] ^= nhanGF(a[i], b[j]);
    }
  }
  return ketQua;
}

/** Đa thức sinh Reed–Solomon bậc `bac`: (x − α^0)(x − α^1)…(x − α^(bac−1)). */
function daThucSinh(bac: number): number[] {
  let ketQua = [1];
  for (let i = 0; i < bac; i += 1) {
    ketQua = nhanDaThuc(ketQua, [1, BANG_MU[i]]);
  }
  return ketQua;
}

/** Tính các byte sửa lỗi cho một khối dữ liệu (phép chia đa thức trên GF(256)). */
export function tinhByteSuaLoi(duLieu: number[], soByteEC: number): number[] {
  const sinh = daThucSinh(soByteEC);
  const du = [...duLieu, ...new Array(soByteEC).fill(0)];
  for (let i = 0; i < duLieu.length; i += 1) {
    const heSo = du[i];
    if (heSo !== 0) {
      for (let j = 0; j < sinh.length; j += 1) {
        du[i + j] ^= nhanGF(sinh[j], heSo);
      }
    }
  }
  return du.slice(duLieu.length);
}

// ---------- Đóng gói bit chế độ byte ----------

/** Bộ đệm bit: ghi bit từ trái (bit trọng số cao trước). */
class BoDemBit {
  private giaTri: number[] = [];

  ghi(giaTri: number, soBit: number): void {
    for (let i = soBit - 1; i >= 0; i -= 1) {
      this.giaTri.push((giaTri >> i) & 1);
    }
  }

  get doDai(): number {
    return this.giaTri.length;
  }

  /** Xuất ra mảng byte (đệm bit 0 ở cuối byte cuối nếu thiếu). */
  sangByte(): number[] {
    const ketQua: number[] = [];
    for (let i = 0; i < this.giaTri.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) {
        byte = (byte << 1) | (this.giaTri[i + j] ?? 0);
      }
      ketQua.push(byte);
    }
    return ketQua;
  }
}

/** Mã hoá chuỗi thành các byte dữ liệu của phiên bản đã cho (chế độ byte, UTF-8). */
function dongGoiDuLieu(noiDung: Uint8Array, phienBan: number, sucChuaByte: number): number[] {
  const dem = new BoDemBit();
  dem.ghi(0b0100, 4); // chỉ thị chế độ byte
  dem.ghi(noiDung.length, bitDemKyTu(phienBan)); // số byte dữ liệu
  for (const byte of noiDung) dem.ghi(byte, 8);
  const sucChuaBit = sucChuaByte * 8;
  const du = Math.min(4, sucChuaBit - dem.doDai); // terminator: tối đa 4 bit 0
  dem.ghi(0, du);
  dem.ghi(0, (8 - (dem.doDai % 8)) % 8); // đệm cho tròn byte
  const ketQua = dem.sangByte();
  // Đệm xen kẽ 0xEC, 0x11 cho đầy sức chứa.
  let doi = 0xec;
  while (ketQua.length < sucChuaByte) {
    ketQua.push(doi);
    doi = doi === 0xec ? 0x11 : 0xec;
  }
  return ketQua;
}

// ---------- Xen kẽ khối ----------

/** Tách byte dữ liệu thành các khối và xen kẽ dữ liệu + sửa lỗi theo chuẩn. */
function xenKeKhoi(duLieu: number[], cauTruc: CauTrucEC): { duLieuXenKe: number[]; ecXenKe: number[] } {
  const khoiDuLieu: number[][] = [];
  let viTri = 0;
  for (const nhom of cauTruc.nhom) {
    for (let k = 0; k < nhom.soKhoi; k += 1) {
      khoiDuLieu.push(duLieu.slice(viTri, viTri + nhom.byteDuLieu));
      viTri += nhom.byteDuLieu;
    }
  }
  const khoiEC = khoiDuLieu.map((khoi) => tinhByteSuaLoi(khoi, cauTruc.byteECMoiKhoi));
  const doDaiLonNhat = Math.max(...khoiDuLieu.map((khoi) => khoi.length));
  const duLieuXenKe: number[] = [];
  for (let i = 0; i < doDaiLonNhat; i += 1) {
    for (const khoi of khoiDuLieu) {
      if (i < khoi.length) duLieuXenKe.push(khoi[i]);
    }
  }
  const ecXenKe: number[] = [];
  for (let i = 0; i < cauTruc.byteECMoiKhoi; i += 1) {
    for (const khoi of khoiEC) ecXenKe.push(khoi[i]);
  }
  return { duLieuXenKe, ecXenKe };
}

// ---------- Vẽ mẫu chức năng ----------

/** Lưới vẽ: ô chức năng (mẫu tìm/căn/thời gian/định dạng) không được ghi dữ liệu lên. */
class LuoiVe {
  maTran: boolean[][];
  laChucNang: boolean[][];
  kichThuoc: number;

  constructor(kichThuoc: number) {
    this.kichThuoc = kichThuoc;
    this.maTran = Array.from({ length: kichThuoc }, () => new Array(kichThuoc).fill(false));
    this.laChucNang = Array.from({ length: kichThuoc }, () => new Array(kichThuoc).fill(false));
  }

  /** Đặt một module chức năng (ghi đè, đánh dấu để vùng dữ liệu né). */
  datChucNang(x: number, y: number, den: boolean): void {
    this.maTran[y][x] = den;
    this.laChucNang[y][x] = true;
  }
}

/** Vẽ mẫu tìm (finder) 7×7 kèm viền phân cách, tâm tại (x, y). */
function veMauTim(luoi: LuoiVe, x: number, y: number): void {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= luoi.kichThuoc || yy >= luoi.kichThuoc) continue;
      const khoangCach = Math.max(Math.abs(dx), Math.abs(dy));
      luoi.datChucNang(xx, yy, khoangCach !== 2 && khoangCach !== 4);
    }
  }
}

/** Vẽ mẫu căn chỉnh 5×5, tâm tại (x, y). */
function veMauCanChinh(luoi: LuoiVe, x: number, y: number): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      luoi.datChucNang(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

/** Vẽ dải thời gian (timing) ngang/dọc qua hàng/cột 6. */
function veDaiThoiGian(luoi: LuoiVe): void {
  for (let i = 0; i < luoi.kichThuoc; i += 1) {
    luoi.datChucNang(6, i, i % 2 === 0);
    luoi.datChucNang(i, 6, i % 2 === 0);
  }
}

/** Vẽ toàn bộ mẫu chức năng cố định (chưa gồm thông tin định dạng). */
function veMauChucNang(luoi: LuoiVe, phienBan: number, viTriCanChinh: number[]): void {
  veDaiThoiGian(luoi);
  const n = luoi.kichThuoc;
  veMauTim(luoi, 3, 3);
  veMauTim(luoi, n - 4, 3);
  veMauTim(luoi, 3, n - 4);
  const soViTri = viTriCanChinh.length;
  for (let i = 0; i < soViTri; i += 1) {
    for (let j = 0; j < soViTri; j += 1) {
      const laGocFinder =
        (i === 0 && j === 0) || (i === 0 && j === soViTri - 1) || (i === soViTri - 1 && j === 0);
      if (!laGocFinder) veMauCanChinh(luoi, viTriCanChinh[i], viTriCanChinh[j]);
    }
  }
  // Ô đen cố định (dark module) tại cột 8, hàng kichThuoc − 8.
  luoi.datChucNang(8, n - 8, true);
}

// ---------- Thông tin định dạng (BCH 15 bit) ----------

/** Tính 15 bit thông tin định dạng: 5 bit dữ liệu (mức sửa lỗi + mặt nạ) + BCH + mặt nạ XOR. */
export function tinhBitDinhDang(mucSuaLoi: MucSuaLoi, matNa: number): number {
  const duLieu5bit = (BIT_MUC_SUA_LOI[mucSuaLoi] << 3) | matNa;
  let du = duLieu5bit;
  for (let i = 0; i < 10; i += 1) {
    du = (du << 1) ^ ((du >> 9) * 0x537);
  }
  return ((duLieu5bit << 10) | du) ^ 0x5412;
}

/** Ghi 15 bit định dạng vào hai vị trí quanh mẫu tìm. Bit i nằm ở vị trí thứ i. */
function veBitDinhDang(luoi: LuoiVe, bit15: number): void {
  const bit = (i: number): boolean => ((bit15 >> i) & 1) === 1;
  // Bản thứ nhất quanh mẫu tìm góc trên-trái.
  for (let i = 0; i <= 5; i += 1) luoi.datChucNang(8, i, bit(i));
  luoi.datChucNang(8, 7, bit(6));
  luoi.datChucNang(8, 8, bit(7));
  luoi.datChucNang(7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) luoi.datChucNang(14 - i, 8, bit(i));
  // Bản thứ hai tách đôi quanh góc trên-phải và dưới-trái (đủ 15 bit).
  const n = luoi.kichThuoc;
  for (let i = 0; i < 8; i += 1) luoi.datChucNang(n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) luoi.datChucNang(8, n - 15 + i, bit(i));
}

// ---------- Mặt nạ và chấm điểm phạt ----------

/** Công thức mặt nạ 0–7 theo chuẩn (áp dụng cho toạ độ x = cột, y = hàng). */
export function congThucMatNa(matNa: number, x: number, y: number): boolean {
  switch (matNa) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: throw new Error(`Mặt nạ QR không hợp lệ: ${matNa}`);
  }
}

/** Áp dụng mặt nạ lên các ô dữ liệu (ô chức năng giữ nguyên). */
function apMatNa(luoi: LuoiVe, matNa: number): void {
  for (let y = 0; y < luoi.kichThuoc; y += 1) {
    for (let x = 0; x < luoi.kichThuoc; x += 1) {
      if (!luoi.laChucNang[y][x] && congThucMatNa(matNa, x, y)) {
        luoi.maTran[y][x] = !luoi.maTran[y][x];
      }
    }
  }
}

/** Quy tắc phạt 1: chuỗi ô cùng màu liên tiếp trên mỗi hàng/cột. */
function phatChuoi(cacDong: boolean[][]): number {
  let diem = 0;
  for (const dong of cacDong) {
    let dem = 1;
    for (let i = 1; i <= dong.length; i += 1) {
      if (i < dong.length && dong[i] === dong[i - 1]) {
        dem += 1;
      } else {
        if (dem >= 5) diem += 3 + (dem - 5);
        dem = 1;
      }
    }
  }
  return diem;
}

/** Chấm điểm phạt toàn ma trận (4 quy tắc của chuẩn) — điểm càng thấp càng dễ quét. */
export function chamDiemPhat(maTran: boolean[][]): number {
  const n = maTran.length;
  let diem = phatChuoi(maTran);
  const cacCot = Array.from({ length: n }, (_, x) => maTran.map((dong) => dong[x]));
  diem += phatChuoi(cacCot);
  // Quy tắc 2: mỗi khối 2×2 cùng màu +3.
  for (let y = 0; y < n - 1; y += 1) {
    for (let x = 0; x < n - 1; x += 1) {
      const mau = maTran[y][x];
      if (maTran[y][x + 1] === mau && maTran[y + 1][x] === mau && maTran[y + 1][x + 1] === mau) {
        diem += 3;
      }
    }
  }
  // Quy tắc 3: mẫu giống mẫu tìm (10111010000 hoặc ngược lại) +40.
  const mauFinder = [true, false, true, true, true, false, true, false, false, false, false];
  const mauNguoc = [...mauFinder].reverse();
  const kiemMau = (dong: boolean[]): number => {
    let dem = 0;
    for (let i = 0; i <= dong.length - mauFinder.length; i += 1) {
      const lat = dong.slice(i, i + mauFinder.length);
      if (lat.every((o, k) => o === mauFinder[k]) || lat.every((o, k) => o === mauNguoc[k])) dem += 1;
    }
    return dem * 40;
  };
  for (const dong of maTran) diem += kiemMau(dong);
  for (const cot of cacCot) diem += kiemMau(cot);
  // Quy tắc 4: tỉ lệ ô đen càng xa 50% càng phạt nặng (bước 5%).
  let oDen = 0;
  for (const dong of maTran) for (const o of dong) if (o) oDen += 1;
  const phanTram = (oDen / (n * n)) * 100;
  const duoi = Math.floor(phanTram / 5) * 5;
  const tren = Math.ceil(phanTram / 5) * 5;
  diem += (Math.max(Math.abs(duoi - 50), Math.abs(tren - 50)) / 5) * 10;
  return diem;
}

// ---------- Đặt byte dữ liệu lên ma trận ----------

/** Rải các byte (dữ liệu xen kẽ + sửa lỗi) theo đường zíc-zắc từ dưới-phải lên. */
function datByteDuLieu(luoi: LuoiVe, duLieu: number[]): void {
  const n = luoi.kichThuoc;
  let viTriBit = 0;
  const tongBit = duLieu.length * 8;
  const layBit = (i: number): boolean => ((duLieu[i >> 3] >> (7 - (i & 7))) & 1) === 1;
  for (let cotPhai = n - 1; cotPhai >= 1; cotPhai -= 2) {
    if (cotPhai === 6) cotPhai = 5; // né cột thời gian
    for (let hang = 0; hang < n; hang += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = cotPhai - j;
        const diLen = ((cotPhai + 1) & 2) === 0;
        const y = diLen ? n - 1 - hang : hang;
        if (!luoi.laChucNang[y][x] && viTriBit < tongBit) {
          luoi.maTran[y][x] = layBit(viTriBit);
          viTriBit += 1;
        }
      }
    }
  }
  if (viTriBit !== tongBit) {
    throw new Error(`Không đặt hết byte dữ liệu lên ma trận (đã đặt ${viTriBit}/${tongBit} bit)`);
  }
}

// ---------- Hàm chính ----------

/** Chọn phiên bản nhỏ nhất chứa vừa chuỗi (chế độ byte, UTF-8). */
function chonPhienBan(daiByte: number, mucSuaLoi: MucSuaLoi): number {
  for (const ban of BANG_PHIEU_BAN) {
    const sucChua = tongByteDuLieu(ban.cauTruc[mucSuaLoi]);
    const canThiet = 4 + bitDemKyTu(ban.phienBan) + daiByte * 8;
    if (canThiet <= sucChua * 8) return ban.phienBan;
  }
  throw new Error(`Chuỗi quá dài (${daiByte} byte), vượt quá phiên bản 10 ở mức ${mucSuaLoi}`);
}

/**
 * Mã hoá chuỗi thành ma trận QR (chế độ byte, UTF-8, chọn phiên bản vừa đủ,
 * mặt nạ tối ưu theo điểm phạt, thông tin định dạng BCH 15 bit).
 */
export function maHoaQR(noiDung: string, mucSuaLoi: MucSuaLoi = "M"): MaTranQR {
  const byteNoiDung = new TextEncoder().encode(noiDung);
  if (byteNoiDung.length === 0) throw new Error("Không thể tạo mã QR cho chuỗi rỗng");
  const phienBan = chonPhienBan(byteNoiDung.length, mucSuaLoi);
  const ban = BANG_PHIEU_BAN[phienBan - 1];
  const cauTruc = ban.cauTruc[mucSuaLoi];
  const kichThuoc = kichThuocMaTran(phienBan);

  const byteDuLieu = dongGoiDuLieu(byteNoiDung, phienBan, tongByteDuLieu(cauTruc));
  const { duLieuXenKe, ecXenKe } = xenKeKhoi(byteDuLieu, cauTruc);
  const tatCaByte = [...duLieuXenKe, ...ecXenKe];

  // Thử cả 8 mặt nạ trên bản sao lưới, giữ mặt nạ có điểm phạt thấp nhất.
  let totNhat: LuoiVe | null = null;
  let matNaTotNhat = 0;
  let diemTotNhat = Number.POSITIVE_INFINITY;
  for (let matNa = 0; matNa < 8; matNa += 1) {
    const luoi = new LuoiVe(kichThuoc);
    veMauChucNang(luoi, phienBan, ban.viTriCanChinh);
    // Giữ chỗ vùng thông tin định dạng bằng giá trị giả TRƯỚC khi đặt dữ liệu,
    // nếu không bit dữ liệu sẽ bị ghi vào 30 ô định dạng rồi mất khi vẽ đè.
    veBitDinhDang(luoi, tinhBitDinhDang(mucSuaLoi, 0));
    datByteDuLieu(luoi, tatCaByte);
    apMatNa(luoi, matNa);
    veBitDinhDang(luoi, tinhBitDinhDang(mucSuaLoi, matNa));
    const diem = chamDiemPhat(luoi.maTran);
    if (diem < diemTotNhat) {
      diemTotNhat = diem;
      matNaTotNhat = matNa;
      totNhat = luoi;
    }
  }
  if (!totNhat) throw new Error("Không chọn được mặt nạ QR");
  return {
    maTran: totNhat.maTran,
    phienBan,
    mucSuaLoi,
    matNa: matNaTotNhat,
    kichThuoc,
  };
}

/** Lấy lưới ô chức năng của một phiên bản (dùng cho bộ giải mã tự kiểm). */
export function tinhOChucNang(phienBan: number): { laChucNang: boolean[][]; kichThuoc: number } {
  const ban = BANG_PHIEU_BAN[phienBan - 1];
  const luoi = new LuoiVe(kichThuocMaTran(phienBan));
  veMauChucNang(luoi, phienBan, ban.viTriCanChinh);
  veBitDinhDang(luoi, tinhBitDinhDang("M", 0));
  return { laChucNang: luoi.laChucNang, kichThuoc: luoi.kichThuoc };
}
