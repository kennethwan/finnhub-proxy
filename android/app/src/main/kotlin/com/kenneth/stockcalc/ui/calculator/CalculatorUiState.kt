package com.kenneth.stockcalc.ui.calculator

import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Candle
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.KeyLevel

enum class StopLossMode { PRICE, PERCENT }

data class ChartState(
    val loading: Boolean = false,
    val error: String? = null,
    val candles: List<Candle> = emptyList(),
    val keyLevels: List<KeyLevel> = emptyList(),
)

data class CalculatorUiState(
    val capital: String = "128000",
    val symbol: String = "",
    val buyPrice: String = "",
    val stopLossMode: StopLossMode = StopLossMode.PRICE,
    val stopLoss: String = "",
    val stopLossPercent: String = "",
    val maxLossPercent: String = "0.5",
    val targetPrice: String = "",
    val lotSize: String = "1",
    val fetchingQuote: Boolean = false,
    val chart: ChartState = ChartState(),
    val chartOpen: Boolean = false,
    val displayCurrency: Currency = Currency.USD,
    val result: CalculationResult = CalculationResult.Incomplete,
    val savedTradeId: String? = null,
)
