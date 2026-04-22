package com.kenneth.stockcalc.ui.trades

import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade

data class TradeItem(
    val trade: Trade,
    val currentPrice: Double?,
    val change: Double?,
    val changePercent: Double?,
    val unrealizedPnl: Double?,
    val unrealizedPnlPercent: Double?,
    val isRiskFree: Boolean,
)

data class TradesUiState(
    val items: List<TradeItem> = emptyList(),
    val displayCurrency: Currency = Currency.USD,
    val loading: Boolean = false,
    val error: String? = null,
)
