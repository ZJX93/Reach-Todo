package com.zjx93.reach.ui.main

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.HolidayInfo
import com.zjx93.reach.data.model.LunarInfo
import com.zjx93.reach.data.model.RecordOut
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.computeLunar
import com.zjx93.reach.util.daysWeekText
import com.zjx93.reach.util.ganzhiYearText
import com.zjx93.reach.util.godPositions
import com.zjx93.reach.util.jiList
import com.zjx93.reach.util.lunarYmd
import com.zjx93.reach.util.prettyDate
import com.zjx93.reach.util.termText
import com.zjx93.reach.util.wuhouShort
import com.zjx93.reach.util.yiList
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DayDetailScreen(nav: NavHostController, date: String?) {
    if (date == null) {
        Scaffold(topBar = { TopAppBar(title = { Text("日期") }) }) { Box(Modifier.fillMaxSize().padding(it)) { Text("无效日期") } }
        return
    }
    val repo = remember { ReachRepository() }
    val scope = rememberCoroutineScope()
    var lunar by remember { mutableStateOf<LunarInfo?>(null) }
    var holiday by remember { mutableStateOf<HolidayInfo?>(null) }
    var records by remember { mutableStateOf<List<RecordOut>>(emptyList()) }
    var dueTasks by remember { mutableStateOf<List<TaskOut>>(emptyList()) }

    LaunchedEffect(date) {
        // 离线先渲染农历框架；联网后由后端 /api/lunar 补齐宜忌/神位/物候
        lunar = computeLunar(date)
        scope.launch { repo.lunar(date).onSuccess { lunar = it } }
        scope.launch { repo.holidays(date.substring(0, 4).toInt()).onSuccess { holiday = it[date] } }
        scope.launch { repo.records(date).onSuccess { records = it } }
        scope.launch { repo.tasks(null).onSuccess { dueTasks = it.filter { t -> t.dueDate == date } } }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(prettyDate(date)) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "返回") } }) },
        floatingActionButton = { FloatingActionButton(onClick = { nav.navigate(Routes.RECORD_EDIT) }) { Icon(Icons.Filled.Add, contentDescription = "新建记录") } },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp)) {

            // ===== 黄历卡片（对齐 Web DayDetail 日期卡片） =====
            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(prettyDate(date), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                    Spacer(Modifier.height(8.dp))
                    Box(modifier = Modifier.size(72.dp).clip(RoundedCornerShape(18.dp)).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                        Text(date.substring(8, 10), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.Black)
                    }
                    Spacer(Modifier.height(12.dp))
                    lunarYmd(lunar)?.let { Text(it, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface) }
                    ganzhiYearText(lunar)?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline) }
                    Text(daysWeekText(lunar, date), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)

                    // 徽章（星座 / 节气 / 节日 / 节假日）
                    val badges = buildList {
                        lunar?.xingzuo?.takeIf { it.isNotBlank() }?.let { add(Triple("星座 $it", Color(0xFFFCE7F3), Color(0xFFDB2777))) }
                        termText(lunar)?.let { add(Triple(it, Color(0xFFEFF6FF), Color(0xFF2563EB))) }
                        lunar?.jieri?.takeIf { it.isNotBlank() }?.let { add(Triple(it, Color(0xFFFFF7ED), Color(0xFFF97316))) }
                        holiday?.name?.let { nm ->
                            if (holiday!!.isOffDay) add(Triple("$nm 休", Color(0xFFFEF2F2), Color(0xFFEF4444)))
                            else add(Triple("$nm 班", Color(0xFFEFF6FF), Color(0xFF2563EB)))
                        }
                    }
                    if (badges.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.Center) {
                            for (b in badges) {
                                LunarBadge(b.first, b.second, b.third)
                                Spacer(Modifier.width(8.dp))
                            }
                        }
                    }

                    // 宜 / 忌
                    val yi = yiList(lunar)
                    val ji = jiList(lunar)
                    if (yi.isNotEmpty() || ji.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            if (yi.isNotEmpty()) YiJiRow("宜", Color(0xFF22C55E), yi)
                            if (ji.isNotEmpty()) YiJiRow("忌", Color(0xFFEF4444), ji)
                        }
                    }

                    // 月相 / 物候
                    val yuexiang = lunar?.yuexiang?.takeIf { it.isNotBlank() }
                    val wuhou = wuhouShort(lunar)
                    if (yuexiang != null || wuhou != null) {
                        Spacer(Modifier.height(10.dp))
                        Row(modifier = Modifier.horizontalScroll(rememberScrollState())) {
                            if (yuexiang != null) {
                                LunarBadge("月相 $yuexiang", Color(0xFFF3E8FF), Color(0xFF9333EA))
                                Spacer(Modifier.width(8.dp))
                            }
                            if (wuhou != null) {
                                LunarBadge("物候 $wuhou", Color(0xFFEEF2FF), Color(0xFF4F46E5))
                                Spacer(Modifier.width(8.dp))
                            }
                        }
                    }

                    // 神位（喜/阳贵/阴贵/福/财）
                    val gods = godPositions(lunar)
                    if (gods.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            for (g in gods) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text(g.first, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
                                    Text(g.second, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // ===== 待办到期 =====
            Text("待办到期（${dueTasks.size}）", style = MaterialTheme.typography.titleSmall)
            if (dueTasks.isEmpty()) Text("无", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            for (t in dueTasks) {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { nav.navigate("${Routes.TASK_EDIT}?id=${t.id}") }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Text(t.title, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(16.dp))

            // ===== 记录 =====
            Text("记录（${records.size}）", style = MaterialTheme.typography.titleSmall)
            if (records.isEmpty()) Text("无", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            for (r in records) {
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { nav.navigate("${Routes.RECORD_EDIT}?id=${r.id}") }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(r.title.ifBlank { "(无标题)" }, style = MaterialTheme.typography.titleMedium)
                        r.content?.let { Text(it, maxLines = 2, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline) }
                    }
                }
            }
        }
    }
}

@Composable
private fun LunarBadge(text: String, bg: Color, fg: Color) {
    Surface(shape = RoundedCornerShape(999.dp), color = bg) {
        Text(text, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = fg, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun YiJiRow(label: String, color: Color, items: List<String>) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Box(modifier = Modifier.size(20.dp).clip(RoundedCornerShape(4.dp)).background(color), contentAlignment = Alignment.Center) {
            Text(label, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(8.dp))
        Text(items.joinToString("，"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
    }
}
