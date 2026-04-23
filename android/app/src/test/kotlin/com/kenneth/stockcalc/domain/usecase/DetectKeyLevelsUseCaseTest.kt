package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.Candle
import kotlinx.datetime.Instant
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DetectKeyLevelsUseCaseTest {
    private val useCase = DetectKeyLevelsUseCase()

    private fun synth(lows: List<Double>, highBase: Double = 120.0): List<Candle> =
        lows.mapIndexed { i, low ->
            Candle(
                time = Instant.fromEpochSeconds(1_700_000_000L + i * 86_400L),
                open = low + 1.0,
                high = highBase,
                low = low,
                close = low + 0.5,
                volume = 0L,
            )
        }

    @Test
    fun `returns empty when too few candles`() {
        val result = useCase(synth(listOf(100.0, 99.0, 98.0)))
        assertTrue(result.isEmpty())
    }

    @Test
    fun `detects a single clear swing low`() {
        // 11 candles, lookback=5. Swing low at index 5 with prominence (120-80)/120 ≈ 33%.
        val lows = listOf(110.0, 108.0, 106.0, 105.0, 103.0, 80.0, 102.0, 104.0, 105.0, 107.0, 109.0)
        val result = useCase(lows.let { synth(it) })
        assertEquals(1, result.size)
        assertEquals(80.0, result.first().price)
    }

    @Test
    fun `dedupes levels within 1_5 percent of each other`() {
        // Two swing lows very close together: 80.0 and 80.5 (< 1.5% apart). Only the stronger survives.
        val lows = listOf(
            110.0, 108.0, 106.0, 105.0, 103.0,
            80.0,
            102.0, 104.0, 103.0, 101.0, 99.0,
            80.5,
            100.0, 102.0, 103.0, 105.0, 107.0,
        )
        val result = useCase(synth(lows))
        assertEquals(1, result.size)
    }

    @Test
    fun `respects maxLevels cap`() {
        val lows = mutableListOf<Double>()
        // build six alternating swing lows spread far apart in price
        val targets = listOf(50.0, 60.0, 70.0, 80.0, 90.0, 100.0)
        for (i in 0 until 6) {
            lows.addAll(listOf(120.0, 118.0, 116.0, 115.0, 113.0, targets[i], 112.0, 114.0, 115.0, 117.0, 119.0))
        }
        val result = useCase(synth(lows), maxLevels = 3)
        assertTrue(result.size <= 3)
    }
}
