package com.kenneth.stockcalc.domain.model

import kotlinx.datetime.Instant

data class Candle(
    val time: Instant,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Long,
)

data class KeyLevel(
    val price: Double,
    val time: Instant,
    val strength: Double,
)
