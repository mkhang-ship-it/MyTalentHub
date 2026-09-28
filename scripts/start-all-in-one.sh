#!/bin/sh
# Entrypoint cho image một-service: nginx (SPA + proxy /api) và uvicorn (FastAPI)
# cùng chạy trong một container.
#
# VÌ SAO CẦN FILE NÀY
# -------------------
# Nginx nghe ở $PORT (Render gán) và chuyển tiếp /api sang 127.0.0.1:$API_PORT.
# Không thể chạy cả hai ở chung một cổng nên uvicorn chỉ nghe trong loopback —
# không có gì từ internet chạm được trực tiếp vào FastAPI, mọi request đều phải
# đi qua nginx. Đây cũng là lý do không cần cấu hình CORS: trình duyệt chỉ nói
# chuyện với nginx.
#
# Xử lý tín hiệu: khi Render dừng container, SIGTERM tới PID 1 (nginx). Ta cần
# dừng uvicorn theo, nếu không nó sẽ mồ côi cho tới lần chạy sau. Vì vậy
# `nginx` chạy nền và shell này làm tiến trình chính, chờ cả hai rồi thoát.

set -e

API_PORT="${API_PORT:-8001}"
export FTH_API_UPSTREAM="127.0.0.1:${API_PORT}"

# Dọn pidfile/socket cũ từ lần chạy trước, nếu không uvicorn sẽ báo
# "address already in use" và container restart vòng lặp.
rm -f /tmp/uvicorn.pid

# `exec` không dùng ở đây vì cần giữ cả hai tiến trình.
python -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port "${API_PORT}" \
    --no-access-log &
UVICORN_PID=$!

# Đợi API thực sự sẵn sàng trước khi nginx nhận traffic, để lần đầu khách
# vào không gặp 502. Tối đa 60 giây; hết giờ thì vẫn khởi động nginx, vì kẹt
# API lâu hơn thì sẽ ra 502 từ nginx chứ tốt hơn là container chết.
i=0
while [ "$i" -lt 60 ]; do
    if python - "$API_PORT" <<'PY' 2>/dev/null
import socket, sys
s = socket.socket()
s.settimeout(1)
sys.exit(0 if s.connect_ex(("127.0.0.1", int(sys.argv[1]))) == 0 else 1)
PY
    then
        break
    fi
    i=$((i + 1))
    sleep 1
done

nginx -g 'daemon off;' &
NGINX_PID=$!

# Bất kỳ tiến trình nào chết thì container phải chết theo. Nếu chỉ uvicorn chết
# mà nginx còn sống thì mọi request /api trả 502 vô hình, khó đoán hơn nhiều so
# với container restart rõ ràng.
term() {
    kill -TERM "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true
    wait "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true
    exit 0
}
trap term TERM INT

# `wait -n` trả về khi tiến trình đầu tiên kết thúc, rồi ta dừng tiến trình còn
# lại. Không dùng `wait` không tham số vì nó chỉ về khi CẢ HAI đều xong.
wait -n
term
