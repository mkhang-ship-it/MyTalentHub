/** Nút "Phân tích bằng AI" dùng chung: kiểm tra /ai/health, chống gọi lặp, lỗi tiếng Việt. */
import { useEffect, useState } from "react";
import {
  analyzeStudent,
  generateRoadmap,
  getAiHealth,
  layPhanTichDaLuu,
  luuPhanTich,
  type AiAnalysis,
  type AiHealth,
  type AiRoadmap,
} from "./api";
import AiKeyNotice from "./AiKeyNotice";
import AiResultDialog from "./AiResultDialog";

interface NutPhanTichProps {
  studentId: number;
}

/** Chuyển lỗi kỹ thuật thành câu tiếng Việt dễ hiểu. */
function dichLoi(e: unknown): string {
  const cau = e instanceof Error ? e.message : String(e);
  if (cau.includes("→ 401")) return "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại rồi thử phân tích.";
  if (cau.includes("→ 403")) return "Tài khoản của bạn không có quyền phân tích hồ sơ này.";
  if (cau.includes("→ 404")) return "Không tìm thấy hồ sơ học sinh để phân tích.";
  if (cau.includes("Failed to fetch") || cau.includes("NetworkError") || cau.includes("Load failed"))
    return "Không kết nối được máy chủ, vui lòng kiểm tra mạng rồi thử lại.";
  return `Chưa phân tích được lúc này, vui lòng thử lại sau. (${cau.slice(0, 120)})`;
}

export default function AiAnalyzeButton({ studentId }: NutPhanTichProps) {
  // Trạng thái sức khỏe AI của backend (có khóa hay chưa).
  const [suckhoe, setSuckhoe] = useState<AiHealth | null>(null);
  // Đang gọi phân tích hay không (dùng cho aria-busy, chỉ khóa tạm thời khi đang tải).
  const [dangPhanTich, setDangPhanTich] = useState(false);
  // Đang gọi tạo lộ trình hay không.
  const [dangTaoLoTrinh, setDangTaoLoTrinh] = useState(false);
  // Kết quả và hộp thoại.
  const [ketQua, setKetQua] = useState<AiAnalysis | null>(null);
  const [loTrinh, setLoTrinh] = useState<AiRoadmap | null>(null);
  const [moHopThoai, setMoHopThoai] = useState(false);
  // Lỗi thân thiện hiển thị cho người dùng.
  const [loi, setLoi] = useState("");

  // Hỏi backend một lần lúc mở trang: có dùng được AI thật không.
  useEffect(() => {
    let conHieuLuc = true;
    getAiHealth()
      .then((duLieu) => {
        if (conHieuLuc) setSuckhoe(duLieu);
      })
      .catch(() => {
        // Không làm sập trang khi backend chưa bật AI; người dùng vẫn bấm nút được.
        if (conHieuLuc) setSuckhoe(null);
      });
    return () => {
      conHieuLuc = false;
    };
  }, []);

  const thieuKhoa = suckhoe !== null && (!suckhoe.has_api_key || !suckhoe.client_ready);

  // Xử lý bấm nút: dùng lại kết quả mới phân tích trong 5 phút để đỡ tốn phí.
  const xuLyPhanTich = async () => {
    if (dangPhanTich) return;
    setLoi("");
    const daLuu = layPhanTichDaLuu(studentId);
    if (daLuu) {
      setKetQua(daLuu);
      setMoHopThoai(true);
      return;
    }
    setDangPhanTich(true);
    try {
      const duLieu = await analyzeStudent(studentId);
      luuPhanTich(studentId, duLieu);
      setKetQua(duLieu);
      setLoTrinh(null);
      setMoHopThoai(true);
    } catch (e) {
      setLoi(dichLoi(e));
    } finally {
      // Luôn mở khóa nút sau khi xong để không kẹt vô hiệu vĩnh viễn.
      setDangPhanTich(false);
    }
  };

  // Tạo lộ trình theo yêu cầu riêng (không tự gọi kèm để tiết kiệm phí).
  const xuLyTaoLoTrinh = async () => {
    if (dangTaoLoTrinh) return;
    setDangTaoLoTrinh(true);
    try {
      const duLieu = await generateRoadmap(studentId);
      setLoTrinh(duLieu);
    } catch (e) {
      setLoi(dichLoi(e));
    } finally {
      setDangTaoLoTrinh(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={xuLyPhanTich}
          disabled={dangPhanTich}
          aria-busy={dangPhanTich}
          aria-label={dangPhanTich ? "Đang phân tích bằng AI" : "Phân tích bằng AI"}
          className="rounded-xl bg-portal px-4 py-2 text-sm font-semibold text-white hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
        >
          {dangPhanTich ? "Đang phân tích…" : "✨ Phân tích bằng AI"}
        </button>
        <span className="text-xs text-muted">Mất vài giây, cần xác nhận mỗi lần bấm, không tự gọi lại.</span>
      </div>

      {thieuKhoa && <AiKeyNotice provider={suckhoe?.provider} />}

      {loi && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loi}
        </p>
      )}

      <AiResultDialog
        mo={moHopThoai}
        dangTaiLoTrinh={dangTaoLoTrinh}
        phanTich={ketQua}
        loTrinh={loTrinh}
        laDuPhong={thieuKhoa}
        onDong={() => setMoHopThoai(false)}
        onTaoLoTrinh={xuLyTaoLoTrinh}
      />
    </div>
  );
}
