package com.zjx93.reach.ui.main

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.HolidayInfo
import com.zjx93.reach.data.model.LunarInfo
import com.zjx93.reach.data.model.RecordOut
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.lunarLabel
import com.zjx93.reach.util.prettyDate
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
        scope.launch { repo.lunar(date).onSuccess { lunar = it } }
        scope.launch { repo.holidays(date.substring(0, 4).toInt()).onSuccess { holiday = it[date] } }
        scope.launch { repo.records().onSuccess { records = it.filter { r -> r.recordDate == date } } }
        scope.launch { repo.tasks(null).onSuccess { dueTasks = it.filter { t -> t.dueDate == date } } }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text(prettyDate(date)) }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "返回") } }) },
        floatingActionButton = { FloatingActionButton(onClick = { nav.navigate(Routes.RECORD_EDIT) }) { Icon(Icons.Filled.Add, contentDescription = "新建记录") } },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            lunarLabel(lunar)?.let { Text(it, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary) }
            holiday?.name?.let { Text(if (holiday!!.isOffDay) "🎉 $it（放假）" else "$it（补班）", style = MaterialTheme.typography.bodyMedium) }

            Spacer(Modifier.height(16.dp))
            Text("记录（${records.size}）", style = MaterialTheme.typography.titleSmall)
            if (records.isEmpty()) Text("无", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            records.forEach { r ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { nav.navigate("${Routes.RECORD_EDIT}?id=${r.id}") }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(r.title.ifBlank { "(无标题)" }, style = MaterialTheme.typography.titleMedium)
                        r.content?.let { Text(it, maxLines = 2, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline) }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            Text("到期任务（${dueTasks.size}）", style = MaterialTheme.typography.titleSmall)
            if (dueTasks.isEmpty()) Text("无", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            dueTasks.forEach { t ->
                Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { nav.navigate("${Routes.TASK_EDIT}?id=${t.id}") }, shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Text(t.title, modifier = Modifier.padding(12.dp), style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}
