package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.data.model.FocusSessionOut
import com.zjx93.reach.data.repository.ReachRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FocusUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val sessions: List<FocusSessionOut> = emptyList(),
)

class FocusViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(FocusUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.focusSessions()
                .onSuccess { list -> _state.update { it.copy(sessions = list.sortedByDescending { s -> s.startedAt }, loading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, loading = false) } }
        }
    }

    fun log(minutes: Int, onOk: () -> Unit = {}) {
        viewModelScope.launch {
            repo.createFocus(com.zjx93.reach.data.model.FocusSessionCreate(minutes = minutes))
                .onSuccess { load(); onOk() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
