package com.kenneth.stockcalc.ui.calculator

import app.cash.turbine.test
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCase
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CalculatorViewModelTest {
    private val useCase = CalculatePositionUseCase()
    private val prefs = mockk<PreferencesRepository>(relaxed = true)
    private val trades = mockk<TradesRepository>(relaxed = true)

    @BeforeEach fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @AfterEach fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `updates result when inputs are valid`() = runTest {
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        val vm = CalculatorViewModel(useCase, prefs, trades)
        vm.onCapitalChange("10000")
        vm.onSymbolChange("AAPL")
        vm.onBuyPriceChange("100")
        vm.onStopLossChange("90")
        vm.onMaxLossPercentChange("1")

        vm.uiState.test {
            val latest = expectMostRecentItem()
            assertTrue(latest.result is CalculationResult.Success)
            val calc = (latest.result as CalculationResult.Success).calculation
            assertEquals(10, calc.shares)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `addTrade persists to repository`() = runTest {
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        val tradeSlot = slot<Trade>()
        coEvery { trades.add(capture(tradeSlot)) } coAnswers { Result.success(tradeSlot.captured) }

        val vm = CalculatorViewModel(useCase, prefs, trades)
        vm.onCapitalChange("10000")
        vm.onSymbolChange("AAPL")
        vm.onBuyPriceChange("100")
        vm.onStopLossChange("90")
        vm.onMaxLossPercentChange("1")
        vm.onAddTrade()

        coVerify { trades.add(any()) }
        assertEquals("AAPL", tradeSlot.captured.symbol)
        assertEquals(10, tradeSlot.captured.shares)
    }
}
