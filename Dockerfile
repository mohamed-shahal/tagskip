# syntax=docker/dockerfile:1
# Frontend image: builds the Vite app and serves it with nginx.
# The backend lives in backend/Dockerfile; docker-compose.yml runs both.
#
#   docker build -t tagskip-web .
#
# nginx proxies /api to the `backend` service, so the app talks to the API
# same-origin and no CORS or VITE_API_BASE_URL is needed.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
