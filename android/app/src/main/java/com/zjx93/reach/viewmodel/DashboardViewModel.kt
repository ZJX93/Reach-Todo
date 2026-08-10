package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.data.model.GoalBoardItem
import com.zjx93.reach.data.model.StatsSummary
import com.zjx93.reach.data.model.TaskOut
import com.zjx93.reach.data.model.TaskUpdate
import com.zjx93.reach.data.model.UserOut
import com.zjx93.reach.data.repository.ReachRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val summary: StatsSummary? = null,
    val tasks: List<TaskOut> = emptyList(),
    val goals: List<GoalBoardItem> = emptyList(),
    val user: UserOut? = null,
)

class DashboardViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(DashboardUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            val s = repo.statsSummary().getOrNull()
            val tasks = repo.tasks("todo").getOrNull() ?: emptyList()
            val goals = repo.goalsBoard().getOrNull() ?: emptyList()
            val me = repo.me().getOrNull()
            _state.update { it.copy(loading = false, summary = s, tasks = tasks, goals = goals, user = me) }
        }
    }

    fun toggleDone(task: TaskOut) {
        viewModelScope.launch {
            val newStatus = if (task.status == "done") "todo" else "done"
            repo.updateTask(task.id, TaskUpdate(status = newStatus)).onSuccess { load() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
