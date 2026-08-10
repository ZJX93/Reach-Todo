package com.zjx93.reach.ui.main

import androidx.compose.foundation.layout.*
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
import com.zjx93.reach.data.model.GoalCreate
import com.zjx93.reach.data.model.GoalOut
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.ui.nav.Routes
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val YMD = DateTimeFormatter.ofPattern("yyyy-MM-dd")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoalEditScreen(nav: NavHostController, id: Int?) {
    val repo = remember { ReachRepository() }
    val scope = rememberCoroutineScope()

    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var existing by remember { mutableStateOf<GoalOut?>(null) }

    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var deadline by remember { mutableStateOf<String?>(null) }
    var saving by remember { mutableStateOf(false) }

    val datePickerState = rememberDatePickerState()
    var showDatePicker by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (id != null) {
            repo.goals().onSuccess { list ->
                list.find { it.id == id }?.let { g ->
                    existing = g
                    title = g.title; description = g.description ?: ""; deadline = g.deadline
                }
            }.onFailure { error = it.message }
        }
        loading = false
    }

    fun save() {
        if (title.isBlank()) { error = "请填写标题"; return }
        saving = true
        if (existing == null) {
            scope.launch { repo.createGoal(GoalCreate(title = title.trim(), description = description.ifBlank { null }, deadline = deadline)).onSuccess { saving = false; nav.popBackStack() }.onFailure { saving = false; error = it.message } }
        } else {
            scope.launch { repo.updateGoal(existing!!.id, com.zjx93.reach.data.model.GoalUpdate(title = title.trim(), description = description.ifBlank { null }, deadline = deadline)).onSuccess { saving = false; nav.popBackStack() }.onFailure { saving = false; error = it.message } }
        }
    }

    fun remove() {
        existing?.let { scope.launch { repo.deleteGoal(it.id).onSuccess { nav.popBackStack() }.onFailure { error = it.message } } }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (existing == null) "新建目标" else "编辑目标") },
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
                OutlinedTextField(description, { description = it }, label = { Text("描述（可选）") }, modifier = Modifier.fillMaxWidth().height(96.dp), maxLines = 4)
                OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) { Text(deadline ?: "选择截止日期（可选）") }

                if (showDatePicker) {
                    DatePickerDialog(
                        onDismissRequest = { showDatePicker = false },
                        confirmButton = {
                            TextButton(onClick = {
                                datePickerState.selectedDateMillis?.let { ms -> deadline = Instant.ofEpochMilli(ms).atZone(ZoneId.of("UTC")).toLocalDate().format(YMD) }
                                showDatePicker = false
                            }) { Text("确定") }
                        },
                    ) { DatePicker(state = datePickerState) }
                }
            }
        }
    }
}
