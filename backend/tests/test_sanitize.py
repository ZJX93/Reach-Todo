"""S3 回归测试：服务端 HTML 清洗不漏 XSS。"""
from app.sanitize import sanitize_html


def test_script_removed():
    out = sanitize_html("<p>hi</p><script>alert(1)</script>")
    assert "<script" not in out
    assert "hi" in out


def test_event_handler_removed():
    out = sanitize_html('<img src=x onerror="alert(1)">')
    assert "onerror" not in out


def test_javascript_href_removed():
    out = sanitize_html('<a href="javascript:alert(1)">x</a>')
    # nh3 默认过滤 javascript: 协议；兜底正则也会去标签
    assert "javascript:" not in out


def test_allowed_tags_kept():
    out = sanitize_html("<b>粗</b><ul><li>项</li></ul>")
    assert "<b>" in out
    assert "<li>" in out


def test_style_stripped_to_avoid_css_exfil():
    out = sanitize_html('<span style="background:url(https://evil.com/a)">x</span>')
    assert "style" not in out


def test_none_passthrough():
    assert sanitize_html(None) is None
