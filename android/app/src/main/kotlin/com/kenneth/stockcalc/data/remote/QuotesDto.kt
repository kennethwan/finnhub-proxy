package com.kenneth.stockcalc.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class QuoteDto(
    val c: Double = 0.0,
    val d: Double = 0.0,
    val dp: Double = 0.0,
    val h: Double = 0.0,
    val l: Double = 0.0,
    val o: Double = 0.0,
    val pc: Double = 0.0,
    val t: Long = 0L,
    val error: String? = null,
)
