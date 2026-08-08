# syntax=docker/dockerfile:1
# Reach-Todo 后端 API 服务（纯 API，不再托管前端静态文件）
FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.lock ./requirements.lock
COPY requirements.txt ./requirements.txt
RUN sed -i '/mirrors.aliyun.com/d' requirements.lock requirements.txt 2>/dev/null; \
    pip install --no-cache-dir -r requirements.lock \
        || pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host mirrors.aliyun.com -r requirements.lock \
        || pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
