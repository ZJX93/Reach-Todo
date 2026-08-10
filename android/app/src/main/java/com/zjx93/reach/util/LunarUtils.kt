package com.zjx93.reach.util

import com.zjx93.reach.data.model.LunarInfo

/** 由 apihz 原始字段算出给日历展示用的农历文字（节日 + 农历 + 节气）。 */
fun lunarLabel(info: LunarInfo?): String? {
    if (info == null) return null
    val nri = info.nri ?: return null
    val base = if (nri == "初一") (info.nyue ?: nri) else nri
    val term = if (info.jieqiDays == "1") info.jieqi?.takeIf { it.isNotBlank() } else null
    val festival = info.jieri?.takeIf { it.isNotBlank() }
    return listOfNotNull(festival, base, term).joinToString(" ")
}
