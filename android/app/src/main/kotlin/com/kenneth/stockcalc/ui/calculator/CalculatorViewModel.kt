package com.kenneth.stockcalc.ui.calculator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
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
) : ViewModel() {
    private val _uiState = MutableStateFlow(CalculatorUiState())
    val uiState: StateFlow<CalculatorUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            prefs.displayCurrency.collect { c ->
                _uiState.update { it.copy(displayCurrency = c) }
                recalc()
            }
        }
    }

    fun onCapitalChange(v: String) { mutateAndRecalc { copy(capital = v) } }
    fun onSymbolChange(v: String) { mutateAndRecalc { copy(symbol = v.uppercase()) } }
    fun onBuyPriceChange(v: String) { mutateAndRecalc { copy(buyPrice = v) } }
    fun onStopLossChange(v: String) { mutateAndRecalc { copy(stopLoss = v) } }
    fun onStopLossPercentChange(v: String) { mutateAndRecalc { copy(stopLossPercent = v) } }
    fun onStopLossModeChange(m: StopLossMode) { mutateAndRecalc { copy(stopLossMode = m) } }
    fun onMaxLossPercentChange(v: String) { mutateAndRecalc { copy(maxLossPercent = v) } }
    fun onTargetPriceChange(v: String) { mutateAndRecalc { copy(targetPrice = v) } }

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

        val result = calculate(
            capital = capital,
            displayCurrency = s.displayCurrency,
            symbol = s.symbol,
            buyPrice = buy,
            stopLoss = stopLoss,
            maxLossPercent = maxLoss,
            targetPrice = target,
        )
        _uiState.update { it.copy(result = result) }
    }
}
