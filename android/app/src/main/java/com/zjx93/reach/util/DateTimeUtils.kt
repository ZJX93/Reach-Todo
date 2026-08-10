package com.zjx93.reach.util

import java.time.*
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.WeekFields
import java.util.*

private val YMD = DateTimeFormatter.ofPattern("yyyy-MM-dd")

fun LocalDate.toYmd(): String = format(YMD)

/** 按指定时区（IANA，空=系统）返回今天的 YYYY-MM-DD。 */
fun todayYmd(tz: String?): String {
    val zdt = if (!tz.isNullOrBlank()) {
        try { ZonedDateTime.now(ZoneId.of(tz)) } catch (_: Exception) { ZonedDateTime.now() }
    } else {
        ZonedDateTime.now()
    }
    return zdt.toLocalDate().format(YMD)
}

fun nowHM(tz: String?): String {
    val zdt = if (!tz.isNullOrBlank()) {
        try { ZonedDateTime.now(ZoneId.of(tz)) } catch (_: Exception) { ZonedDateTime.now() }
    } else {
        ZonedDateTime.now()
    }
    return String.format(Locale.US, "%02d:%02d", zdt.hour, zdt.minute)
}

/** 构建 6 周(42 格)月历网格；weekStartSunday=true 时周日为首列。 */
fun buildMonthGrid(year: Int, month: Int, weekStartSunday: Boolean): List<LocalDate?> {
    val first = LocalDate.of(year, month, 1)
    val lead = if (weekStartSunday) {
        (first.dayOfWeek.value % 7)
    } else {
        ((first.dayOfWeek.value + 6) % 7)
    }
    val gridStart = first.minusDays(lead.toLong())
    return (0 until 42).map { gridStart.plusDays(it.toLong()) }
}

fun weekdayHeader(weekStartSunday: Boolean): List<String> {
    val base = listOf("一", "二", "三", "四", "五", "六", "日")
    return if (weekStartSunday) listOf("日") + base.dropLast(1) else base
}

private val WEEK_CN = listOf("一", "二", "三", "四", "五", "六", "日")

fun prettyDate(ds: String): String {
    val d = runCatching { LocalDate.parse(ds, YMD) }.getOrNull() ?: return ds
    val dow = WEEK_CN[(d.dayOfWeek.value - 1 + 7) % 7]
    return "${d.monthValue}月${d.dayOfMonth}日 周$dow"
}

/** 相对今天的友好描述。 */
fun daysFromToday(ds: String, tz: String?): String {
    val target = runCatching { LocalDate.parse(ds, YMD) }.getOrNull() ?: return ""
    val today = runCatching { LocalDate.parse(todayYmd(tz), YMD) }.getOrNull() ?: return ""
    val diff = ChronoUnit.DAYS.between(today, target).toInt()
    return when {
        diff == 0 -> "今天"
        diff > 0 -> "$diff 天后"
        else -> "${-diff} 天前"
    }
}

fun currentYearMonth(tz: String?): Pair<Int, Int> {
    val d = runCatching { LocalDate.parse(todayYmd(tz), YMD) }.getOrNull() ?: LocalDate.now()
    return d.year to d.monthValue
}

fun weekFields(weekStartSunday: Boolean): WeekFields =
    if (weekStartSunday) WeekFields.of(Locale.US) else WeekFields.ISO
