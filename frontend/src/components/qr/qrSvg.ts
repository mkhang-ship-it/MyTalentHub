// Vẽ ma trận QR thành chuỗi SVG (không cần thư viện, sắc nét khi phóng to).

/** Thoát ký tự đặc biệt trong XML cho văn bản nhãn. */
function thoatXml(vanBan: string): string {
  return vanBan
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface TuyChonSvg {
  /** Kích thước ô vuông mỗi module (px). Bắt buộc ≥ 2 để điện thoại quét được. */
  oVuongPx: number;
  /** Lề trắng quanh mã (số module). Chuẩn yêu cầu tối thiểu 4. */
  leTrang: number;
  mauNen?: string;
  mauDen?: string;
  /** Nhãn trợ năng cho thẻ SVG. */
  nhan?: string;
}

/**
 * Dựng chuỗi SVG từ ma trận bit. Bao gồm lề trắng đủ 4 module,
 * nền trắng chữ đen tương phản cao, không phụ thuộc màu sắc trang.
 */
export function maTranSangSvg(maTran: boolean[][], tuyChon: TuyChonSvg): string {
  const { oVuongPx, leTrang } = tuyChon;
  if (oVuongPx < 2) throw new Error("Ô module QR phải từ 2px trở lên mới quét được");
  if (leTrang < 4) throw new Error("Lề trắng QR phải tối thiểu 4 module");
  const mauNen = tuyChon.mauNen ?? "#ffffff";
  const mauDen = tuyChon.mauDen ?? "#111111";
  const n = maTran.length;
  const tong = n + leTrang * 2;
  const rong = tong * oVuongPx;
  // Gom các ô đen liên tiếp trên mỗi hàng thành một đoạn path cho gọn.
  let duongDan = "";
  for (let y = 0; y < n; y += 1) {
    let x = 0;
    while (x < n) {
      if (!maTran[y][x]) {
        x += 1;
        continue;
      }
      let x2 = x;
      while (x2 < n && maTran[y][x2]) x2 += 1;
      const px = (x + leTrang) * oVuongPx;
      const py = (y + leTrang) * oVuongPx;
      const rongDoan = (x2 - x) * oVuongPx;
      duongDan += `M${px} ${py}h${rongDoan}v${oVuongPx}h-${rongDoan}z`;
      x = x2;
    }
  }
  const nhan = thoatXml(tuyChon.nhan ?? "Mã QR");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rong}" height="${rong}" ` +
    `viewBox="0 0 ${rong} ${rong}" role="img" aria-label="${nhan}">` +
    `<title>${nhan}</title>` +
    `<rect width="${rong}" height="${rong}" fill="${mauNen}"/>` +
    `<path d="${duongDan}" fill="${mauDen}"/></svg>`
  );
}
