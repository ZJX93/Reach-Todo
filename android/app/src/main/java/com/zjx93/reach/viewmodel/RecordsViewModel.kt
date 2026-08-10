package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.data.model.RecordOut
import com.zjx93.reach.data.repository.ReachRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RecordsUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val records: List<RecordOut> = emptyList(),
)

class RecordsViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(RecordsUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.records()
                .onSuccess { list -> _state.update { it.copy(records = list.sortedByDescending { r -> r.recordDate }, loading = false) } }
                .onFailure { e -> _state.update { it.copy(error = e.message, loading = false) } }
        }
    }

    fun delete(record: RecordOut, onDone: () -> Unit = {}) {
        viewModelScope.launch {
            repo.deleteRecord(record.id).onSuccess { load(); onDone() }
                .onFailure { e -> _state.update { it.copy(error = e.message) } }
        }
    }
}
