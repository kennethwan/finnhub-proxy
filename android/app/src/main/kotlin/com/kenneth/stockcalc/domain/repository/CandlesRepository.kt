package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Candle

interface CandlesRepository {
    suspend fun fetch(symbol: String, range: String = "6mo", interval: String = "1d"): Result<List<Candle>>
}
