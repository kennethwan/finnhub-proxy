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
    val id: Long? = null,
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

@Serializable
data class TradeUpdateDto(
    @SerialName("current_stop_loss") val currentStopLoss: Double,
    @SerialName("stop_loss_history") val stopLossHistory: List<StopLossEntryDto>,
    val status: String,
    @SerialName("exit_price") val exitPrice: Double? = null,
    val pnl: Double? = null,
    @SerialName("closed_at") val closedAt: String? = null,
)

@Serializable
data class LocalTradeDto(
    val id: String,
    val symbol: String,
    val entryPrice: Double,
    val shares: Int,
    val initialStopLoss: Double,
    val currentStopLoss: Double,
    val targetPrice: Double? = null,
    val status: String,
    val riskAmount: Double,
    val createdAt: String,
    val stopLossHistory: List<StopLossEntryDto> = emptyList(),
    val exitPrice: Double? = null,
    val pnl: Double? = null,
    val closedAt: String? = null,
)
