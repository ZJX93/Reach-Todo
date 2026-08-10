package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.data.model.GoalBoardItem
import com.zjx93.reach.data.model.GoalCreate
import com.zjx93.reach.data.model.GoalOut
import com.zjx93.reach.data.model.GoalUpdate
import com.zjx93.reach.data.repository.ReachRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class GoalsUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val goals: List<GoalBoardItem> = emptyList(),
)

class GoalsViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(GoalsUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.goalsBoard()
                .onSuccess { list -> _state.update { it.copy(goals = list, loading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, loading = false) } }
        }
    }

    fun create(title: String, description: String?, deadline: String?) {
        if (title.isBlank()) { _state.update { it.copy(error = "请填写标题") }; return }
        viewModelScope.launch {
            repo.createGoal(GoalCreate(title.trim(), description?.ifBlank { null }, deadline))
                .onSuccess { load() }.onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun update(id: Int, title: String, description: String?, deadline: String?, status: String?) {
        viewModelScope.launch {
            repo.updateGoal(id, GoalUpdate(title.ifBlank { null }, description?.ifBlank { null }, deadline, status))
                .onSuccess { load() }.onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun toggleDone(goal: GoalBoardItem) {
        val status = if (goal.status == "done") "active" else "done"
        viewModelScope.launch {
            repo.updateGoal(goal.id, GoalUpdate(status = status)).onSuccess { load() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }

    fun delete(goal: GoalBoardItem, onDone: () -> Unit = {}) {
        viewModelScope.launch {
            repo.deleteGoal(goal.id).onSuccess { load(); onDone() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
