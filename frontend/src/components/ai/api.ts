/** Gói gọi API AI — dùng get/post dùng chung, không chứa khóa API ở frontend. */
import { get, post } from "../../api/client";

/** Trạng thái sức khỏe AI từ backend (GET /ai/health). */
export interface AiHealth {
  status: string;
  provider: string;
  has_api_key: boolean;
  client_ready: boolean;
}

/** Kết quả phân tích năng lực (POST /ai/analyze/{id}). */
export interface AiAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommended_fields: string[];
  career_suggestions: string[];
  confidence_score: number;
}

/** Một tháng trong lộ trình (POST /ai/roadmap/{id}). */
export interface AiRoadmapMonth {
  month: number;
  title: string;
  goal: string;
  actions: string[];
  expected_outcome: string;
  suggested_activities: string[];
}

/** Lộ trình 3 tháng. */
export interface AiRoadmap {
  overall_goal: string;
  months: AiRoadmapMonth[];
  key_milestones: string[];
}

/** Lấy trạng thái AI của backend. */
export function getAiHealth(): Promise<AiHealth> {
  return get<AiHealth>("/ai/health");
}

/** Gọi phân tích năng lực cho một học sinh. Body rỗng vì backend tự dựng hồ sơ từ CSDL. */
export function analyzeStudent(studentId: number): Promise<AiAnalysis> {
  return post<AiAnalysis>(`/ai/analyze/${studentId}`, {});
}

/** Gọi tạo lộ trình 3 tháng cho một học sinh. */
export function generateRoadmap(studentId: number): Promise<AiRoadmap> {
  return post<AiRoadmap>(`/ai/roadmap/${studentId}`, {});
}

// Bộ nhớ đệm nhẹ phía client để tiết kiệm phí API: cùng một học sinh mà vừa
// phân tích xong (trong 5 phút) thì dùng lại, không gọi backend lần nữa.
// Backend đã lưu lịch sử vào bảng AiSuggestion (xem GET /ai/suggestions/{id}),
// nên không làm thêm cache phía server để giữ thay đổi tối thiểu.
const PHAN_TICH_TTL_MS = 5 * 60 * 1000;

const boNhoDemPhanTich = new Map<number, { duLieu: AiAnalysis; lucLay: number }>();

/** Đọc kết quả phân tích còn hạn trong bộ nhớ đệm (nếu có). */
export function layPhanTichDaLuu(studentId: number): AiAnalysis | null {
  const muc = boNhoDemPhanTich.get(studentId);
  if (!muc) return null;
  if (Date.now() - muc.lucLay > PHAN_TICH_TTL_MS) {
    boNhoDemPhanTich.delete(studentId);
    return null;
  }
  return muc.duLieu;
}

/** Lưu kết quả phân tích vào bộ nhớ đệm. */
export function luuPhanTich(studentId: number, duLieu: AiAnalysis): void {
  boNhoDemPhanTich.set(studentId, { duLieu, lucLay: Date.now() });
}
