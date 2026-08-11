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
        val newStatus = if (task.status == "done") "todo" else "done"
        // 乐观更新：立刻在本地翻转状态并保留该项，给用户明确反馈
        // （避免整页 reload 把已完成项从「todo」过滤掉而「消失」，造成「点击无反应」的错觉）
        _state.update { s ->
            s.copy(tasks = s.tasks.map { if (it.id == task.id) it.copy(status = newStatus) else it })
        }
        viewModelScope.launch {
            repo.updateTask(task.id, TaskUpdate(status = newStatus))
                .onSuccess { refreshStats() }
                .onFailure { e ->
                    // 失败回滚到原状态，并提示错误
                    _state.update { s ->
                        s.copy(
                            tasks = s.tasks.map { if (it.id == task.id) it.copy(status = task.status) else it },
                            error = e.message,
                        )
                    }
                }
        }
    }

    /** 仅刷新统计（不重拉任务列表），保留看板上已勾选项的显示。 */
    private fun refreshStats() {
        viewModelScope.launch {
            repo.statsSummary().getOrNull()?.let { s -> _state.update { it.copy(summary = s) } }
        }
    }
}
