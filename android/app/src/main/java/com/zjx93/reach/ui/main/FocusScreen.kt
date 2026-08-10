package com.zjx93.reach.ui.main

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.viewmodel.FocusViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusScreen(nav: NavHostController) {
    val vm: FocusViewModel = viewModel()
    val state by vm.state.collectAsState()
    val settings by UserPrefs.settingsFlow.collectAsState(initial = UserPrefs.AppSettings())
    val ctx = LocalContext.current

    val defaultMinutes = settings.focusMinutes.coerceIn(1, 720)
    var remaining by remember { mutableStateOf(defaultMinutes * 60) }
    var running by remember { mutableStateOf(false) }

    fun reset() {
        running = false
        remaining = defaultMinutes * 60
    }

    LaunchedEffect(running) {
        if (!running) return@LaunchedEffect
        while (remaining > 0) {
            delay(1000)
            remaining--
        }
        running = false
        if (remaining == 0) {
            vm.log(defaultMinutes) { Toast.makeText(ctx, "专注完成，已记录 ${defaultMinutes} 分钟", Toast.LENGTH_SHORT).show() }
        }
    }

    // 默认时长变化时若未开始则同步
    LaunchedEffect(defaultMinutes) { if (!running) remaining = defaultMinutes * 60 }

    val mm = remaining / 60
    val ss = remaining % 60

    Scaffold(topBar = { TopAppBar(title = { Text("专注") }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(Modifier.height(24.dp))
            Text(String.format(java.util.Locale.US, "%02d:%02d", mm, ss), fontSize = 64.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Text("默认 ${defaultMinutes} 分钟（在「设置」中调整）", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(onClick = { running = !running }, modifier = Modifier.height(48.dp)) {
                    Icon(if (running) Icons.Filled.Stop else Icons.Filled.PlayArrow, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text(if (running) "暂停" else "开始")
                }
                OutlinedButton(onClick = { reset() }, modifier = Modifier.height(48.dp)) {
                    Icon(Icons.Filled.Refresh, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("重置")
                }
            }

            Spacer(Modifier.height(24.dp))
            Text("专注历史", style = MaterialTheme.typography.titleMedium, modifier = Modifier.align(Alignment.Start))
            Spacer(Modifier.height(8.dp))
            if (state.loading) {
                CircularProgressIndicator()
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    items(state.sessions, key = { it.id }) { s ->
                        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${s.minutes} 分钟", style = MaterialTheme.typography.titleMedium)
                                Spacer(Modifier.width(12.dp))
                                Text(s.startedAt ?: "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.outline)
                            }
                        }
                    }
                }
            }
        }
    }
}
