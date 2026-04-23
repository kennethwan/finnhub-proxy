package com.kenneth.stockcalc.data.remote

import com.kenneth.stockcalc.domain.model.Quote
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import kotlinx.datetime.Instant
import javax.inject.Inject

class QuotesRepositoryImpl @Inject constructor(
    private val api: QuotesApi,
) : QuotesRepository {
    override suspend fun fetch(symbols: List<String>): Result<Map<String, Quote>> = runCatching {
        val dtos = api.fetchQuotes(symbols)
        dtos.mapNotNull { (symbol, dto) ->
            if (dto.error != null || dto.c <= 0.0) null
            else symbol to Quote(
                symbol = symbol,
                price = dto.c,
                change = dto.d,
                changePercent = dto.dp,
                updatedAt = Instant.fromEpochSeconds(if (dto.t > 0) dto.t else System.currentTimeMillis() / 1000),
            )
        }.toMap()
    }
}
