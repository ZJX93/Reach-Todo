package com.zjx93.reach.ui.main

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.zjx93.reach.BuildConfig
import com.zjx93.reach.data.local.UserPrefs
import com.zjx93.reach.util.AppUpdater
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(nav: NavHostController) {
    val scope = rememberCoroutineScope()
    val serverUrl by UserPrefs.serverUrlFlow.collectAsState(initial = "http://192.168.9.3:8000")
    val settings by UserPrefs.settingsFlow.collectAsState(initial = UserPrefs.AppSettings())

    var urlText by remember(serverUrl) { mutableStateOf(serverUrl) }
    var showTz by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopAppBar(title = { Text("设置") }, navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "返回") } }) }) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Section(title = "服务器") {
                OutlinedTextField(urlText, { urlText = it }, label = { Text("后端地址") }, singleLine = true, modifier = Modifier.fillMaxWidth(), placeholder = { Text("http://192.168.9.3:8000") })
                Spacer(Modifier.height(8.dp))
                Button(onClick = { scope.launch { UserPrefs.setServerUrl(urlText.trim().trimEnd('/')) } }, modifier = Modifier.fillMaxWidth()) { Text("保存服务器地址") }
                Text("手机需能访问该地址（同一局域网或公网），原生请求不受 CORS 限制。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }

            UpdateSection()

            Section(title = "专注") {
                Text("默认专注时长", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf(15, 25, 45, 60)) { m ->
                        FilterChip(selected = settings.focusMinutes == m, onClick = { scope.launch { UserPrefs.setFocusMinutes(m) } }, label = { Text("${m} 分钟") })
                    }
                }
            }

            Section(title = "日历") {
                Text("每周起始", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("sun" to "周日", "mon" to "周一")) { (k, label) ->
                        FilterChip(selected = settings.weekStart == k, onClick = { scope.launch { UserPrefs.setWeekStart(k) } }, label = { Text(label) })
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text("时区", style = MaterialTheme.typography.labelMedium)
                val tz = if (settings.timezone.isBlank()) TimeZone.getDefault().id else settings.timezone
                OutlinedButton(onClick = { showTz = true }, modifier = Modifier.fillMaxWidth()) { Text(tz) }
                TzClock(tz)
            }

            Section(title = "农历数据") {
                Text("数据源", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("backend" to "后端代理", "custom" to "自定义接口")) { (k, label) ->
                        FilterChip(selected = settings.lunarSource == k, onClick = { scope.launch { UserPrefs.setLunarSource(k) } }, label = { Text(label) })
                    }
                }
                if (settings.lunarSource == "custom") {
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(settings.lunarApiBase, { scope.launch { UserPrefs.setLunarApiBase(it) } }, label = { Text("农历接口地址（支持 {date}）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(settings.holidayApiBase, { scope.launch { UserPrefs.setHolidayApiBase(it) } }, label = { Text("节假日接口地址（支持 {year}）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(settings.lunarApiKey, { scope.launch { UserPrefs.setLunarApiKey(it) } }, label = { Text("接口密钥（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }

    if (showTz) {
        TimeZonePickerDialog(current = settings.timezone, onPick = { scope.launch { UserPrefs.setTimezone(it) }; showTz = false }, onDismiss = { showTz = false })
    }
}

@Composable
private fun UpdateSection() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val currentVersion = remember { BuildConfig.VERSION_NAME }

    var checking by remember { mutableStateOf(false) }
    var latest by remember { mutableStateOf<AppUpdater.ReleaseInfo?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var downloading by remember { mutableStateOf(false) }
    var progress by remember { mutableStateOf(0f) }
    var downloadId by remember { mutableStateOf(-1L) }

    fun doCheck() {
        scope.launch {
            checking = true
            error = null
            latest = null
            try {
                latest = AppUpdater.fetchLatest()
            } catch (e: Exception) {
                error = "检查失败：${e.message ?: e.javaClass.simpleName}"
            } finally {
                checking = false
            }
        }
    }

    // 轮询下载进度（下载管理器不主动回调进度）
    LaunchedEffect(downloading) {
        if (!downloading || downloadId < 0) return@LaunchedEffect
        while (downloading) {
            val p = AppUpdater.queryProgress(context, downloadId)
            if (p < 0f) { downloading = false; break }
            progress = p
            delay(400)
        }
    }

    val hasUpdate = latest != null && AppUpdater.isNewer(currentVersion, latest!!.version)

    Section(title = "更新") {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("当前版本", style = MaterialTheme.typography.labelMedium)
            Text(currentVersion, style = MaterialTheme.typography.bodyMedium)
        }
        Spacer(Modifier.height(10.dp))

        when {
            checking -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("正在检查更新…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
                }
            }
            downloading -> {
                Text("正在下载新版本… ${(progress * 100).toInt()}%", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth())
            }
            error != null -> {
                Text(error!!, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Button(onClick = { doCheck() }, modifier = Modifier.fillMaxWidth()) { Text("重试") }
            }
            hasUpdate -> {
                Text("发现新版本 v${latest!!.version}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(8.dp))
                Button(onClick = {
                    val rel = latest!!
                    if (rel.apkUrl == null) { error = "未找到 APK 下载地址"; return@Button }
                    if (!AppUpdater.canInstallUnknownSources(context)) {
                        // 引导用户开启「安装未知应用」授权
                        context.startActivity(AppUpdater.unknownSourcesIntent(context))
                        return@Button
                    }
                    downloading = true
                    progress = 0f
                    downloadId = AppUpdater.downloadAndInstall(context, rel.apkUrl)
                }, modifier = Modifier.fillMaxWidth()) {
                    Text("升级到 v${latest!!.version}")
                }
            }
            latest != null -> {
                Text("已是最新版本", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.outline)
            }
        }

        // 尚未检查过时展示「检查更新」入口
        if (!checking && latest == null && error == null && !downloading) {
            Spacer(Modifier.height(8.dp))
            Button(onClick = { doCheck() }, modifier = Modifier.fillMaxWidth()) { Text("检查更新") }
        }
    }
}

@Composable
private fun Section(title: String, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = Modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
            content()
        }
    }
}

@Composable
private fun TzClock(tzId: String) {
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) { delay(1000); now = System.currentTimeMillis() }
    }
    val fmt = remember(tzId) { SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).apply { timeZone = TimeZone.getTimeZone(tzId) } }
    Text("当前时间：${fmt.format(Date(now))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeZonePickerDialog(current: String, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val all = remember { TimeZone.getAvailableIDs().sorted() }
    var query by remember { mutableStateOf("") }
    val filtered = remember(query) { if (query.isBlank()) all else all.filter { it.contains(query, true) } }
    AlertDialog(onDismissRequest = onDismiss, confirmButton = { TextButton(onClick = onDismiss) { Text("完成") } }, title = { Text("选择时区") }, text = {
        Column {
            OutlinedTextField(query, { query = it }, label = { Text("搜索") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(8.dp))
            LazyColumn(modifier = Modifier.heightIn(max = 360.dp)) {
                items(filtered) { z ->
                    val sel = (z == current) || (current.isBlank() && z == TimeZone.getDefault().id)
                    Text(z, modifier = Modifier.fillMaxWidth().clickable { onPick(z) }.padding(10.dp), color = if (sel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    })
}
