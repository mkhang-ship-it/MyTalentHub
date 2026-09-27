import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Cổng backend mặc định của dự án. Cổng 8000 hay bị chương trình khác chiếm,
// nên backend thật của dự án chạy ở 8001 (xem frontend/.env.example).
const FALLBACK_BACKEND = "http://127.0.0.1:8001";

export default defineConfig(({ mode }) => {
  // Đọc biến từ file .env / .env.local / .env.[mode] (nếu có).
  // Biến khai báo ngay trên terminal vẫn được ưu tiên hơn.
  const fileEnv = loadEnv(mode, process.cwd(), "VITE_");
  const pick = (key: string): string | undefined => process.env[key] || fileEnv[key];

  const port = Number(pick("VITE_PORT") ?? 5173);
  const apiProxy = pick("VITE_API_PROXY");

  if (!apiProxy) {
    // Cảnh báo rõ ràng thay vì im lặng trỏ về mặc định sai (gây 500 ở trang đăng nhập).
    console.warn(
      [
        "",
        "⚠️  [FTalentHub] THIẾU biến VITE_API_PROXY — proxy /api đang dùng mặc định " +
          FALLBACK_BACKEND,
        "   Backend dự án chạy ở cổng 8001 (cổng 8000 thường đã bị chương trình khác chiếm).",
        "   Nếu backend chạy ở cổng khác, hãy tạo file frontend/.env.local (xem .env.example):",
        "       VITE_API_PROXY=http://127.0.0.1:8001",
        "   Không có biến này hoặc trỏ sai cổng → trang đăng nhập trả lỗi 500.",
        "",
      ].join("\n")
    );
  }

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        "/api": {
          target: apiProxy || FALLBACK_BACKEND,
          changeOrigin: true,
        },
      },
    },
  };
});
