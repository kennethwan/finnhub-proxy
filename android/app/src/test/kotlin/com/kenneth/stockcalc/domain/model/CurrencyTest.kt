package com.kenneth.stockcalc.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class CurrencyTest {
    @Test
    fun `HK suffix resolves to HKD`() {
        assertEquals(Currency.HKD, Currency.fromSymbol("0700.HK"))
        assertEquals(Currency.HKD, Currency.fromSymbol("9988.hk"))
    }

    @Test
    fun `non-HK symbol resolves to USD`() {
        assertEquals(Currency.USD, Currency.fromSymbol("AAPL"))
        assertEquals(Currency.USD, Currency.fromSymbol("TSLA"))
    }

    @Test
    fun `convert same currency returns same amount`() {
        assertEquals(100.0, Currency.convert(100.0, Currency.USD, Currency.USD))
    }

    @Test
    fun `convert USD to HKD multiplies by 7_8`() {
        assertEquals(780.0, Currency.convert(100.0, Currency.USD, Currency.HKD))
    }

    @Test
    fun `convert HKD to USD divides by 7_8`() {
        assertEquals(100.0, Currency.convert(780.0, Currency.HKD, Currency.USD))
    }
}
