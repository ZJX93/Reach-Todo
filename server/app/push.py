"""FCM 多端推送（Firebase Cloud Messaging HTTP v1）。

不依赖 firebase-admin / google-auth，直接用项目既有依赖
（python-jose 签 RS256 JWT + httpx 换 token + 发消息）实现，
避免引入 grpc 等重型依赖，也无需改动 requirements.lock。

凭证（二选一，从环境变量读取）：
  - FCM_SERVICE_ACCOUNT_JSON : 服务账号 JSON 文件路径
  - 或 FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY 三个分开给
未配置时 send_to_user 直接 no-op（打 warning），不影响主流程。
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from jose import jwt
from sqlalchemy import select

from .config import (
    FCM_CLIENT_EMAIL,
    FCM_PRIVATE_KEY,
    FCM_PROJECT_ID,
    FCM_SERVICE_ACCOUNT_JSON,
)
from .database import SessionLocal
from .models import DeviceToken

logger = logging.getLogger("reach.push")

_FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_FCM_ENDPOINT = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
_REMINDER_CHANNEL = "reach_reminders"


def _load_service_account() -> Optional[dict]:
    """读取服务账号凭证（支持文件路径或拆分的环境变量）。"""
    if FCM_SERVICE_ACCOUNT_JSON and os.path.exists(FCM_SERVICE_ACCOUNT_JSON):
        try:
            with open(FCM_SERVICE_ACCOUNT_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except OSError as e:
            logger.warning("读取 FCM_SERVICE_ACCOUNT_JSON 失败: %s", e)
            return None
    if FCM_PROJECT_ID and FCM_CLIENT_EMAIL and FCM_PRIVATE_KEY:
        return {
            "project_id": FCM_PROJECT_ID,
            "client_email": FCM_CLIENT_EMAIL,
            # 环境变量里常见 \n 转义，统一归一为真实换行
            "private_key": FCM_PRIVATE_KEY.replace("\\n", "\n"),
        }
    return None


async def _access_token(sa: dict) -> str:
    """用服务账号私钥签 JWT，向 Google OAuth2 换取 access_token。"""
    now = int(datetime.now(timezone.utc).timestamp())
    assertion = jwt.encode(
        {
            "iss": sa["client_email"],
            "scope": _FCM_SCOPE,
            "aud": _TOKEN_URL,
            "iat": now,
            "exp": now + 3600,
        },
        sa["private_key"],
        algorithm="RS256",
    )
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def send_to_user(
    user_id: int,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """向某用户的所有注册设备推送。返回成功发送的设备数。"""
    sa = _load_service_account()
    if sa is None:
        logger.warning(
            "FCM 未配置（需 FCM_SERVICE_ACCOUNT_JSON 或 "
            "FCM_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY），跳过推送"
        )
        return 0

    async with SessionLocal() as db:
        tokens = (
            await db.execute(
                select(DeviceToken).where(DeviceToken.user_id == user_id)
            )
        ).scalars().all()
    if not tokens:
        return 0

    project_id = sa.get("project_id")
    try:
        access = await _access_token(sa)
    except Exception:  # noqa: BLE001
        logger.exception("获取 FCM access_token 失败")
        return 0

    payload_data = {k: str(v) for k, v in (data or {}).items()}
    sent = 0
    async with httpx.AsyncClient(timeout=10) as client:
        for dt in tokens:
            message: dict = {
                "token": dt.token,
                "notification": {"title": title, "body": body},
            }
            if payload_data:
                message["data"] = payload_data
            if dt.platform == "web":
                message["webpush"] = {
                    "notification": {
                        "title": title,
                        "body": body,
                        "icon": "/icon.svg",
                    },
                    "fcm_options": {"link": payload_data.get("link", "/")},
                }
            else:
                message["android"] = {
                    "notification": {
                        "channel_id": _REMINDER_CHANNEL,
                        "sound": "default",
                    }
                }
            try:
                r = await client.post(
                    _FCM_ENDPOINT.format(project_id=project_id),
                    headers={
                        "Authorization": f"Bearer {access}",
                        "Content-Type": "application/json",
                    },
                    json={"message": message},
                )
                if r.status_code == 200:
                    sent += 1
                else:
                    logger.warning("FCM 发送失败 %s: %s", r.status_code, r.text[:200])
            except Exception:  # noqa: BLE001
                logger.exception("FCM 发送异常")
    return sent
