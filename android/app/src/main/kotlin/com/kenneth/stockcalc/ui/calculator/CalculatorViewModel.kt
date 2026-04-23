package com.kenneth.stockcalc.ui.calculator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.CandlesRepository
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCase
import com.kenneth.stockcalc.domain.usecase.DetectKeyLevelsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class CalculatorViewModel @Inject constructor(
    private val calculate: CalculatePositionUseCase,
    private val prefs: PreferencesRepository,
    private val trades: TradesRepository,
    private val quotes: QuotesRepository,
    private val candles: CandlesRepository,
    private val detectKeyLevels: DetectKeyLevelsUseCase,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CalculatorUiState())
    val uiState: StateFlow<CalculatorUiState> = _uiState.asStateFlow()

    private var autoFillJob: Job? = null

    init {
        viewModelScope.launch {
            prefs.displayCurrency.collect { c ->
                _uiState.update { it.copy(displayCurrency = c) }
                recalc()
            }
        }
    }

    fun onCapitalChange(v: String) { mutateAndRecalc { copy(capital = v) } }

    fun onSymbolChange(v: String) {
        val upper = v.uppercase()
        val previous = _uiState.value.symbol
        val defaultLot = defaultLotSizeFor(upper)
        val previousDefaultLot = defaultLotSizeFor(previous)
        _uiState.update {
            val lotSize = if (it.lotSize == previousDefaultLot.toString() || it.lotSize.isBlank()) {
                defaultLot.toString()
            } else {
                it.lotSize
            }
            it.copy(symbol = upper, lotSize = lotSize)
        }
        recalc()
        scheduleQuoteAutoFill(upper)
    }

    fun onBuyPriceChange(v: String) { mutateAndRecalc { copy(buyPrice = v) } }
    fun onStopLossChange(v: String) { mutateAndRecalc { copy(stopLoss = v) } }
    fun onStopLossPercentChange(v: String) { mutateAndRecalc { copy(stopLossPercent = v) } }
    fun onStopLossModeChange(m: StopLossMode) { mutateAndRecalc { copy(stopLossMode = m) } }
    fun onMaxLossPercentChange(v: String) { mutateAndRecalc { copy(maxLossPercent = v) } }
    fun onTargetPriceChange(v: String) { mutateAndRecalc { copy(targetPrice = v) } }
    fun onLotSizeChange(v: String) { mutateAndRecalc { copy(lotSize = v) } }

    fun openChart() {
        _uiState.update { it.copy(chartOpen = true) }
    }

    fun closeChart() {
        _uiState.update { it.copy(chartOpen = false) }
    }

    fun loadChartData() {
        val sym = _uiState.value.symbol.trim()
        if (sym.isBlank()) return
        _uiState.update { it.copy(chart = ChartState(loading = true)) }
        viewModelScope.launch {
            candles.fetch(sym)
                .onSuccess { list ->
                    val levels = detectKeyLevels(list)
                    _uiState.update { it.copy(chart = ChartState(candles = list, keyLevels = levels)) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(chart = ChartState(error = e.message ?: "error")) }
                }
        }
    }

    fun onStopLossFromChart(price: Double) {
        _uiState.update {
            it.copy(
                stopLoss = "%.2f".format(price),
                stopLossMode = StopLossMode.PRICE,
                chartOpen = false,
            )
        }
        recalc()
    }

    fun onAddTrade() {
        val s = _uiState.value
        val success = s.result as? CalculationResult.Success ?: return
        val calc = success.calculation
        if (s.symbol.isBlank()) return
        val newTrade = Trade(
            id = UUID.randomUUID().toString(),
            symbol = s.symbol.trim().uppercase(),
            entryPrice = s.buyPrice.toDouble(),
            shares = calc.shares,
            initialStopLoss = calc.actualStopLoss,
            currentStopLoss = calc.actualStopLoss,
            targetPrice = s.targetPrice.toDoubleOrNull(),
            status = TradeStatus.OPEN,
            riskAmount = calc.actualRisk,
            createdAt = Clock.System.now(),
            stopLossHistory = listOf(StopLossEntry(calc.actualStopLoss, Clock.System.now(), "初始止損")),
        )
        viewModelScope.launch {
            trades.add(newTrade).onSuccess { saved ->
                _uiState.update {
                    CalculatorUiState(
                        displayCurrency = it.displayCurrency,
                        capital = it.capital,
                        maxLossPercent = it.maxLossPercent,
                        savedTradeId = saved.id,
                    )
                }
            }
        }
    }

    private fun scheduleQuoteAutoFill(symbol: String) {
        autoFillJob?.cancel()
        val trimmed = symbol.trim()
        if (trimmed.isBlank()) {
            _uiState.update { it.copy(fetchingQuote = false) }
            return
        }
        autoFillJob = viewModelScope.launch {
            delay(500)
            _uiState.update { it.copy(fetchingQuote = true) }
            val result = quotes.fetch(listOf(trimmed))
            _uiState.update { it.copy(fetchingQuote = false) }
            val price = result.getOrNull()?.get(trimmed)?.price ?: return@launch
            val current = _uiState.value
            if (current.symbol == trimmed && current.buyPrice.isBlank()) {
                _uiState.update { it.copy(buyPrice = "%.2f".format(price)) }
                recalc()
            }
        }
    }

    private fun mutateAndRecalc(transform: CalculatorUiState.() -> CalculatorUiState) {
        _uiState.update(transform)
        recalc()
    }

    private fun recalc() {
        val s = _uiState.value
        val capital = s.capital.toDoubleOrNull()
        val buy = s.buyPrice.toDoubleOrNull()
        val maxLoss = s.maxLossPercent.toDoubleOrNull()
        val stopLoss = when (s.stopLossMode) {
            StopLossMode.PRICE -> s.stopLoss.toDoubleOrNull()
            StopLossMode.PERCENT -> {
                val pct = s.stopLossPercent.toDoubleOrNull()
                if (pct != null && buy != null) buy * (1 - pct / 100.0) else null
            }
        }
        val target = s.targetPrice.toDoubleOrNull()
        val lotSize = s.lotSize.toIntOrNull()?.coerceAtLeast(1) ?: 1

        val result = calculate(
            capital = capital,
            displayCurrency = s.displayCurrency,
            symbol = s.symbol,
            buyPrice = buy,
            stopLoss = stopLoss,
            maxLossPercent = maxLoss,
            targetPrice = target,
            lotSize = lotSize,
        )
        _uiState.update { it.copy(result = result) }
    }

    private fun defaultLotSizeFor(symbol: String): Int =
        if (Currency.fromSymbol(symbol) == Currency.HKD) 100 else 1
}
