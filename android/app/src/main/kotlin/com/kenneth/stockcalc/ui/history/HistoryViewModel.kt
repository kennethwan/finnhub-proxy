package com.kenneth.stockcalc.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class HistoryUiState(
    val closed: List<Trade> = emptyList(),
    val totalPnlDisplay: Double = 0.0,
    val displayCurrency: Currency = Currency.USD,
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    repo: TradesRepository,
    prefs: PreferencesRepository,
) : ViewModel() {
    val uiState: StateFlow<HistoryUiState> = combine(repo.trades, prefs.displayCurrency) { trades, ccy ->
        val closed = trades.filter { it.status == TradeStatus.CLOSED }
            .sortedByDescending { it.closedAt ?: it.createdAt }
        val total = closed.sumOf { t ->
            val pnl = t.pnl ?: 0.0
            Currency.convert(pnl, t.nativeCurrency, ccy)
        }
        HistoryUiState(closed = closed, totalPnlDisplay = total, displayCurrency = ccy)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryUiState())
}
