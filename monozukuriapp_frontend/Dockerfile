# Minimal frontend Dockerfile for the on-prem top-level docker-compose.
# Builds the Vite app and serves the static `dist/` output through nginx.
# Note: build-time env vars (VITE_*) come from the host shell or build args;
# add `--build-arg VITE_FOO=...` invocations as your deployment requires.

FROM node:20-alpine AS build
WORKDIR /app

# VITE_* build args are baked into the static bundle at build time. For the
# on-prem stack, VITE_DISABLE_AUTH=true short-circuits all Cognito logic.
ARG VITE_DISABLE_AUTH=true
ARG VITE_BACKEND_URL_V1=/api/v1
ENV VITE_DISABLE_AUTH=${VITE_DISABLE_AUTH}
ENV VITE_BACKEND_URL_V1=${VITE_BACKEND_URL_V1}

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
# /api/v1 must reach the NestJS backend service. nginx proxies it; the SPA
# is served from /usr/share/nginx/html.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
