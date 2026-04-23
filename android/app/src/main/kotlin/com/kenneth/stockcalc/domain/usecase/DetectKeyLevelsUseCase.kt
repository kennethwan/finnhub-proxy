package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.Candle
import com.kenneth.stockcalc.domain.model.KeyLevel
import javax.inject.Inject
import kotlin.math.abs

class DetectKeyLevelsUseCase @Inject constructor() {
    operator fun invoke(
        candles: List<Candle>,
        lookback: Int = 5,
        minProminence: Double = 0.02,
        maxLevels: Int = 5,
    ): List<KeyLevel> {
        if (candles.size < lookback * 2 + 1) return emptyList()

        val swings = mutableListOf<KeyLevel>()
        for (i in lookback until candles.size - lookback) {
            val centerLow = candles[i].low
            val leftMin = (i - lookback until i).minOf { candles[it].low }
            val rightMin = (i + 1..i + lookback).minOf { candles[it].low }
            if (centerLow < leftMin && centerLow < rightMin) {
                val windowStart = (i - lookback * 2).coerceAtLeast(0)
                val windowEnd = (i + lookback * 2).coerceAtMost(candles.size - 1)
                val nearHigh = candles.subList(windowStart, windowEnd + 1).maxOf { it.high }
                val prominence = if (nearHigh > 0) (nearHigh - centerLow) / nearHigh else 0.0
                if (prominence >= minProminence) {
                    swings.add(KeyLevel(price = centerLow, time = candles[i].time, strength = prominence))
                }
            }
        }

        val deduped = mutableListOf<KeyLevel>()
        for (kl in swings.sortedByDescending { it.strength }) {
            val tooClose = deduped.any { existing ->
                abs(existing.price - kl.price) / kl.price < 0.015
            }
            if (!tooClose) deduped.add(kl)
            if (deduped.size >= maxLevels) break
        }
        return deduped.sortedByDescending { it.time }
    }
}
