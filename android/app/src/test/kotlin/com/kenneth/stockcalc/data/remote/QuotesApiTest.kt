package com.kenneth.stockcalc.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.ByteReadChannel
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class QuotesApiTest {
    private val json = Json { ignoreUnknownKeys = true }

    private fun mockClient(body: String): HttpClient = HttpClient(MockEngine { _ ->
        respond(
            content = ByteReadChannel(body),
            status = HttpStatusCode.OK,
            headers = headersOf(HttpHeaders.ContentType, "application/json"),
        )
    }) {
        install(ContentNegotiation) { json(json) }
    }

    @Test
    fun `parses multi-symbol response`() = runTest {
        val body = """
            {"AAPL":{"c":180.5,"d":1.2,"dp":0.67,"h":181,"l":179,"o":179.5,"pc":179.3,"t":1714000000},
             "0700.HK":{"c":320.0,"d":2.0,"dp":0.63,"h":321,"l":318,"o":319,"pc":318.0,"t":1714000000}}
        """.trimIndent()
        val api = QuotesApi(mockClient(body), baseUrl = "https://example.com")
        val result = api.fetchQuotes(listOf("AAPL", "0700.HK"))
        assertEquals(2, result.size)
        assertEquals(180.5, result["AAPL"]?.c)
        assertEquals(320.0, result["0700.HK"]?.c)
    }
}
