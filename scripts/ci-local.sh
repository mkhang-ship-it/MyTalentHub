#!/usr/bin/env bash
# Chạy trọn bộ kiểm tra giống CI ngay tại máy dev, dừng ngay khi bước đầu đỏ.
#
#   ./scripts/ci-local.sh             # đủ 6 bước (chậm ở Playwright)
#   ./scripts/ci-local.sh --fast      # bỏ qua Playwright để lặp nhanh
#   ./scripts/ci-local.sh --clean-env # mô phỏng "máy sạch" (xem dưới)
#
# Thứ tự đúng như CI:
#   1. backend unittest (tự dựng server + DB riêng ở :8099, không đụng server thật)
#   2. scripts/qa.py (cần backend :8001 đang chạy — chỉ ĐỌC, không kill server)
#   3. npx tsc --noEmit
#   4. npx eslint src tests --max-warnings 0
#   5. npx vite build
#   6. npx playwright test (chế độ cách ly CI=true: server riêng :8101/:5175)
#
# Cờ --clean-env: tạm GIẤU backend/talenthub.db rồi chạy, để bắt đúng loại lỗi
# "chạy được trên máy tôi nhưng fail trên CI" (test phụ thuộc dữ liệu cục bộ
# mà file đó bị .gitignore). File LUÔN được khôi phục (kèm kiểm tra md5) kể cả
# khi bước nào đỏ — nhờ trap. Trong chế độ này bước qa.py được BỎ QUA có lý do:
# qa.py vừa gọi server :8001 thật vừa đọc trực tiếp file DB (thiết kế để kiểm
# toán DB thật), nên không thể chạy lúc file bị giấu — ép chạy sẽ tạo file DB
# rỗng và làm nhiễu server đang chạy.
#
# Cờ này đã dùng để xác nhận bản sửa trong dự án này: backend/tests/base.py tự
# seed DB tạm bằng app.seed khi thiếu file, playwright chế độ cách ly cũng tự
# seed — nên --clean-env phải XANH; đỏ nghĩa là lại có test mới phụ thuộc file
# cục bộ.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB="$ROOT/backend/talenthub.db"
HIDDEN="$DB.hidden-by-ci-local"
FAST=0
CLEAN=0

usage() {
  sed -n '2,30p' "$0"
  exit "${1:-0}"
}

for arg in "$@"; do
  case "$arg" in
    --fast) FAST=1 ;;
    --clean-env) CLEAN=1 ;;
    -h|--help) usage 0 ;;
    *) echo "ci-local.sh: cờ không rõ: $arg (dùng --help)" >&2; exit 2 ;;
  esac
done

# Python chạy unittest: dùng đúng `python3` như lệnh CI (brief yêu cầu literal).
# LƯU Ý đã kiểm chứng: backend/.venv trên máy này THIẾU httpx2 nên
# tests/test_audit_log.py (import fastapi.testclient) fail khi chạy bằng venv,
# trong khi python3 hệ thống có đủ — dùng venv sẽ báo đỏ oan, sai lệch với CI.
PY="python3"

declare -a STEP_NAMES=()
declare -a STEP_RESULTS=()
declare -a STEP_SECS=()

cleanup() {
  # Khôi phục DB bị giấu (nếu có) + kiểm tra toàn vẹn bằng md5.
  if [ -f "$HIDDEN" ]; then
    mv -f "$HIDDEN" "$DB"
    if [ -n "${DB_MD5_BEFORE:-}" ]; then
      if [ "$(md5 -q "$DB" 2>/dev/null || md5sum "$DB" | cut -d' ' -f1)" = "$DB_MD5_BEFORE" ]; then
        echo "ci-local.sh: đã khôi phục $DB (md5 khớp)."
      else
        echo "ci-local.sh: CẢNH BÁO: $DB đã khôi phục nhưng md5 KHÁC trước khi giấu!" >&2
      fi
    else
      echo "ci-local.sh: đã khôi phục $DB."
    fi
  fi
}
trap cleanup EXIT INT TERM

print_summary() {
  echo ""
  echo "================ TỔNG KẾT ci-local.sh ================"
  local i rc=0
  for i in "${!STEP_NAMES[@]}"; do
    printf "  [%-4s] %5ss  %s\n" "${STEP_RESULTS[$i]}" "${STEP_SECS[$i]}" "${STEP_NAMES[$i]}"
    [ "${STEP_RESULTS[$i]}" = "PASS" ] || [ "${STEP_RESULTS[$i]}" = "SKIP" ] || rc=1
  done
  echo "======================================================"
  return "$rc"
}

# run_step "tên bước" -- lệnh...
run_step() {
  local name="$1"; shift
  echo ""
  echo "▶ $name"
  local start=$SECONDS
  if "$@"; then
    local secs=$((SECONDS - start))
    echo "✓ $name — xong trong ${secs}s"
    STEP_NAMES+=("$name"); STEP_RESULTS+=("PASS"); STEP_SECS+=("$secs")
    return 0
  fi
  local secs=$((SECONDS - start))
  echo "✗ $name — ĐỎ sau ${secs}s, dừng ngay." >&2
  STEP_NAMES+=("$name"); STEP_RESULTS+=("FAIL"); STEP_SECS+=("$secs")
  print_summary
  exit 1
}

skip_step() {
  echo ""
  echo "○ Bỏ qua: $1 ($2)"
  STEP_NAMES+=("$1"); STEP_RESULTS+=("SKIP"); STEP_SECS+=("0")
}

# --- Chế độ --clean-env: cảnh báo + giấu file trước mọi bước ---
if [ "$CLEAN" = "1" ]; then
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "CẢNH BÁO --clean-env: sắp TẠM GIẤU backend/talenthub.db để mô phỏng"
  echo "máy sạch (bắt lỗi test phụ thuộc dữ liệu cục bộ). File sẽ được khôi"
  echo "phục + kiểm md5 khi script kết thúc, KỂ CẢ khi có bước đỏ (trap)."
  echo "Trong chế độ này bước qa.py được BỎ QUA vì nó cần DB thật (xem đầu file)."
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  if [ -f "$DB" ]; then
    DB_MD5_BEFORE="$(md5 -q "$DB" 2>/dev/null || md5sum "$DB" | cut -d' ' -f1)"
    mv -f "$DB" "$HIDDEN"
    echo "ci-local.sh: đã giấu $DB (md5 trước khi giấu: $DB_MD5_BEFORE)."
  else
    echo "ci-local.sh: không thấy $DB — máy vốn đã 'sạch', bỏ qua bước giấu."
  fi
fi

# 1. Backend unittest (tự đủ: server + DB riêng, không đụng :8001).
run_step "1/6 backend unittest" bash -c "cd '$ROOT/backend' && '$PY' -m unittest discover -s tests -t . -v"

# 2. QA nhanh (cần server :8001 đang chạy; bỏ qua ở chế độ --clean-env).
if [ "$CLEAN" = "1" ]; then
  skip_step "2/6 scripts/qa.py" "chế độ --clean-env: qa.py cần DB thật đang chạy"
else
  run_step "2/6 scripts/qa.py" "$PY" "$ROOT/scripts/qa.py"
fi

# 3-5. Frontend: tsc, eslint, build.
run_step "3/6 tsc --noEmit" bash -c "cd '$ROOT/frontend' && npx tsc --noEmit"
run_step "4/6 eslint src tests" bash -c "cd '$ROOT/frontend' && npx eslint src tests --max-warnings 0"
run_step "5/6 vite build" bash -c "cd '$ROOT/frontend' && npx vite build"

# 6. Playwright (chế độ cách ly CI=true: server riêng, không đụng :8001/:5174).
if [ "$FAST" = "1" ]; then
  skip_step "6/6 playwright test" "--fast"
else
  if pgrep -f "playwright test" >/dev/null 2>&1; then
    echo "✗ Phát hiện tiến trình 'playwright test' khác đang chạy — hai bộ test" >&2
    echo "  song song sẽ giẫm thư mục test-results rồi fail oan. Dừng." >&2
    STEP_NAMES+=("6/6 playwright test"); STEP_RESULTS+=("FAIL"); STEP_SECS+=("0")
    print_summary
    exit 1
  fi
  run_step "6/6 playwright test (cách ly)" bash -c "cd '$ROOT/frontend' && CI=true npx playwright test"
fi

print_summary
