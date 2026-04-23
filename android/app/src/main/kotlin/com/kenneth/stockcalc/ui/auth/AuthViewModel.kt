package com.kenneth.stockcalc.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.AuthUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthMode { LOGIN, SIGNUP }

data class AuthUiState(
    val mode: AuthMode = AuthMode.LOGIN,
    val email: String = "",
    val password: String = "",
    val error: String? = null,
    val busy: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(AuthUiState())
    val ui: StateFlow<AuthUiState> = _ui.asStateFlow()

    val currentUser: StateFlow<AuthUser?> =
        auth.currentUser.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun onEmailChange(v: String) { _ui.value = _ui.value.copy(email = v) }
    fun onPasswordChange(v: String) { _ui.value = _ui.value.copy(password = v) }
    fun setMode(m: AuthMode) { _ui.value = _ui.value.copy(mode = m, error = null) }

    fun submit(onSuccess: () -> Unit) {
        val s = _ui.value
        _ui.value = s.copy(busy = true, error = null)
        viewModelScope.launch {
            val r = when (s.mode) {
                AuthMode.LOGIN -> auth.signIn(s.email, s.password)
                AuthMode.SIGNUP -> auth.signUp(s.email, s.password)
            }
            r.onSuccess { onSuccess() }.onFailure { e ->
                _ui.value = _ui.value.copy(error = e.message ?: "Auth error", busy = false)
            }
        }
    }

    fun signOut() = viewModelScope.launch { auth.signOut() }
}
