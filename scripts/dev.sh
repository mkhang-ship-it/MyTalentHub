#!/usr/bin/env bash
# Chạy toàn bộ FTalentHub ở chế độ dev bằng MỘT lệnh.
#
#   ./scripts/dev.sh
#
# Mặc định: backend uvicorn ở :8001, frontend vite ở :5174 với
# VITE_API_PROXY trỏ đúng :8001 (xem frontend/vite.config.ts).
# Đổi cổng khi bị chiếm (ví dụ server của người khác đang chạy):
#   BACKEND_PORT=8009 FRONTEND_PORT=5179 ./scripts/dev.sh
#
# Script chờ cả hai báo healthy rồi mới in URL. Nhấn Ctrl+C để dừng:
# trap dọn SẠCH cả hai tiến trình con (kể cả cháu như uvicorn --reload
# hay esbuild của vite), không để lại tiến trình mồ côi.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5174}"
VITE_API_PROXY="${VITE_API_PROXY:-http://127.0.0.1:${BACKEND_PORT}}"
PIDFILE="${PIDFILE:-${TMPDIR:-/tmp}/ftalenthub-dev.pids}"
API_LOG="${API_LOG:-${TMPDIR:-/tmp}/ftalenthub-dev-api.log}"
WEB_LOG="${WEB_LOG:-${TMPDIR:-/tmp}/ftalenthub-dev-web.log}"

API_PID=""
WEB_PID=""

die() { echo "dev.sh: LỖI: $*" >&2; exit 1; }

port_busy() { curl -s -m 2 -o /dev/null "http://127.0.0.1:$1/" 2>/dev/null; }

kill_tree() {
  # Dừng tiến trình + con/cháu trực tiếp (uvicorn --reload, esbuild...).
  # Chỉ kill đúng PID đã ghi, KHÔNG kill theo tên để khỏi chạm server người khác.
  for pid in "$1"; do
    [ -n "$pid" ] || continue
    kill -0 "$pid" 2>/dev/null || continue
    for child in $(pgrep -P "$pid" 2>/dev/null); do
      kill -TERM "$child" 2>/dev/null
    done
    kill -TERM "$pid" 2>/dev/null
  done
  sleep 2
  for pid in "$1"; do
    [ -n "$pid" ] || continue
    if kill -0 "$pid" 2>/dev/null; then
      for child in $(pgrep -P "$pid" 2>/dev/null); do
        kill -KILL "$child" 2>/dev/null
      done
      kill -KILL "$pid" 2>/dev/null
    fi
  done
}

cleanup() {
  trap - INT TERM EXIT
  [ -n "$API_PID" ] && kill_tree "$API_PID"
  [ -n "$WEB_PID" ] && kill_tree "$WEB_PID"
  wait 2>/dev/null
  rm -f "$PIDFILE"
  echo "dev.sh: đã dừng sạch backend + frontend."
}

# --- Kiểm tra cổng trước khi dựng (fail nhanh, báo rõ) ---
if port_busy "$BACKEND_PORT"; then
  die "cổng backend $BACKEND_PORT đã có tiến trình khác nghe (có thể server của coordinator). Đặt BACKEND_PORT khác, ví dụ: BACKEND_PORT=8009 $0"
fi
if port_busy "$FRONTEND_PORT"; then
  die "cổng frontend $FRONTEND_PORT đã có tiến trình khác nghe. Đặt FRONTEND_PORT khác, ví dụ: FRONTEND_PORT=5179 $0"
fi

# --- Python cho backend: ưu tiên venv của repo ---
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY="python3"
command -v npm >/dev/null 2>&1 || die "không tìm thấy npm (cần Node 20+ cho frontend)"

trap cleanup INT TERM EXIT

# --- Dựng backend ---
cd "$ROOT/backend"
"$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" --reload \
  >"$API_LOG" 2>&1 &
API_PID=$!
cd "$ROOT"

# --- Dựng frontend ---
# --host 127.0.0.1: bắt vite nghe IPv4 loopback (mặc định nó chỉ nghe
# "localhost" và có máy phân giải ra ::1 khiến curl 127.0.0.1 thất bại).
cd "$ROOT/frontend"
VITE_PORT="$FRONTEND_PORT" VITE_API_PROXY="$VITE_API_PROXY" npm run dev -- --host 127.0.0.1 \
  >"$WEB_LOG" 2>&1 &
WEB_PID=$!
cd "$ROOT"

echo "$API_PID" >"$PIDFILE"
echo "$WEB_PID" >>"$PIDFILE"

# --- Chờ healthy (tối đa 60s mỗi service) ---
echo "dev.sh: đang chờ backend :$BACKEND_PORT ..."
ok_api=0
for _ in $(seq 1 60); do
  if curl -s -m 2 "http://127.0.0.1:${BACKEND_PORT}/api/v1/health" 2>/dev/null | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    ok_api=1; break
  fi
  kill -0 "$API_PID" 2>/dev/null || { echo "--- $API_LOG ---" >&2; tail -20 "$API_LOG" >&2; die "backend chết khi khởi động, xem log: $API_LOG"; }
  sleep 1
done
[ "$ok_api" = "1" ] || die "backend không healthy sau 60s, xem log: $API_LOG"

echo "dev.sh: đang chờ frontend :$FRONTEND_PORT ..."
ok_web=0
for _ in $(seq 1 60); do
  if curl -s -m 2 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${FRONTEND_PORT}/" 2>/dev/null | grep -q "^200$"; then
    ok_web=1; break
  fi
  kill -0 "$WEB_PID" 2>/dev/null || { echo "--- $WEB_LOG ---" >&2; tail -20 "$WEB_LOG" >&2; die "frontend chết khi khởi động, xem log: $WEB_LOG"; }
  sleep 1
done
[ "$ok_web" = "1" ] || die "frontend không healthy sau 60s, xem log: $WEB_LOG"

echo "dev.sh: SẴN SÀNG"
echo "  Backend : http://localhost:${BACKEND_PORT}  (health: /api/v1/health)"
echo "  Frontend: http://localhost:${FRONTEND_PORT}  (VITE_API_PROXY=$VITE_API_PROXY)"
echo "Nhấn Ctrl+C để dừng cả hai (dọn sạch, không để mồ côi)."

# --- Giữ foreground: nếu một service chết thì dừng service còn lại ---
while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 1
done
echo "dev.sh: một service đã dừng, đang dọn service còn lại..." >&2
exit 1
# cleanup chạy qua trap EXIT
