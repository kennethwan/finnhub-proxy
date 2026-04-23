package com.kenneth.stockcalc.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class CandleDto(
    val t: Long = 0L,
    val o: Double = 0.0,
    val h: Double = 0.0,
    val l: Double = 0.0,
    val c: Double = 0.0,
    val v: Long = 0L,
)

@Serializable
data class CandlesResponseDto(
    val symbol: String = "",
    val range: String = "",
    val interval: String = "",
    val candles: List<CandleDto> = emptyList(),
    val error: String? = null,
)
