#!/usr/bin/env bash
# Dừng sạch các tiến trình do scripts/dev.sh dựng.
#
#   ./scripts/dev-stop.sh
#
# Chỉ kill đúng PID đã ghi trong pidfile (mặc định
# ${TMPDIR:-/tmp}/ftalenthub-dev.pids) — KHÔNG kill theo tên, nên không bao
# giờ chạm vào server của người khác (ví dụ server coordinator ở :8001/:5174).
# Sau khi dừng, script QUÉT cổng và báo các listener còn sót (tiến trình mồ côi
# hoặc server của người khác) để bạn tự kiểm tra — script không tự kill chúng.
#
# Dùng cùng biến môi trường với dev.sh khi đổi cổng/pidfile:
#   BACKEND_PORT=8009 FRONTEND_PORT=5179 PIDFILE=/tmp/x.pids ./scripts/dev-stop.sh
set -u

BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5174}"
PIDFILE="${PIDFILE:-${TMPDIR:-/tmp}/ftalenthub-dev.pids}"

stop_pid() {
  local pid="$1" i
  kill -0 "$pid" 2>/dev/null || { echo "  PID $pid đã dừng từ trước."; return 0; }
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill -TERM "$child" 2>/dev/null
  done
  kill -TERM "$pid" 2>/dev/null
  for i in $(seq 1 5); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 1
  done
  if kill -0 "$pid" 2>/dev/null; then
    for child in $(pgrep -P "$pid" 2>/dev/null); do
      kill -KILL "$child" 2>/dev/null
    done
    kill -KILL "$pid" 2>/dev/null
    sleep 1
  fi
  if kill -0 "$pid" 2>/dev/null; then
    echo "  PID $pid KHÔNG dừng được — kiểm tra tay: ps -p $pid -o pid,ppid,command"
    return 1
  fi
  echo "  PID $pid đã dừng."
  return 0
}

listeners() {
  # In "PID:command" các tiến trình đang nghe trên cổng $1 (rỗng nếu không có).
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":$1" -sTCP:LISTEN -t 2>/dev/null | while read -r p; do
      echo "$p:$(ps -p "$p" -o command= 2>/dev/null | head -c 80)"
    done
  else
    echo "(không có lsof — bỏ qua quét cổng $1, dùng: pgrep -af 'uvicorn|vite')"
  fi
}

rc=0
if [ -f "$PIDFILE" ]; then
  echo "dev-stop.sh: dừng các PID trong $PIDFILE ..."
  while read -r pid; do
    [ -n "$pid" ] || continue
    stop_pid "$pid" || rc=1
  done <"$PIDFILE"
  rm -f "$PIDFILE"
else
  echo "dev-stop.sh: không thấy pidfile $PIDFILE (dev.sh chưa chạy hoặc đã dọn)."
fi

echo "dev-stop.sh: quét tiến trình còn sót trên cổng dev ..."
leftover=0
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  found="$(listeners "$port")"
  if [ -n "$found" ]; then
    leftover=1
    echo "  Cổng $port vẫn có listener (mồ côi hoặc server của người khác — KHÔNG tự kill):"
    echo "$found" | sed 's/^/    /'
  else
    echo "  Cổng $port: sạch."
  fi
done

if [ "$leftover" = "1" ]; then
  echo "dev-stop.sh: XONG (pidfile đã dọn) — nhưng vẫn còn listener, kiểm tra tay trước khi kill: lsof -i :<cổng> -sTCP:LISTEN"
else
  echo "dev-stop.sh: XONG — sạch, không còn tiến trình nào."
fi
exit "$rc"
