package com.kenneth.stockcalc.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class CandlesApi(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    suspend fun fetchCandles(symbol: String, range: String, interval: String): CandlesResponseDto {
        return client.get("$baseUrl/api/candles") {
            parameter("symbol", symbol)
            parameter("range", range)
            parameter("interval", interval)
        }.body()
    }
}
