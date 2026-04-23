package com.kenneth.stockcalc.ui.trades

import app.cash.turbine.test
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Quote
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.CandlesRepository
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TradesViewModelTest {
    private val tradesRepo = mockk<TradesRepository>(relaxed = true)
    private val quotesRepo = mockk<QuotesRepository>(relaxed = true)
    private val prefs = mockk<PreferencesRepository>(relaxed = true)
    private val candles = mockk<CandlesRepository>(relaxed = true).also {
        coEvery { it.fetch(any(), any(), any()) } returns Result.success(emptyList())
    }

    @BeforeEach fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @AfterEach fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `uiState contains open trades with current quotes`() = runTest {
        val open = sampleOpenTrade()
        coEvery { tradesRepo.trades } returns flowOf(listOf(open))
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        coEvery { quotesRepo.fetch(listOf("AAPL")) } returns Result.success(
            mapOf("AAPL" to Quote("AAPL", 110.0, 1.0, 0.9, Clock.System.now()))
        )

        val vm = TradesViewModel(tradesRepo, quotesRepo, prefs, candles)

        vm.uiState.test {
            val latest = expectMostRecentItem()
            assertEquals(1, latest.items.size)
            assertEquals(110.0, latest.items.first().currentPrice)
            cancelAndIgnoreRemainingEvents()
        }
    }

    private fun sampleOpenTrade() = Trade(
        id = "t1", symbol = "AAPL", entryPrice = 100.0, shares = 10,
        initialStopLoss = 90.0, currentStopLoss = 90.0, targetPrice = null,
        status = TradeStatus.OPEN, riskAmount = 100.0,
        createdAt = Instant.parse("2026-04-23T00:00:00Z"), stopLossHistory = emptyList(),
    )
}
