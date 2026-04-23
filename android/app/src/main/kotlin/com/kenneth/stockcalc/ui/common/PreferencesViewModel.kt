package com.kenneth.stockcalc.ui.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PreferencesViewModel @Inject constructor(
    private val prefs: PreferencesRepository,
) : ViewModel() {
    val displayCurrency: StateFlow<Currency> =
        prefs.displayCurrency.stateIn(viewModelScope, SharingStarted.Eagerly, Currency.USD)

    fun toggle() = viewModelScope.launch {
        val next = if (prefs.displayCurrency.first() == Currency.USD) Currency.HKD else Currency.USD
        prefs.setDisplayCurrency(next)
    }
}
