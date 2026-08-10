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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.RecordOut
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.prettyDate
import com.zjx93.reach.viewmodel.RecordsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordsScreen(nav: NavHostController) {
    val vm: RecordsViewModel = viewModel()
    val state by vm.state.collectAsState()
    var filter by remember { mutableStateOf("all") }

    val typeLabel = mapOf("diary" to "日记", "worklog" to "工作日志", "note" to "笔记")

    Scaffold(
        topBar = { TopAppBar(title = { Text("记录") }) },
        floatingActionButton = { FloatingActionButton(onClick = { nav.navigate(Routes.RECORD_EDIT) }) { Icon(Icons.Filled.Add, contentDescription = "新建") } },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            Row(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                listOf("all" to "全部", "diary" to "日记", "worklog" to "工作日志", "note" to "笔记").forEach { (k, label) ->
                    FilterChip(selected = filter == k, onClick = { filter = k }, label = { Text(label) }, modifier = Modifier.padding(end = 8.dp))
                }
            }
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                val shown = state.records.filter { filter == "all" || it.type == filter }
                if (shown.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("暂无记录", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline) }
                } else {
                    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(shown, key = { it.id }) { rec -> RecordCard(rec, vm, nav, typeLabel) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RecordCard(rec: RecordOut, vm: RecordsViewModel, nav: NavHostController, typeLabel: Map<String, String>) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { nav.navigate("${Routes.RECORD_EDIT}?id=${rec.id}") },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(color = MaterialTheme.colorScheme.primary, shape = RoundedCornerShape(8.dp)) {
                    Text(typeLabel[rec.type] ?: rec.type, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimary)
                }
                Spacer(Modifier.width(8.dp))
                Text(prettyDate(rec.recordDate) + (rec.recordTime?.let { " $it" } ?: ""), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
            }
            Spacer(Modifier.height(6.dp))
            Text(rec.title.ifBlank { "(无标题)" }, style = MaterialTheme.typography.titleMedium)
            rec.content?.let { Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.outline) }
        }
    }
}
