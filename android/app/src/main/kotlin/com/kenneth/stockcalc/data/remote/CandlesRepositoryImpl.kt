package com.kenneth.stockcalc.data.remote

import com.kenneth.stockcalc.domain.model.Candle
import com.kenneth.stockcalc.domain.repository.CandlesRepository
import kotlinx.datetime.Instant
import javax.inject.Inject

class CandlesRepositoryImpl @Inject constructor(
    private val api: CandlesApi,
) : CandlesRepository {
    override suspend fun fetch(symbol: String, range: String, interval: String): Result<List<Candle>> = runCatching {
        val response = api.fetchCandles(symbol.trim().uppercase(), range, interval)
        if (response.error != null) throw IllegalStateException(response.error)
        response.candles
            .filter { it.c > 0.0 && it.h >= it.l }
            .map { dto ->
                Candle(
                    time = Instant.fromEpochSeconds(dto.t),
                    open = dto.o,
                    high = dto.h,
                    low = dto.l,
                    close = dto.c,
                    volume = dto.v,
                )
            }
    }
}
