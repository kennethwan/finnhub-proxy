package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import kotlinx.datetime.Instant
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TradeMapperTest {
    private val now = Instant.parse("2026-04-23T02:00:00Z")

    private val domain = Trade(
        id = "00000000-0000-0000-0000-000000000001",
        symbol = "AAPL",
        entryPrice = 100.0,
        shares = 10,
        initialStopLoss = 90.0,
        currentStopLoss = 92.0,
        targetPrice = 120.0,
        status = TradeStatus.OPEN,
        riskAmount = 100.0,
        createdAt = now,
        stopLossHistory = listOf(StopLossEntry(90.0, now, "初始止損")),
    )

    @Test
    fun `toDto maps camelCase to snake_case with non-numeric id dropped`() {
        val dto = TradeMapper.toDto(domain, userId = "user-1")
        assertEquals(null, dto.id)               // UUID string not numeric → id dropped for insert
        assertEquals("user-1", dto.userId)
        assertEquals("AAPL", dto.symbol)
        assertEquals(100.0, dto.entryPrice)
        assertEquals(10, dto.shares)
        assertEquals(90.0, dto.initialStopLoss)
        assertEquals(92.0, dto.currentStopLoss)
        assertEquals(120.0, dto.targetPrice)
        assertEquals("open", dto.status)
        assertEquals(1, dto.stopLossHistory.size)
    }

    @Test
    fun `toDto preserves numeric id for remote rows`() {
        val dto = TradeMapper.toDto(domain.copy(id = "26"), userId = "user-1")
        assertEquals(26L, dto.id)
    }

    @Test
    fun `toDomain maps numeric id to string and snake_case fields to camelCase`() {
        val dto = TradeDto(
            id = 26L,
            userId = "user-1",
            symbol = "0700.HK",
            entryPrice = 320.0,
            shares = 5,
            initialStopLoss = 310.0,
            currentStopLoss = 315.0,
            targetPrice = 340.0,
            status = "closed",
            riskAmount = 50.0,
            createdAt = "2026-04-23T02:00:00Z",
            stopLossHistory = emptyList(),
            exitPrice = 335.0,
            pnl = 75.0,
            closedAt = "2026-04-23T03:00:00Z",
        )
        val trade = TradeMapper.toDomain(dto)
        assertEquals("26", trade.id)
        assertEquals(TradeStatus.CLOSED, trade.status)
        assertEquals(335.0, trade.exitPrice)
        assertEquals("0700.HK", trade.symbol)
    }

    @Test
    fun `local dto round trip preserves uuid id`() {
        val local = TradeMapper.toLocalDto(domain)
        assertEquals("00000000-0000-0000-0000-000000000001", local.id)
        val back = TradeMapper.fromLocalDto(local)
        assertEquals(domain, back)
    }
}
