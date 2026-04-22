package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import kotlinx.datetime.Instant
import java.util.UUID

object TradeMapper {
    fun toDto(trade: Trade, userId: String): TradeDto = TradeDto(
        id = trade.id.takeIf { it.isNotBlank() },
        userId = userId,
        symbol = trade.symbol,
        entryPrice = trade.entryPrice,
        shares = trade.shares,
        initialStopLoss = trade.initialStopLoss,
        currentStopLoss = trade.currentStopLoss,
        targetPrice = trade.targetPrice,
        status = trade.status.name.lowercase(),
        riskAmount = trade.riskAmount,
        createdAt = trade.createdAt.toString(),
        stopLossHistory = trade.stopLossHistory.map {
            StopLossEntryDto(it.price, it.date.toString(), it.note)
        },
        exitPrice = trade.exitPrice,
        pnl = trade.pnl,
        closedAt = trade.closedAt?.toString(),
    )

    fun toDomain(dto: TradeDto): Trade = Trade(
        id = dto.id ?: UUID.randomUUID().toString(),
        symbol = dto.symbol,
        entryPrice = dto.entryPrice,
        shares = dto.shares,
        initialStopLoss = dto.initialStopLoss,
        currentStopLoss = dto.currentStopLoss,
        targetPrice = dto.targetPrice,
        status = when (dto.status.lowercase()) {
            "closed" -> TradeStatus.CLOSED
            else -> TradeStatus.OPEN
        },
        riskAmount = dto.riskAmount,
        createdAt = dto.createdAt?.let { Instant.parse(it) } ?: Instant.DISTANT_PAST,
        stopLossHistory = dto.stopLossHistory.map {
            StopLossEntry(it.price, Instant.parse(it.date), it.note)
        },
        exitPrice = dto.exitPrice,
        pnl = dto.pnl,
        closedAt = dto.closedAt?.let { Instant.parse(it) },
    )
}
