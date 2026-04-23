package com.kenneth.stockcalc.domain.model

enum class Currency { USD, HKD;
    companion object {
        const val HKD_USD_RATE: Double = 7.8

        fun fromSymbol(symbol: String): Currency =
            if (symbol.trim().endsWith(".HK", ignoreCase = true)) HKD else USD

        fun convert(amount: Double, from: Currency, to: Currency): Double = when {
            from == to -> amount
            from == USD && to == HKD -> amount * HKD_USD_RATE
            from == HKD && to == USD -> amount / HKD_USD_RATE
            else -> amount
        }
    }
}
