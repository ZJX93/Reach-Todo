package com.zjx93.reach.ui.main

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
import com.zjx93.reach.data.model.HolidayInfo
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.buildMonthGrid
import com.zjx93.reach.util.currentYearMonth
import com.zjx93.reach.util.todayYmd
import com.zjx93.reach.util.weekdayHeader
import kotlinx.coroutines.launch
import java.time.LocalDate

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

    LaunchedEffect(year) {
        scope.launch { repo.holidays(year).onSuccess { holidays = it }.onFailure { } }
    }

    val today = todayYmd(settings.timezone)
    val weekStartSunday = settings.weekStart != "mon"
    val grid = buildMonthGrid(year, month, weekStartSunday)
    val header = weekdayHeader(weekStartSunday)
    val weeks = grid.chunked(7)

    Scaffold(topBar = { TopAppBar(title = { Text("日历") }) }) { padding ->
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
                        val ds = d?.let { LocalDate.of(it.year, it.monthValue, it.dayOfMonth).toString() }
                        val hol = ds?.let { holidays[it] }
                        Box(
                            modifier = Modifier.weight(1f).aspectRatio(1f)
                                .padding(2.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { d?.let { nav.navigate("${Routes.DAY_DETAIL}?date=${it.year}-${String.format(java.util.Locale.US, "%02d", it.monthValue)}-${String.format(java.util.Locale.US, "%02d", it.dayOfMonth)}") } },
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("${d?.dayOfMonth ?: ""}", fontSize = 15.sp, color = if (ds == today) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                hol?.name?.let {
                                    Text(it.take(2), fontSize = 9.sp, color = if (hol.isOffDay) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
