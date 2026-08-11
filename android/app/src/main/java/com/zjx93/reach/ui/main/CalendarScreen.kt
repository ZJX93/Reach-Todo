package com.zjx93.reach.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.data.model.CalendarDay
import com.zjx93.reach.data.model.HolidayInfo
import com.zjx93.reach.data.model.LunarInfo
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.buildMonthGrid
import com.zjx93.reach.util.computeLunar
import com.zjx93.reach.util.currentYearMonth
import com.zjx93.reach.util.todayYmd
import com.zjx93.reach.util.weekdayHeader
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate

// 记录/任务小点配色，与 web/src/pages/recordMeta.js、CalendarGrid.jsx 保持一致
private val DIARY_COLOR = Color(0xFF14B8A6)   // 个人日记
private val WORKLOG_COLOR = Color(0xFF2563EB) // 工作日志
private val NOTE_COLOR = Color(0xFFF59E0B)    // 读书笔记
private val TASK_COLOR = Color(0xFF94A3B8)    // 任务（灰）

/** 给月历格子用的短农历文字：优先节日/节气，其次农历日（初一显示月份）。 */
private fun cellLunar(info: LunarInfo?): String? {
    if (info == null) return null
    val festival = info.jieri?.takeIf { it.isNotBlank() }
    val term = if (info.jieqiDays == "1") info.jieqi?.takeIf { it.isNotBlank() } else null
    if (festival != null) return festival
    if (term != null) return term
    val nri = info.nri ?: return null
    return if (nri == "初一") (info.nyue ?: nri) else nri
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(nav: NavHostController) {
    val repo = remember { ReachRepository() }
    val scope = rememberCoroutineScope()
    val settings by UserPrefs.settingsFlow.collectAsState(initial = UserPrefs.AppSettings())

    val (iy, im) = remember { currentYearMonth(settings.timezone) }
    var year by remember { mutableStateOf(iy) }
    var month by remember { mutableStateOf(im) }
    var holidays by remember { mutableStateOf<Map<String, HolidayInfo>>(emptyMap()) }
    // 记录/任务按日聚合（与 web /records/calendar 对齐）
    var calendarDays by remember { mutableStateOf<Map<String, CalendarDay>>(emptyMap()) }
    // 农历由 computeLunar 离线计算（见 LaunchedEffect）
    var lunarMap by remember { mutableStateOf<Map<String, LunarInfo?>>(emptyMap()) }
    // 连接异常提示（避免静默失败导致用户不知道小点为何没显示）
    val snackbarHost = remember { SnackbarHostState() }

    LaunchedEffect(year) {
        scope.launch { repo.holidays(year).onSuccess { holidays = it }.onFailure { } }
    }

    LaunchedEffect(year, month) {
        // 1) 记录/任务聚合（仍走后端，离线时降级为空）
        launch {
            repo.recordsCalendar(year, month).onSuccess { list ->
                calendarDays = list.associateBy { it.date }
            }.onFailure { err ->
                // 仅当月历上没有小点时才提示，避免每次切换都刷屏
                if (calendarDays.isEmpty()) {
                    snackbarHost.showSnackbar("未连接服务器，记录小点暂不显示：${err.message}")
                }
            }
        }
        // 2) 农历/节气/节日：离线计算，不依赖后端 /api/lunar
        val dates = buildMonthGrid(year, month, settings.weekStart != "mon")
            .mapNotNull { it?.toString() }
        val result = mutableMapOf<String, LunarInfo?>()
        for (ds in dates) result[ds] = computeLunar(ds)
        lunarMap = result
    }

    val today = todayYmd(settings.timezone)
    val weekStartSunday = settings.weekStart != "mon"
    val grid = buildMonthGrid(year, month, weekStartSunday)
    val header = weekdayHeader(weekStartSunday)
    val weeks = grid.chunked(7)

    Scaffold(
        topBar = { TopAppBar(title = { Text("日历") }) },
        snackbarHost = { SnackbarHost(snackbarHost) },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { if (month == 1) { month = 12; year-- } else month-- }) { Icon(Icons.Filled.ChevronLeft, contentDescription = "上月") }
                Text("${year}年${month}月", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 8.dp))
                IconButton(onClick = { if (month == 12) { month = 1; year++ } else month++ }) { Icon(Icons.Filled.ChevronRight, contentDescription = "下月") }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { year = iy; month = im }) { Text("今天") }
            }

            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                header.forEach { w ->
                    Text(w, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                }
            }

            weeks.forEach { week ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    week.forEach { d ->
                        val ds = d?.toString()
                        val inMonth = d?.monthValue == month
                        val hol = ds?.let { holidays[it] }
                        val cal = ds?.let { calendarDays[it] }
                        val lun = ds?.let { lunarMap[it] }
                        val isToday = ds == today
                        val isWeekend = d?.dayOfWeek == DayOfWeek.SATURDAY || d?.dayOfWeek == DayOfWeek.SUNDAY
                        val dim = if (!inMonth) 0.4f else 1f

                        val cellBg = when {
                            hol != null && hol.isOffDay -> MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.20f)
                            hol != null -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.18f)
                            else -> Color.Transparent
                        }
                        val dayColor = when {
                            isToday -> MaterialTheme.colorScheme.primary
                            isWeekend -> MaterialTheme.colorScheme.error
                            else -> MaterialTheme.colorScheme.onSurface
                        }

                        Box(
                            modifier = Modifier.weight(1f).aspectRatio(1f)
                                .padding(2.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(cellBg)
                                .clickable { d?.let { nav.navigate("${Routes.DAY_DETAIL}?date=${it}") } },
                            contentAlignment = Alignment.TopCenter,
                        ) {
                            // 休 / 班 角标
                            if (hol != null) {
                                Box(
                                    modifier = Modifier.align(Alignment.TopEnd).padding(2.dp)
                                        .background(
                                            if (hol.isOffDay) Color(0xFFEF4444) else Color(0xFF2563EB),
                                            RoundedCornerShape(3.dp),
                                        )
                                        .padding(horizontal = 3.dp, vertical = 1.dp),
                                ) {
                                    Text(if (hol.isOffDay) "休" else "班", fontSize = 8.sp, color = Color.White)
                                }
                            }

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.fillMaxSize().padding(top = 4.dp),
                            ) {
                                Text("${d?.dayOfMonth ?: ""}", fontSize = 15.sp, color = dayColor.copy(alpha = dim))
                                cellLunar(lun)?.let {
                                    Text(it, fontSize = 8.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dim), maxLines = 1)
                                }
                                Spacer(Modifier.weight(1f))
                                val dots = listOfNotNull(
                                    if ((cal?.diary ?: 0) > 0) DIARY_COLOR else null,
                                    if ((cal?.worklog ?: 0) > 0) WORKLOG_COLOR else null,
                                    if ((cal?.note ?: 0) > 0) NOTE_COLOR else null,
                                    if ((cal?.tasks ?: 0) > 0) TASK_COLOR else null,
                                )
                                if (dots.isNotEmpty()) {
                                    Row(
                                        horizontalArrangement = Arrangement.Center,
                                        modifier = Modifier.padding(bottom = 3.dp),
                                    ) {
                                        dots.forEach { c ->
                                            Box(Modifier.padding(horizontal = 1.dp).size(4.dp).background(c.copy(alpha = dim), CircleShape))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
