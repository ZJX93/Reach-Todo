package com.zjx93.reach.util

import com.zjx93.reach.data.model.LunarInfo
import java.time.LocalDate
import kotlin.math.ceil

/** 由 apihz 原始字段算出给日历展示用的农历文字（节日 + 农历 + 节气）。 */
fun lunarLabel(info: LunarInfo?): String? {
    if (info == null) return null
    val nri = info.nri ?: return null
    val base = if (nri == "初一") (info.nyue ?: nri) else nri
    val term = if (info.jieqiDays == "1") info.jieqi?.takeIf { it.isNotBlank() } else null
    val festival = info.jieri?.takeIf { it.isNotBlank() }
    return listOfNotNull(festival, base, term).joinToString(" ")
}

/** 由年干支推导年生肖（apihz 的 DAYSHENGXIAO 是日生肖，年生肖需从年干支地支对应）。 */
private val GANZHI_ZODIAC = mapOf(
    "子" to "鼠", "丑" to "牛", "寅" to "虎", "卯" to "兔",
    "辰" to "龙", "巳" to "蛇", "午" to "马", "未" to "羊",
    "申" to "猴", "酉" to "鸡", "戌" to "狗", "亥" to "猪",
)

fun shengxiaoFromGanzhi(gz: String?): String? {
    if (gz.isNullOrBlank()) return null
    val last = gz.trim().last().toString()
    return GANZHI_ZODIAC[last]
}

/** 农历年月日，如 "二〇二六年六月十五"；缺失则回退到一行 lunarLabel。 */
fun lunarYmd(info: LunarInfo?): String? {
    if (info == null) return null
    val y = info.nnian ?: return lunarLabel(info)
    val m = info.nyue ?: return lunarLabel(info)
    val d = info.nri ?: return lunarLabel(info)
    return "${y}年${m}${d}"
}

/** 干支年（生肖）年，如 "丙午（马）年"。 */
fun ganzhiYearText(info: LunarInfo?): String? {
    val gz = info?.yearGanzhi ?: return null
    if (gz.isBlank()) return null
    val z = shengxiaoFromGanzhi(gz)
    return if (z != null) "${gz}（${z}）年" else "${gz}年"
}

/** 一年中的第几天（与 web/src/utils/date.js dayOfYear 一致）。 */
fun dayOfYear(ds: String): Int {
    val (y, m, d) = ds.split("-").map { it.toInt() }
    return LocalDate.of(y, m, d).dayOfYear
}

/** 一年中的第几周（周日为起点，与 web/src/utils/date.js weekOfYear 一致）。 */
fun weekOfYear(ds: String): Int {
    val (y, m, d) = ds.split("-").map { it.toInt() }
    val date = LocalDate.of(y, m, d)
    val one = LocalDate.of(y, 1, 1)
    val day = (date.toEpochDay() - one.toEpochDay()).toInt() // 距 1 月 1 日的天数（1/1=0）
    val jan1Dow = one.dayOfWeek.value % 7 // MON=1..SUN=7 → SUN=0..SAT=6，对应 JS getDay
    return ceil((day + jan1Dow + 1).toDouble() / 7.0).toInt()
}

/** "本年第X天 第X周"，优先用 apihz 返回值，缺失则用本地计算补齐。 */
fun daysWeekText(info: LunarInfo?, ds: String): String {
    val d = info?.daysInYear?.takeIf { it.isNotBlank() }?.toIntOrNull() ?: dayOfYear(ds)
    val w = info?.weekOfYear?.takeIf { it.isNotBlank() }?.toIntOrNull() ?: weekOfYear(ds)
    return "本年第${d}天 第${w}周"
}

/** 节气（仅节气当日 JIEQIDAYS=1 才显示，避免「当前节气区间」挂满半个月）。 */
fun termText(info: LunarInfo?): String? {
    if (info?.jieqiDays == "1") return info.jieqi?.takeIf { it.isNotBlank() }
    return null
}

/** 物候，取后半段，如 "寒露 初候鸿雁来宾" → "鸿雁来宾"。 */
fun wuhouShort(info: LunarInfo?): String? {
    val w = info?.wuhou ?: return null
    if (w.isBlank()) return null
    return w.split(" ").lastOrNull()?.takeIf { it.isNotBlank() } ?: w
}

/** 宜（| 分隔拆成列表）。 */
fun yiList(info: LunarInfo?): List<String> {
    return (info?.yi ?: "").split("|").map { it.trim() }.filter { it.isNotBlank() }
}

/** 忌（| 分隔拆成列表）。 */
fun jiList(info: LunarInfo?): List<String> {
    return (info?.ji ?: "").split("|").map { it.trim() }.filter { it.isNotBlank() }
}

/** 神位（喜/阳贵/阴贵/福/财），过滤空值，返回 label→value 列表。 */
fun godPositions(info: LunarInfo?): List<Pair<String, String>> {
    if (info == null) return emptyList()
    return listOf(
        "喜神位" to (info.xi ?: ""),
        "阳贵位" to (info.yanggui ?: ""),
        "阴贵位" to (info.yingui ?: ""),
        "福神位" to (info.fu ?: ""),
        "财神位" to (info.cai ?: ""),
    ).filter { it.second.isNotBlank() }
}
