package com.zjx93.reach.ui.main

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(nav: NavHostController) {
    val vm: DashboardViewModel = viewModel()
    val state by vm.state.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("看板") }) }) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(animationSpec = tween(420)) + slideInVertically(
                    initialOffsetY = { it / 14 },
                    animationSpec = tween(420),
                ),
            ) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Text(
                            "你好，${state.user?.username ?: "朋友"}",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Medium,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text("让每一天都有迹可循", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
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

                    item { Text("今日待办", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp)) }
                    if (state.tasks.isEmpty()) {
                        item { Text("暂无待办任务", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline) }
                    } else {
                        items(state.tasks.take(6), key = { it.id }) { task -> MiniTaskRow(task, vm) }
                    }

                    item { Text("目标进展", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp)) }
                    items(state.goals.take(5), key = { it.id }) { g ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        ) {
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
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
            Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun MiniTaskRow(task: TaskOut, vm: DashboardViewModel) {
    val done = task.status == "done"
    Row(
        // 单一点击入口：整行可点，消除 Row 与内部 Checkbox 双重 clickable 的冲突
        modifier = Modifier.fillMaxWidth().clickable { vm.toggleDone(task) }.padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ZenCheckbox(done)
        Spacer(Modifier.width(10.dp))
        Text(
            task.title,
            style = MaterialTheme.typography.bodyLarge,
            color = if (done) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            textDecoration = if (done) TextDecoration.LineThrough else null,
        )
    }
}

@Composable
private fun ZenCheckbox(checked: Boolean) {
    val stroke by animateColorAsState(
        if (checked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
        label = "zenCheckColor",
    )
    val size by animateDpAsState(if (checked) 22.dp else 20.dp, label = "zenCheckSize")
    Box(
        // 纯展示，不挂载 clickable（点击由外层 Row 统一处理）
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(if (checked) stroke else Color.Transparent)
            .border(1.5.dp, stroke, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (checked) {
            Icon(Icons.Filled.Check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(14.dp))
        }
    }
}
