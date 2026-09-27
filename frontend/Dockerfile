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
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
