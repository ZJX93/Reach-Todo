package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.data.model.CategoryOut
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.data.model.TaskUpdate
import com.zjx93.reach.data.repository.ReachRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TasksUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val tasks: List<TaskOut> = emptyList(),
    val filter: String = "todo", // todo | done | all
    val categories: List<CategoryOut> = emptyList(),
)

class TasksViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(TasksUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val status = if (_state.value.filter == "all") null else _state.value.filter
            val res = repo.tasks(status)
            val cats = repo.categories().getOrNull() ?: emptyList()
            res.onSuccess { list -> _state.update { it.copy(tasks = list, categories = cats, loading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, loading = false) } }
        }
    }

    fun setFilter(f: String) {
        _state.update { it.copy(filter = f) }
        load()
    }

    fun toggleDone(task: TaskOut) {
        viewModelScope.launch {
            val newStatus = if (task.status == "done") "todo" else "done"
            repo.updateTask(task.id, TaskUpdate(status = newStatus))
                .onSuccess { load() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun delete(task: TaskOut, onDone: () -> Unit = {}) {
        viewModelScope.launch {
            repo.deleteTask(task.id)
                .onSuccess { load(); onDone() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
