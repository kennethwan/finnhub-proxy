package com.kenneth.stockcalc.domain.model

import kotlinx.datetime.Instant

enum class TradeStatus { OPEN, CLOSED }

data class StopLossEntry(
    val price: Double,
    val date: Instant,
    val note: String,
)

data class Trade(
    val id: String,
    val symbol: String,
    val entryPrice: Double,
    val shares: Int,
    val initialStopLoss: Double,
    val currentStopLoss: Double,
    val targetPrice: Double?,
    val status: TradeStatus,
    val riskAmount: Double,
    val createdAt: Instant,
    val stopLossHistory: List<StopLossEntry>,
    val exitPrice: Double? = null,
    val pnl: Double? = null,
    val closedAt: Instant? = null,
) {
    val isRiskFree: Boolean get() = currentStopLoss >= entryPrice
    val nativeCurrency: Currency get() = Currency.fromSymbol(symbol)
}
