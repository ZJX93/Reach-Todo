"""跨域复用的枚举类型（Literal）与公共类型别名。

集中定义可避免字符串散落导致脏数据入库，并作为前后端字段取值的单一真相源。
"""

from typing import Literal

# 紧急度
Priority = Literal["low", "normal", "high", "urgent"]
# 重要度（用于艾森豪威尔矩阵）
Importance = Literal["low", "normal", "high"]
Recurrence = Literal["none", "daily", "weekly", "monthly"]
TaskStatus = Literal["todo", "done"]
RecordType = Literal["diary", "worklog", "note"]
TemplateType = Literal["diary", "worklog", "note", "all"]
GoalStatus = Literal["active", "done"]
