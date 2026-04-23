package com.kenneth.stockcalc.ui.trades

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Quote
import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.CandlesRepository
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import com.kenneth.stockcalc.ui.calculator.ChartState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import javax.inject.Inject

@HiltViewModel
class TradesViewModel @Inject constructor(
    private val tradesRepo: TradesRepository,
    private val quotesRepo: QuotesRepository,
    private val prefs: PreferencesRepository,
    private val candles: CandlesRepository,
) : ViewModel() {
    private val _quotes = MutableStateFlow<Map<String, Quote>>(emptyMap())
    private val _uiState = MutableStateFlow(TradesUiState())
    val uiState: StateFlow<TradesUiState> = _uiState.asStateFlow()

    private var pollJob: Job? = null

    init {
        combine(tradesRepo.trades, _quotes, prefs.displayCurrency) { trades, quotes, ccy ->
            val items = trades.filter { it.status == TradeStatus.OPEN }
                .map { t -> toItem(t, quotes[t.symbol], ccy) }
            Triple(items, ccy, quotes)
        }.onEach { (items, ccy, _) ->
            _uiState.update { it.copy(items = items, displayCurrency = ccy) }
        }.launchIn(viewModelScope)

        viewModelScope.launch {
            tradesRepo.refresh()
            fetchQuotesOnce()
        }
    }

    fun startAutoRefresh() {
        if (pollJob?.isActive == true) return
        pollJob = viewModelScope.launch {
            while (true) {
                delay(60_000)
                fetchQuotesOnce()
            }
        }
    }

    fun stopAutoRefresh() {
        pollJob?.cancel()
        pollJob = null
    }

    fun refresh() = viewModelScope.launch {
        tradesRepo.refresh()
        fetchQuotesOnce()
    }

    fun updateStopLoss(tradeId: String, newStopLoss: Double) = viewModelScope.launch {
        val current = _uiState.value.items.firstOrNull { it.trade.id == tradeId }?.trade ?: return@launch
        val isRiskFree = newStopLoss >= current.entryPrice
        val updated = current.copy(
            currentStopLoss = newStopLoss,
            stopLossHistory = current.stopLossHistory + StopLossEntry(
                price = newStopLoss,
                date = Clock.System.now(),
                note = if (isRiskFree) "✅ Risk Free!" else "推高止損",
            ),
        )
        tradesRepo.update(updated)
    }

    fun closeTrade(tradeId: String, exitPrice: Double) = viewModelScope.launch {
        val current = _uiState.value.items.firstOrNull { it.trade.id == tradeId }?.trade ?: return@launch
        val pnl = (exitPrice - current.entryPrice) * current.shares
        val updated = current.copy(
            status = TradeStatus.CLOSED,
            exitPrice = exitPrice,
            pnl = pnl,
            closedAt = Clock.System.now(),
        )
        tradesRepo.update(updated)
    }

    fun deleteTrade(tradeId: String) = viewModelScope.launch {
        tradesRepo.delete(tradeId)
    }

    fun openChart(tradeId: String) {
        _uiState.update { it.copy(chartTradeId = tradeId, chart = ChartState(loading = true)) }
        loadChartData(tradeId)
    }

    fun closeChart() {
        _uiState.update { it.copy(chartTradeId = null, chart = ChartState()) }
    }

    private fun loadChartData(tradeId: String) {
        val symbol = _uiState.value.items.firstOrNull { it.trade.id == tradeId }?.trade?.symbol ?: return
        viewModelScope.launch {
            candles.fetch(symbol)
                .onSuccess { list ->
                    _uiState.update { it.copy(chart = ChartState(candles = list)) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(chart = ChartState(error = e.message ?: "error")) }
                }
        }
    }

    private suspend fun fetchQuotesOnce() {
        val symbols = _uiState.value.items.map { it.trade.symbol }.distinct()
        if (symbols.isEmpty()) return
        quotesRepo.fetch(symbols).onSuccess { _quotes.value = _quotes.value + it }
    }

    private fun toItem(trade: Trade, quote: Quote?, display: Currency): TradeItem {
        val priceNative = quote?.price
        val pnlNative = if (priceNative != null) (priceNative - trade.entryPrice) * trade.shares else null
        val pnlDisplay = pnlNative?.let { Currency.convert(it, trade.nativeCurrency, display) }
        val pnlPct = if (priceNative != null) (priceNative - trade.entryPrice) / trade.entryPrice * 100 else null
        return TradeItem(
            trade = trade,
            currentPrice = priceNative,
            change = quote?.change,
            changePercent = quote?.changePercent,
            unrealizedPnl = pnlDisplay,
            unrealizedPnlPercent = pnlPct,
            isRiskFree = trade.isRiskFree,
        )
    }
}
