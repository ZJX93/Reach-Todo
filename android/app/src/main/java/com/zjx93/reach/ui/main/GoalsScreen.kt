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
import com.zjx93.reach.data.model.GoalBoardItem
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.prettyDate
import com.zjx93.reach.viewmodel.GoalsViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalsScreen(nav: NavHostController) {
    val vm: GoalsViewModel = viewModel()
    val state by vm.state.collectAsState()

    Scaffold(
        topBar = { TopAppBar(title = { Text("目标") }) },
        floatingActionButton = { FloatingActionButton(onClick = { nav.navigate(Routes.GOAL_EDIT) }) { Icon(Icons.Filled.Add, contentDescription = "新建") } },
    ) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else if (state.goals.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("还没有目标，点右下角新建一个", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(state.goals, key = { it.id }) { goal -> GoalCard(goal, vm, nav) }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GoalCard(goal: GoalBoardItem, vm: GoalsViewModel, nav: NavHostController) {
    val done = goal.status == "done"
    Card(
        modifier = Modifier.fillMaxWidth().clickable { nav.navigate("${Routes.GOAL_EDIT}?id=${goal.id}") },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = done, onCheckedChange = { vm.toggleDone(goal) })
                Column(modifier = Modifier.weight(1f)) {
                    Text(goal.title, style = MaterialTheme.typography.titleMedium, color = if (done) MaterialTheme.colorScheme.outline else MaterialTheme.colorScheme.onSurface)
                    goal.deadline?.let { Text("截止 ${prettyDate(it)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline) }
                }
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(progress = goal.progress / 100f, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)))
            Spacer(Modifier.height(4.dp))
            Text("${goal.done}/${goal.total} 已完成${if (goal.overdue > 0) " · 逾期 ${goal.overdue}" else ""}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
        }
    }
}
