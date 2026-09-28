# FTalentHub Web — Dockerfile frontend (Vite build + nginx phục vụ tĩnh)
# Build từ GỐC repo:  docker build -f frontend/Dockerfile -t fth-web ./frontend
# Khi chạy qua nginx, /api được proxy thẳng về service `api` nên KHÔNG cần VITE_API_PROXY.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /web
COPY package.json ./
# Repo hiện chưa có package-lock.json nên dùng `npm install` thay vì `npm ci`
# (khi nào có lockfile thì đổi lại `npm ci --no-audit --no-fund` cho build lặp lại được).
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Stage 2: chạy bằng nginx ----------
FROM nginx:alpine
# Copy vào `templates/` (không phải `conf.d/`) để entrypoint của image nginx
# chạy `envsubst` lúc khởi động và thay ${FTH_API_UPSTREAM} bằng địa chỉ backend
# thật. Nhờ đó cùng một image chạy được ở docker compose (biến = `api:8001`)
# lẫn trên Render (biến = URL công khai của service API).
#
# Phải set envsubst trong NGINX_ENVSUBST_TEMPLATE_PREFIX; mặc định image nginx
# chỉ thay các biến được liệt kê, nên ${FTH_API_UPSTREAM} sẽ bị giữ nguyên nếu
# không khai báo. `docker-entrypoint.d/20-envsubst-on-templates.sh` của image là
# nơi làm việc này.
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.conf
# Chỉ thay đúng hai biến này. Mặc định image nginx thay mọi biến môi trường có
# tồn tại, nên nếu container lỡ có biến trùng tên với biến nginx ($host, $uri,
# $scheme…) thì cấu hình bị hỏng rất khó đoán. Giới hạn danh sách thì envsubst
# chỉ đụng đúng biến ta muốn.
ENV NGINX_ENVSUBST_VARS=FTH_API_UPSTREAM:PORT
ENV FTH_API_UPSTREAM=api:8001
# Cổng nghe mặc định cho chạy docker/compose. Render gán PORT riêng (10000) và
# biến đó đè lên giá trị này khi chạy container — nên deploy thì nginx nghe đúng
# cổng Render mong đợi, mà chạy local vẫn là 80.
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
# Probe theo cùng cổng đang nghe, nếu không sẽ báo unhealthy oan khi PORT khác 80.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT:-80}/" || exit 1
