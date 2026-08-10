package com.zjx93.reach.ui.main

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.viewmodel.DashboardViewModel
import java.time.LocalTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(nav: NavHostController) {
    val vm: DashboardViewModel = viewModel()
    val state by vm.state.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("看板") }) }) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text("你好，${state.user?.username ?: "朋友"} 👋", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    val now = LocalTime.now().hour
                    Text(if (now < 12) "新的一天，开始行动" else if (now < 18) "下午好，保持节奏" else "晚上好，复盘一下今天", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatCard("待办", "${state.summary?.totalTodo ?: 0}", Modifier.weight(1f))
                        StatCard("连续", "${state.summary?.streak ?: 0}天", Modifier.weight(1f))
                        StatCard("今日专注", "${state.summary?.focusMinutesToday ?: 0}'", Modifier.weight(1f))
                        StatCard("本周完成", "${state.summary?.weekCompleted ?: 0}", Modifier.weight(1f))
                    }
                }

                item {
                    Button(onClick = { nav.navigate(Routes.FOCUS) }, modifier = Modifier.fillMaxWidth().height(48.dp)) {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(6.dp))
                        Text("开始专注")
                    }
                }

                item { Text("今日待办", style = MaterialTheme.typography.titleMedium) }
                if (state.tasks.isEmpty()) {
                    item { Text("暂无待办任务", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline) }
                } else {
                    items(state.tasks.take(6), key = { it.id }) { task -> MiniTaskRow(task, vm) }
                }

                item { Text("目标进展", style = MaterialTheme.typography.titleMedium) }
                items(state.goals.take(5), key = { it.id }) { g ->
                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(g.title, style = MaterialTheme.typography.titleSmall)
                            Spacer(Modifier.height(6.dp))
                            LinearProgressIndicator(g.progress / 100f, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)))
                            Text("${g.done}/${g.total}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
        }
    }
}

@Composable
private fun MiniTaskRow(task: TaskOut, vm: DashboardViewModel) {
    val done = task.status == "done"
    Row(modifier = Modifier.fillMaxWidth().clickable { vm.toggleDone(task) }.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = done, onCheckedChange = { vm.toggleDone(task) })
        Spacer(Modifier.width(8.dp))
        Text(task.title, style = MaterialTheme.typography.bodyLarge, color = if (done) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface)
    }
}
