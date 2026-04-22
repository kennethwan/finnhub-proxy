package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

class CalculatePositionUseCaseTest {
    private val useCase = CalculatePositionUseCase()

    @Test
    fun `same-currency USD happy path`() {
        val result = useCase(
            capital = 10_000.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 1.0,
            targetPrice = 120.0,
        )
        val calc = (result as CalculationResult.Success).calculation
        assertEquals(10, calc.shares)
        assertEquals(10.0, calc.riskPerShare)
        assertEquals(100.0, calc.maxLossAmount)
        assertEquals(1_000.0, calc.requiredCapital)
        assertEquals(100.0, calc.actualRisk)
        assertEquals(2.0, calc.riskRewardRatio)
        assertEquals(200.0, calc.potentialProfit)
    }

    @Test
    fun `cross-currency HKD capital with USD stock`() {
        val result = useCase(
            capital = 78_000.0,
            displayCurrency = Currency.HKD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 1.0,
            targetPrice = null,
        )
        val calc = (result as CalculationResult.Success).calculation
        assertEquals(10, calc.shares)
        assertEquals(10.0, calc.riskPerShare)
        assertEquals(780.0, calc.maxLossAmount)
        assertTrue(abs(calc.requiredCapital - 7_800.0) < 0.01)
        assertTrue(abs(calc.actualRisk - 780.0) < 0.01)
    }

    @Test
    fun `stop loss above entry returns error`() {
        val result = useCase(
            capital = 10_000.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 110.0,
            maxLossPercent = 1.0,
            targetPrice = null,
        )
        assertTrue(result is CalculationResult.Error)
        assertEquals("止損價必須低於買入價", (result as CalculationResult.Error).message)
    }

    @Test
    fun `missing inputs return incomplete`() {
        val result = useCase(
            capital = null, displayCurrency = Currency.USD, symbol = "AAPL",
            buyPrice = 100.0, stopLoss = 90.0, maxLossPercent = 1.0, targetPrice = null,
        )
        assertTrue(result is CalculationResult.Incomplete)
    }

    @Test
    fun `canAfford is false when required capital exceeds budget`() {
        val result = useCase(
            capital = 500.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 20.0,
            targetPrice = null,
        )
        val calc = (result as CalculationResult.Success).calculation
        assertEquals(10, calc.shares)
        assertEquals(false, calc.canAfford)
    }
}
