package com.kenneth.stockcalc.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class QuotesApi(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    suspend fun fetchQuotes(symbols: List<String>): Map<String, QuoteDto> {
        if (symbols.isEmpty()) return emptyMap()
        return client.get("$baseUrl/api/quotes") {
            parameter("symbols", symbols.joinToString(","))
        }.body()
    }
}
