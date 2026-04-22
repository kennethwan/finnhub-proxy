package com.kenneth.stockcalc.domain.model

import kotlinx.datetime.Instant

data class Quote(
    val symbol: String,
    val price: Double,
    val change: Double,
    val changePercent: Double,
    val updatedAt: Instant,
)
