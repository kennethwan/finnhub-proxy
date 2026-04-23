package com.kenneth.stockcalc.data.remote

import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class QuotesRepositoryImplTest {
    @Test
    fun `maps DTOs into Quotes and filters invalid prices`() = runTest {
        val api = mockk<QuotesApi>()
        coEvery { api.fetchQuotes(any()) } returns mapOf(
            "AAPL" to QuoteDto(c = 180.0, d = 1.0, dp = 0.5, t = 1714000000L),
            "BAD"  to QuoteDto(c = 0.0, error = "not found"),
        )
        val repo = QuotesRepositoryImpl(api)
        val result = repo.fetch(listOf("AAPL", "BAD")).getOrThrow()
        assertEquals(1, result.size)
        assertTrue(result.containsKey("AAPL"))
        assertEquals(180.0, result["AAPL"]?.price)
    }
}
