package com.kenneth.stockcalc.data.supabase

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StopLossEntryDto(
    val price: Double,
    val date: String,
    val note: String,
)

@Serializable
data class TradeDto(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val symbol: String,
    @SerialName("entry_price") val entryPrice: Double,
    val shares: Int,
    @SerialName("initial_stop_loss") val initialStopLoss: Double,
    @SerialName("current_stop_loss") val currentStopLoss: Double,
    @SerialName("target_price") val targetPrice: Double? = null,
    val status: String,
    @SerialName("risk_amount") val riskAmount: Double,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("stop_loss_history") val stopLossHistory: List<StopLossEntryDto> = emptyList(),
    @SerialName("exit_price") val exitPrice: Double? = null,
    val pnl: Double? = null,
    @SerialName("closed_at") val closedAt: String? = null,
)
