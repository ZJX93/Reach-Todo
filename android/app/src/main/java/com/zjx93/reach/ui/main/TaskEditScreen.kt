package com.zjx93.reach.ui.main

import android.widget.Toast
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.model.CategoryOut
import com.zjx93.reach.data.model.TaskCreate
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.data.model.TaskUpdate
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.viewmodel.TasksViewModel
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val YMD = DateTimeFormatter.ofPattern("yyyy-MM-dd")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskEditScreen(nav: NavHostController, id: Int?) {
    val repo = remember { ReachRepository() }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current

    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var existing by remember { mutableStateOf<TaskOut?>(null) }
    var categories by remember { mutableStateOf<List<CategoryOut>>(emptyList()) }

    var title by remember { mutableStateOf("") }
    var selectedCat by remember { mutableStateOf<Int?>(null) }
    var priority by remember { mutableStateOf("normal") }
    var importance by remember { mutableStateOf("normal") }
    var recurrence by remember { mutableStateOf("none") }
    var note by remember { mutableStateOf("") }
    var dueDate by remember { mutableStateOf<String?>(null) }
    var dueTime by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    val datePickerState = rememberDatePickerState()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        launch {
            repo.categories()
                .onSuccess { cats ->
                    categories = cats
                    if (id == null && cats.isNotEmpty()) selectedCat = cats.first().id
                }
                .onFailure { error = it.message }
        }
        if (id != null) {
            repo.tasks(null).onSuccess { list ->
                list.find { it.id == id }?.let { t ->
                    existing = t
                    title = t.title; selectedCat = t.categoryId; priority = t.priority
                    importance = t.importance; recurrence = t.recurrence; note = t.note ?: ""
                    dueDate = t.dueDate; dueTime = t.dueTime
                }
            }.onFailure { error = it.message }
        }
        loading = false
    }

    fun save() {
        if (title.isBlank() || selectedCat == null) { error = "请填写标题并选择分类"; return }
        saving = true
        val body: Any = if (existing == null) {
            TaskCreate(
                title = title.trim(), categoryId = selectedCat!!, note = note.ifBlank { null },
                priority = priority, importance = importance, recurrence = recurrence,
                dueDate = dueDate, dueTime = dueTime,
            )
        } else {
            TaskUpdate(
                title = title.trim(), categoryId = selectedCat!!, note = note.ifBlank { null },
                priority = priority, importance = importance, recurrence = recurrence,
                dueDate = dueDate, dueTime = dueTime,
            )
        }
        scope.launch {
            val res = if (existing == null) repo.createTask(body as TaskCreate)
            else repo.updateTask(existing!!.id, body as TaskUpdate)
            res.onSuccess { saving = false; nav.popBackStack() }
                .onFailure { saving = false; error = it.message }
        }
    }

    fun remove() {
        existing?.let {
            scope.launch {
                repo.deleteTask(it.id).onSuccess { nav.popBackStack() }.onFailure { error = it.message }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "新建任务" else "编辑任务") },
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
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                OutlinedTextField(title, { title = it }, label = { Text("标题") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

                Text("分类", style = MaterialTheme.typography.labelMedium)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(categories) { c ->
                        FilterChip(selected = selectedCat == c.id, onClick = { selectedCat = c.id }, label = { Text("${c.icon} ${c.name}") })
                    }
                }

                Text("紧急度", style = MaterialTheme.typography.labelMedium)
                ChipRow(listOf("low" to "低", "normal" to "中", "high" to "高", "urgent" to "紧急"), priority) { priority = it }

                Text("重要度", style = MaterialTheme.typography.labelMedium)
                ChipRow(listOf("low" to "低", "normal" to "中", "high" to "高"), importance) { importance = it }

                Text("重复", style = MaterialTheme.typography.labelMedium)
                ChipRow(listOf("none" to "不重复", "daily" to "每天", "weekly" to "每周", "monthly" to "每月"), recurrence) { recurrence = it }

                OutlinedTextField(note, { note = it }, label = { Text("备注") }, modifier = Modifier.fillMaxWidth().height(96.dp), maxLines = 4)

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.weight(1f)) { Text(dueDate ?: "选择截止日期") }
                    OutlinedTextField(
                        dueTime ?: "", { v -> dueTime = v.takeIf { it.matches(Regex("^([01]\\d|2[0-3]):[0-5]\\d$")) } },
                        label = { Text("时间") }, singleLine = true, modifier = Modifier.weight(1f),
                        placeholder = { Text("HH:MM") },
                    )
                }

                if (showDatePicker) {
                    DatePickerDialog(
                        onDismissRequest = { showDatePicker = false },
                        confirmButton = {
                            TextButton(onClick = {
                                datePickerState.selectedDateMillis?.let { ms ->
                                    dueDate = Instant.ofEpochMilli(ms).atZone(ZoneId.of("UTC")).toLocalDate().format(YMD)
                                }
                                showDatePicker = false
                            }) { Text("确定") }
                        },
                    ) { DatePicker(state = datePickerState) }
                }
            }
        }
        LaunchedEffect(error) {
            if (error != null) Toast.makeText(ctx, error, Toast.LENGTH_SHORT).show()
        }
    }
}

@Composable
private fun ChipRow(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(options) { (k, label) ->
            FilterChip(selected = selected == k, onClick = { onSelect(k) }, label = { Text(label) })
        }
    }
}
