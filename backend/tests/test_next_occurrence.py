"""B1 回归测试：monthly 重复任务跨年/跨月钳制。"""
from datetime import date

from app.routers.tasks import next_occurrence


def test_daily():
    assert next_occurrence(date(2026, 1, 10), "daily") == date(2026, 1, 11)


def test_weekly():
    assert next_occurrence(date(2026, 1, 28), "weekly") == date(2026, 2, 4)


def test_monthly_end_of_jan():
    # 原实现会错误跳到次年 1 月；修复后应钳制到 2 月最后一天
    assert next_occurrence(date(2026, 1, 31), "monthly") == date(2026, 2, 28)


def test_monthly_end_of_mar():
    assert next_occurrence(date(2026, 3, 31), "monthly") == date(2026, 4, 30)


def test_monthly_end_of_dec():
    # 跨年仅 12 月是“正确”的旧行为，确认仍正确
    assert next_occurrence(date(2026, 12, 31), "monthly") == date(2027, 1, 31)


def test_monthly_leap_feb():
    assert next_occurrence(date(2024, 1, 31), "monthly") == date(2024, 2, 29)


def test_none_date_uses_today():
    d = next_occurrence(None, "daily")
    assert d == date.today() + __import__("datetime").timedelta(days=1)


def test_unknown_recurrence_returns_base():
    assert next_occurrence(date(2026, 5, 15), "none") == date(2026, 5, 15)
