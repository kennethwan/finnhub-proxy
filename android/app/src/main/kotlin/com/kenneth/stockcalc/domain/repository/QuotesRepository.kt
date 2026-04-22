package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Quote

interface QuotesRepository {
    suspend fun fetch(symbols: List<String>): Result<Map<String, Quote>>
}
