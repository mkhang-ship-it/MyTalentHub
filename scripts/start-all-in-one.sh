#!/bin/sh
# Entrypoint cho image MỘT service: nginx (SPA + proxy /api) và uvicorn (FastAPI)
# cùng chạy trong một container.
#
# VÌ SAO CẦN FILE NÀY
# -------------------
# Nginx nghe ở $PORT (Render gán) và chuyển tiếp /api sang 127.0.0.1:$API_PORT.
# Không thể chia sẻ một cổng nên uvicorn CHỈ nghe trong loopback — không có gì từ
# internet chạm thẳng vào FastAPI được, mọi request đều phải đi qua nginx. Đây
# cũng là lý do không cần cấu hình CORS: trình duyệt chỉ nói chuyện với nginx.
#
# Xử lý tín hiệu: Render dừng container bằng SIGTERM tới PID 1 (shell này). Nếu
# không dừng uvicorn theo, nó sẽ mồ côi tới lần chạy sau. Bất kỳ tiến trình nào
# chết cũng kéo container chết theo — nếu chỉ uvicorn chết mà nginx còn sống thì
# mọi request /api trả 502 vô hình, khó đoán hơn nhiều so với container restart
# rõ ràng.

set -e

# Hai cổng này BẮT BUỘC khác nhau: nginx nghe $PORT, uvicorn nghe $API_PORT.
# Nếu bằng nhau, uvicorn giữ cổng trước rồi nginx chết với
# "bind() failed (98: Address already in use)".
API_PORT="${API_PORT:-8002}"
PORT="${PORT:-8001}"

# Python nằm trong venv, không phải Python hệ thống: image gốc là nginx:stable
# (Debian) chỉ có `python3`, KHÔNG có lệnh `python`. Ngoài ra Debian đánh dấu
# Python hệ thống là "externally managed" nên pip cài vào đó sẽ bị từ chối.
PYTHON=/opt/venv/bin/python

export FTH_API_UPSTREAM="127.0.0.1:${API_PORT}"

# Dựng cấu hình nginx từ template, thay hai biến trên.
# CHỈ liệt kê đúng hai biến: `envsubst` không đối số sẽ thay MỌI biến môi
# trường, và nếu container lỡ có biến trùng tên với biến nginx ($host, $uri,
# $scheme…) thì cấu hình bị hỏng rất khó đoán.
TEMPLATE=/etc/nginx/templates/default.conf.template
OUTPUT=/etc/nginx/conf.d/default.conf
if [ -f "$TEMPLATE" ]; then
    envsubst '$FTH_API_UPSTREAM $PORT' < "$TEMPLATE" > "$OUTPUT"
else
    echo "KHÔNG THẤY $TEMPLATE — dùng cấu hình mặc định của nginx" >&2
fi

cd /app

"$PYTHON" -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port "${API_PORT}" \
    --no-access-log &
UVICORN_PID=$!

# Đợi API thực sự sẵn sàng trước khi nginx nhận traffic, để lần đầu khách
# vào không gặp 502. Tối đa 60 giây. Nếu uvicorn chết ngay thì thoát ngay để
# Render hiện rõ lỗi, thay vì để nginx lên rồi trả 502 vô nghĩa.
i=0
while [ "$i" -lt 60 ]; do
    if ! kill -0 "$UVICORN_PID" 2>/dev/null; then
        echo "uvicorn đã chết trước khi sẵn sàng — xem log phía trên" >&2
        wait "$UVICORN_PID" 2>/dev/null || true
        exit 1
    fi
    if "$PYTHON" -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(0 if s.connect_ex(('127.0.0.1', $API_PORT))==0 else 1)" 2>/dev/null; then
        break
    fi
    i=$((i + 1))
    sleep 1
done

# `nginx -g 'daemon off;'` chạy nền, không `exec` — vì cần giữ cả hai tiến trình.
nginx -g 'daemon off;' &
NGINX_PID=$!

term() {
    kill -TERM "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true
    wait "$UVICORN_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    exit 0
}
trap term TERM INT

# Vòng lặp thay cho `wait -n`: `wait -n` chỉ có trong bash và dash >= 0.5.12,
# ở đây dùng `kill -0` nên chắc chắn hoạt động với /bin/sh nào. Vòng lặp kết
# thúc ngay khi MỘT trong hai tiến trình chết, rồi term() dừng tiến trình còn lại.
while kill -0 "$UVICORN_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 2
done

term
