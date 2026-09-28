/** Thông báo thân thiện khi backend chưa cấu hình khóa AI (không phải lỗi đỏ kỹ thuật). */
export default function AiKeyNotice({ provider }: { provider?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Tính năng AI chưa được bật — quản trị viên cần cấu hình khóa API.</p>
      <p className="mt-1">
        Backend đang dùng nhà cung cấp {provider ?? "gemini"} nhưng chưa có khóa. Kết quả bên dưới (nếu có)
        là gợi ý theo quy tắc có sẵn, không phải do AI tạo.
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]">
        <li>Lấy khóa miễn phí tại Google AI Studio (aistudio.google.com → Get API key).</li>
        <li>Đặt GEMINI_API_KEY vào file .env trên máy chủ backend (xem mẫu backend/.env.example).</li>
        <li>Khởi động lại backend rồi tải lại trang. Tuyệt đối không commit khóa lên git.</li>
      </ol>
    </div>
  );
}
