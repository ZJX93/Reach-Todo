# syntax=docker/dockerfile:1

# ============================================================
# 阶段 1：构建前端（React + Vite）
# 按 vite 配置 build.outDir 输出到 ../backend/static，
# 在容器内即 /src/backend/static，供阶段 2 拷入运行时镜像。
# ============================================================
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend

# 仅复制依赖清单以最大化利用 Docker 层缓存
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# 复制前端源码并构建（产物输出到 /src/backend/static）
COPY frontend/ ./
RUN npm run build

# ============================================================
# 阶段 2：Python 运行时（后端 + 静态托管，单端口 8000）
# ============================================================
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# 优先使用精确锁文件（可复现构建），失败则回退到宽松声明
COPY backend/requirements.lock ./requirements.lock
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.lock \
        -i https://mirrors.aliyun.com/pypi/simple/ \
        --trusted-host mirrors.aliyun.com \
    || pip install --no-cache-dir -r requirements.txt \
        -i https://mirrors.aliyun.com/pypi/simple/ \
        --trusted-host mirrors.aliyun.com

# 后端应用代码
COPY backend/app ./app

# 前端构建产物（由阶段 1 产出，对应 vite outDir ../backend/static）
COPY --from=frontend-build /src/backend/static ./static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
