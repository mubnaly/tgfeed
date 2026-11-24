# syntax=docker/dockerfile:1

# --- Stage 1: build the React SPA -------------------------------------------
FROM node:22-alpine AS frontend
RUN npm install -g pnpm@9
WORKDIR /fe

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# --- Stage 2: the Python backend (serves the SPA from TGFEED_STATIC_DIR) --
FROM python:3.11-slim AS base
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    TGFEED_DB_PATH=/data/tgfeed.db \
    TGFEED_ENTITY_CACHE_PATH=/data/entity_cache.json \
    TGFEED_STATIC_DIR=/app/static \
    TGFEED_HOST=0.0.0.0 \
    TGFEED_PORT=8792

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY tgfeed /app/tgfeed
RUN uv sync --frozen

COPY --from=frontend /fe/dist /app/static

VOLUME /data
EXPOSE 8792
CMD ["/app/.venv/bin/python", "-m", "tgfeed"]
