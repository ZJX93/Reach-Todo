"""服务端富文本清洗（XSS 防护）。

记录内容以 HTML 形式存储，原先只在浏览器端做清洗（且自研 sanitize 用 innerHTML
解析本身存在风险）。这里在入库前做一次服务端清洗，作为不可替代的二道防线。
优先使用 Rust 实现的 nh3（快且安全）；未安装时退化为「去掉所有标签」以确保安全。
"""
from __future__ import annotations

import re
import logging

logger = logging.getLogger("reach.sanitize")

try:
    import nh3

    _HAS_NH3 = True
except ImportError:  # pragma: no cover - 取决于运行环境是否安装 nh3
    nh3 = None
    _HAS_NH3 = False

# 允许的标签（与前端 editor 基本对齐，去掉 img/script/iframe 等危险标签）
ALLOWED_TAGS = {
    "b", "strong", "i", "em", "u", "s",
    "span", "div", "br", "p", "font", "a",
    "ul", "ol", "li", "h3", "h4",
}
# 仅放行安全的属性；不放行 style（避免 CSS 数据外泄），javascript: 协议由 nh3 默认过滤
ALLOWED_ATTRIBUTES = {
    "a": {"href"},
    "font": {"color"},
}

_TAG_RE = re.compile(r"<[^>]+>")


def sanitize_html(value: str | None) -> str | None:
    """清洗 HTML。空值原样返回。"""
    if not value:
        return value
    if _HAS_NH3:
        return nh3.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES)
    # 兜底：直接去除全部标签（牺牲富文本格式，保证不出 XSS）
    logger.warning("nh3 未安装，记录内容已退化为纯文本以保证安全")
    return _TAG_RE.sub("", value)
