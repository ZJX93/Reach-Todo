package com.zjx93.reach.util

import com.zjx93.reach.data.model.LunarInfo
import java.time.LocalDate
import kotlin.math.ceil
import kotlin.math.floor

// ============================================================
// 离线农历计算（不依赖后端 /api/lunar）
// 数据表 lunarTerms 与后端 apihz、Web 端同口径（1900-2100）。
// 移植自广泛使用的 carbon / jjonline/calendar.js 算法。
// ============================================================

private const val MIN_YEAR = 1900
private const val MAX_YEAR = 2100

// 1900-2100 农历数据（每年来源：位0-3=闰月月份(0=无)，位16=闰月大小(1=30天)，位4-15=12个正常月大小(1=30天)）
private val LUNAR_TERMS = intArrayOf(
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, //1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, //1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, //1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, //1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, //1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0, //1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, //1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6, //1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, //1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, //1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, //2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, //2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, //2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, //2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, //2040-2049
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, //2050-2059
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, //2060-2069
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, //2070-2079
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, //2080-2089
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, //2090-2099
    0x0d520, // 2100
)

/** 农历日期（离线计算所得）。 */
private data class LunarDate(
    val year: Int,
    val month: Int,
    val day: Int,
    val isLeap: Boolean,
)

private fun leapMonth(year: Int): Int {
    if (year < MIN_YEAR || year > MAX_YEAR) return 0
    return LUNAR_TERMS[year - MIN_YEAR] and 0xf
}

private fun daysInLeapMonth(year: Int): Int {
    if (leapMonth(year) == 0) return 0
    return if (LUNAR_TERMS[year - MIN_YEAR] and 0x10000 != 0) 30 else 29
}

private fun daysInMonth(year: Int, month: Int): Int {
    return if (LUNAR_TERMS[year - MIN_YEAR] and (0x10000 shr month) == 0) 29 else 30
}

private fun daysInYear(year: Int): Int {
    var sum = 348 // 12 * 29
    var i = 0x8000
    while (i > 0x8) {
        if (LUNAR_TERMS[year - MIN_YEAR] and i != 0) sum++
        i = i shr 1
    }
    return sum + daysInLeapMonth(year)
}

/** 公历 -> 农历（基准：农历1900年正月初一 = 公历1900-01-31）。移植自 carbon.Lunar()。 */
private fun solarToLunar(y: Int, m: Int, d: Int): LunarDate {
    val base = LocalDate.of(1900, 1, 31)
    val target = LocalDate.of(y, m, d)
    var offset = (target.toEpochDay() - base.toEpochDay()).toInt()

    var ly = MIN_YEAR
    var yearDays = 365
    while (ly <= MAX_YEAR && offset > 0) {
        yearDays = daysInYear(ly)
        offset -= yearDays
        ly++
    }
    if (offset < 0) {
        offset += yearDays
        ly--
    }

    var isLeap = false
    var lm = 1
    val leap = leapMonth(ly)
    var monthDays = 30
    while (lm <= 12) {
        if (leap > 0 && lm == leap + 1 && !isLeap) {
            lm-- // 抵消循环末尾的 ++，使本轮处理闰月
            isLeap = true
            monthDays = daysInLeapMonth(ly)
        } else {
            monthDays = daysInMonth(ly, lm)
        }
        offset -= monthDays
        if (isLeap && lm == leap + 1) isLeap = false
        if (offset <= 0) break
        lm++
    }
    if (offset == 0 && leap > 0 && lm == leap + 1) {
        if (isLeap) isLeap = false else { isLeap = true; lm-- }
    }
    if (offset < 0) {
        offset += monthDays
        lm--
    }
    val ld = offset + 1
    return LunarDate(ly, lm, ld, isLeap)
}

// ---------- 干支 / 生肖 / 中文数字 ----------

private val GAN = arrayOf("甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸")
private val ZHI = arrayOf("子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥")

/** 由年干支推导年生肖（apihz 的 DAYSHENGXIAO 是日生肖，年生肖需从年干支地支对应）。 */
private val GANZHI_ZODIAC = mapOf(
    "子" to "鼠", "丑" to "牛", "寅" to "虎", "卯" to "兔",
    "辰" to "龙", "巳" to "蛇", "午" to "马", "未" to "羊",
    "申" to "猴", "酉" to "鸡", "戌" to "狗", "亥" to "猪",
)

private fun ganzhiOfYear(ly: Int): String {
    val tg = GAN[(ly - 4) % 10]
    val dz = ZHI[(ly - 4) % 12]
    return tg + dz
}

private fun zodiacOfYear(ly: Int): String {
    val dz = ZHI[(ly - 4) % 12]
    return GANZHI_ZODIAC[dz] ?: ""
}

private val CN_DIGITS = arrayOf("〇", "一", "二", "三", "四", "五", "六", "七", "八", "九")

private fun toChineseYear(y: Int): String =
    y.toString().map { CN_DIGITS[it - '0'] }.joinToString("")

private val LUNAR_MONTHS = arrayOf(
    "正月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "腊月",
)

private fun lunarMonthName(month: Int, isLeap: Boolean): String {
    val base = LUNAR_MONTHS[month - 1]
    return if (isLeap) "闰$base" else base
}

private val LUNAR_DAYS = arrayOf(
    "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
    "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
    "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
)

private fun lunarDayName(day: Int): String = LUNAR_DAYS[day - 1]

// ---------- 24 节气（太阳黄经算法，无需外部表） ----------

private val TERM_NAMES = arrayOf(
    "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋",
    "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒",
    "大寒", "立春", "雨水", "惊蛰",
)

private fun julianDay(date: LocalDate): Double = date.toEpochDay().toDouble() + 2440587.5

/** 低精度太阳黄经（度），误差约 ±0.01°，足够判断节气落在哪一天。 */
private fun sunLongitude(jd: Double): Double {
    val n = jd - 2451545.0
    val l = 280.460 + 0.9856474 * n
    val g = Math.toRadians(357.528 + 0.9856003 * n)
    var lambda = l + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)
    lambda %= 360.0
    if (lambda < 0) lambda += 360.0
    return lambda
}

/** 该公历日是否为节气，是则返回节气名（如"立秋"）。 */
private fun solarTerm(y: Int, m: Int, d: Int): String? {
    val today = LocalDate.of(y, m, d)
    val yesterday = today.minusDays(1)
    val lamToday = sunLongitude(julianDay(today) + 0.5)
    val lamYest = sunLongitude(julianDay(yesterday) + 0.5)
    val kToday = (((floor(lamToday / 15.0).toInt()) % 24) + 24) % 24
    val kYest = (((floor(lamYest / 15.0).toInt()) % 24) + 24) % 24
    return if (kToday != kYest) TERM_NAMES[kToday] else null
}

// ---------- 星座 ----------

private val XINGZUO = arrayOf(
    "摩羯", "水瓶", "双鱼", "白羊", "金牛", "双子",
    "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手",
)

private fun xingzuo(m: Int, d: Int): String {
    val switchDay = intArrayOf(20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22)
    val idx = if (d < switchDay[m - 1]) m - 1 else m
    return XINGZUO[idx % 12]
}

// ---------- 月相（四相近似） ----------

private fun yuexiang(ld: Int): String? = when (ld) {
    1 -> "新月"
    7, 8 -> "上弦月"
    15, 16 -> "满月"
    22, 23 -> "下弦月"
    else -> null
}

// ---------- 节日 ----------

private fun festival(y: Int, m: Int, d: Int, lunar: LunarDate): String? {
    val list = mutableListOf<String>()
    when (Pair(m, d)) {
        Pair(1, 1) -> list.add("元旦")
        Pair(2, 14) -> list.add("情人节")
        Pair(3, 8) -> list.add("妇女节")
        Pair(3, 12) -> list.add("植树节")
        Pair(4, 1) -> list.add("愚人节")
        Pair(5, 1) -> list.add("劳动节")
        Pair(5, 4) -> list.add("青年节")
        Pair(6, 1) -> list.add("儿童节")
        Pair(7, 1) -> list.add("建党节")
        Pair(8, 1) -> list.add("建军节")
        Pair(9, 10) -> list.add("教师节")
        Pair(10, 1) -> list.add("国庆节")
        Pair(12, 24) -> list.add("平安夜")
        Pair(12, 25) -> list.add("圣诞节")
    }
    if (!lunar.isLeap) {
        when {
            lunar.month == 1 && lunar.day == 1 -> list.add("春节")
            lunar.month == 1 && lunar.day == 15 -> list.add("元宵")
            lunar.month == 2 && lunar.day == 2 -> list.add("龙抬头")
            lunar.month == 5 && lunar.day == 5 -> list.add("端午")
            lunar.month == 7 && lunar.day == 7 -> list.add("七夕")
            lunar.month == 7 && lunar.day == 15 -> list.add("中元")
            lunar.month == 8 && lunar.day == 15 -> list.add("中秋")
            lunar.month == 9 && lunar.day == 9 -> list.add("重阳")
            lunar.month == 12 && lunar.day == 8 -> list.add("腊八")
            lunar.month == 12 && (lunar.day == 23 || lunar.day == 24) -> list.add("小年")
        }
    }
    return if (list.isEmpty()) null else list.joinToString(" ")
}

/**
 * 离线计算某公历日期的农历信息，返回可直接喂给现有 UI 的 LunarInfo。
 * 覆盖：农历年月日/闰月、生肖、干支年、节气、星座、月相、本年第X天第X周、节日。
 * 宜忌/神位/物候等黄历内容需联网（后端 /api/lunar）补齐，离线时留空。
 */
fun computeLunar(date: String): LunarInfo {
    val (y, m, d) = date.split("-").map { it.toInt() }
    val ld = solarToLunar(y, m, d)
    return LunarInfo(
        nyue = lunarMonthName(ld.month, ld.isLeap),
        nri = lunarDayName(ld.day),
        jieqi = solarTerm(y, m, d),
        jieqiDays = if (solarTerm(y, m, d) != null) "1" else null,
        jieri = festival(y, m, d, ld),
        nnian = toChineseYear(ld.year),
        yearGanzhi = ganzhiOfYear(ld.year),
        shengxiao = zodiacOfYear(ld.year),
        xingzuo = xingzuo(m, d),
        yuexiang = yuexiang(ld.day),
        daysInYear = dayOfYear(date).toString(),
        weekOfYear = weekOfYear(date).toString(),
    )
}

// ============================================================
// 以下为原有格式化函数（保留，基于 LunarInfo 字段渲染 UI）
// ============================================================

/** 由 apihz 原始字段算出给日历展示用的农历文字（节日 + 农历 + 节气）。 */
fun lunarLabel(info: LunarInfo?): String? {
    if (info == null) return null
    val nri = info.nri ?: return null
    val base = if (nri == "初一") (info.nyue ?: nri) else nri
    val term = if (info.jieqiDays == "1") info.jieqi?.takeIf { it.isNotBlank() } else null
    val festival = info.jieri?.takeIf { it.isNotBlank() }
    return listOfNotNull(festival, base, term).joinToString(" ")
}

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
