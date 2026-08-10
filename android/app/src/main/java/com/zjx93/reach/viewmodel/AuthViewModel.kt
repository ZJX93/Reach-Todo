package com.zjx93.reach.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zjx93.reach.ReachApplication
import com.zjx93.reach.data.model.UserOut
import com.zjx93.reach.data.remote.Session
import com.zjx93.reach.data.repository.ReachRepository
import com.zjx93.reach.util.FcmHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val user: UserOut? = null,
)

class AuthViewModel(private val repo: ReachRepository = ReachRepository()) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state = _state.asStateFlow()

    init { loadMe() }

    fun loadMe() {
        if (Session.token.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(loading = true) }
            repo.me()
                .onSuccess { u -> _state.update { it.copy(user = u, loading = false) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun login(username: String, password: String, onOk: () -> Unit) {
        val v = validateCredentials(username, password)
        if (v != null) { _state.update { it.copy(error = v) }; return }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.login(username.trim(), password)
                .onSuccess { t ->
                    _state.update { it.copy(user = t.user, loading = false) }
                    FcmHelper.registerCurrentDevice(ReachApplication.appContext)
                    onOk()
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun register(username: String, email: String, password: String, onOk: () -> Unit) {
        val v = validateCredentials(username, password)
        if (v != null) { _state.update { it.copy(error = v) }; return }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.register(username.trim(), email.trim().ifBlank { null }, password)
                .onSuccess { t ->
                    _state.update { it.copy(user = t.user, loading = false) }
                    FcmHelper.registerCurrentDevice(ReachApplication.appContext)
                    onOk()
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun updateEmail(email: String?, onOk: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.updateEmail(email?.trim()?.ifBlank { null })
                .onSuccess { u ->
                    _state.update { it.copy(user = u, loading = false) }
                    onOk()
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun changePassword(oldP: String, newP: String, onOk: () -> Unit) {
        if (newP.length < 6) { _state.update { it.copy(error = "新密码至少 6 位") }; return }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            repo.changePassword(oldP, newP)
                .onSuccess { _state.update { it.copy(loading = false) }; onOk() }
                .onFailure { e -> _state.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun logout() {
        viewModelScope.launch { repo.logout() }
        _state.update { AuthUiState() }
    }

    private fun validateCredentials(username: String, password: String): String? {
        if (!Regex("^[A-Za-z0-9_]{3,30}$").matches(username.trim())) {
            return "用户名需为 3-30 位字母/数字/下划线"
        }
        if (password.length < 6) return "密码至少 6 位"
        return null
    }
}
