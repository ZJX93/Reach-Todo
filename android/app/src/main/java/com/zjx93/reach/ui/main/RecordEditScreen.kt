package com.zjx93.reach.ui.main

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.RecordCreate
import com.zjx93.reach.data.model.RecordOut
import com.zjx93.reach.data.model.RecordUpdate
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.util.nowHM
import com.zjx93.reach.util.todayYmd
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val YMD = DateTimeFormatter.ofPattern("yyyy-MM-dd")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecordEditScreen(nav: NavHostController, id: Int?) {
    val repo = remember { ReachRepository() }
    val scope = rememberCoroutineScope()

    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var existing by remember { mutableStateOf<RecordOut?>(null) }

    var type by remember { mutableStateOf("diary") }
    var title by remember { mutableStateOf("") }
    var content by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }
    var bookTitle by remember { mutableStateOf("") }
    var bookAuthor by remember { mutableStateOf("") }
    var project by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(todayYmd("")) }
    var time by remember { mutableStateOf(nowHM("")) }
    var saving by remember { mutableStateOf(false) }

    val datePickerState = rememberDatePickerState()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (id != null) {
            repo.records().onSuccess { list ->
                list.find { it.id == id }?.let { r ->
                    existing = r
                    type = r.type; title = r.title; content = r.content ?: ""
                    mood = r.mood ?: ""; tags = r.tags ?: ""
                    bookTitle = r.bookTitle ?: ""; bookAuthor = r.bookAuthor ?: ""; project = r.project ?: ""
                    date = r.recordDate; time = r.recordTime ?: ""
                }
            }.onFailure { error = it.message }
        }
        loading = false
    }

    fun save() {
        saving = true
        val body: Any = if (existing == null) {
            RecordCreate(
                type = type, title = title.ifBlank { null }, content = content.ifBlank { null },
                mood = mood.ifBlank { null }, tags = tags.ifBlank { null },
                bookTitle = bookTitle.ifBlank { null }, bookAuthor = bookAuthor.ifBlank { null },
                project = project.ifBlank { null }, recordDate = date, recordTime = time.ifBlank { null },
            )
        } else {
            RecordUpdate(
                type = type, title = title.ifBlank { null }, content = content.ifBlank { null },
                mood = mood.ifBlank { null }, tags = tags.ifBlank { null },
                bookTitle = bookTitle.ifBlank { null }, bookAuthor = bookAuthor.ifBlank { null },
                project = project.ifBlank { null }, recordDate = date, recordTime = time.ifBlank { null },
            )
        }
        scope.launch {
            val res = if (existing == null) repo.createRecord(body as RecordCreate)
            else repo.updateRecord(existing!!.id, body as RecordUpdate)
            res.onSuccess { saving = false; nav.popBackStack() }.onFailure { saving = false; error = it.message }
        }
    }

    fun remove() {
        existing?.let { scope.launch { repo.deleteRecord(it.id).onSuccess { nav.popBackStack() }.onFailure { error = it.message } } }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "新建记录" else "编辑记录") },
                navigationIcon = { IconButton(onClick = { nav.popBackStack() }) { Icon(Icons.Filled.ArrowBack, contentDescription = "返回") } },
                actions = {
                    if (existing != null) IconButton(onClick = { remove() }) { Icon(Icons.Filled.Delete, contentDescription = "删除") }
                    TextButton(onClick = { save() }, enabled = !saving) { Text("保存") }
                },
            )
        },
    ) { padding ->
        if (loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = androidx.compose.ui.Alignment.Center) { CircularProgressIndicator() }
        } else {
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("类型", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(listOf("diary" to "日记", "worklog" to "工作日志", "note" to "笔记")) { (k, label) ->
                        FilterChip(selected = type == k, onClick = { type = k }, label = { Text(label) })
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
                OutlinedTextField(title, { title = it }, label = { Text("标题") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(content, { content = it }, label = { Text("内容") }, modifier = Modifier.fillMaxWidth().height(140.dp), maxLines = 8)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.weight(1f)) { Text(date) }
                    OutlinedTextField(time, { v -> time = v.takeIf { it.matches(Regex("^([01]\\d|2[0-3]):[0-5]\\d$")) } ?: time }, label = { Text("时间") }, singleLine = true, modifier = Modifier.weight(1f), placeholder = { Text("HH:MM") })
                }
                if (type == "diary") {
                    OutlinedTextField(bookTitle, { bookTitle = it }, label = { Text("书名（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(bookAuthor, { bookAuthor = it }, label = { Text("作者（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
                if (type == "worklog") {
                    OutlinedTextField(project, { project = it }, label = { Text("项目（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
                OutlinedTextField(mood, { mood = it }, label = { Text("心情/标签（可选）") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(tags, { tags = it }, label = { Text("标签（可选，逗号分隔）") }, singleLine = true, modifier = Modifier.fillMaxWidth())

                if (showDatePicker) {
                    DatePickerDialog(
                        onDismissRequest = { showDatePicker = false },
                        confirmButton = {
                            TextButton(onClick = {
                                datePickerState.selectedDateMillis?.let { ms -> date = Instant.ofEpochMilli(ms).atZone(ZoneId.of("UTC")).toLocalDate().format(YMD) }
                                showDatePicker = false
                            }) { Text("确定") }
                        },
                    ) { DatePicker(state = datePickerState) }
                }
            }
        }
    }
}
