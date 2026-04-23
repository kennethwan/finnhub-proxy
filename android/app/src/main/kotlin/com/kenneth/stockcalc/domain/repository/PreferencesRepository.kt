package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Currency
import kotlinx.coroutines.flow.Flow

interface PreferencesRepository {
    val displayCurrency: Flow<Currency>
    suspend fun setDisplayCurrency(currency: Currency)
}
