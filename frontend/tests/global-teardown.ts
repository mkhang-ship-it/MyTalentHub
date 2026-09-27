import { readdir, rm } from "fs/promises";
import * as os from "os";
import * as path from "path";

/**
 * Dọn thư mục DB tạm của chế độ cách ly (CI=true).
 *
 * Xóa TOÀN BỘ thư mục `fth-pw-*` trong OS temp — không chỉ thư mục của lần chạy
 * hiện tại — vì ngay cả `npx playwright test --list` cũng nạp config (tạo bản
 * sao DB) nhưng không chạy teardown. Không chạy 2 bộ test song song (quy tắc
 * pgrep của dự án) nên quét vét là an toàn.
 */
export default async function globalTeardown(): Promise<void> {
  if (!process.env.CI && !process.env.FTH_PW_TMPDIR) return;
  const tmp = os.tmpdir();
  let removed = 0;
  for (const entry of await readdir(tmp)) {
    if (!entry.startsWith("fth-pw-")) continue;
    await rm(path.join(tmp, entry), { recursive: true, force: true });
    removed++;
  }
  console.log(`[playwright] Đã dọn ${removed} thư mục DB tạm (fth-pw-*).`);
}
