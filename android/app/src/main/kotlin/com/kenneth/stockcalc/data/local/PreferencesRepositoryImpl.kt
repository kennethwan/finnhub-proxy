package com.kenneth.stockcalc.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

private val Context.dataStore by preferencesDataStore(name = "stockcalc_prefs")

class PreferencesRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
) : PreferencesRepository {
    private val currencyKey = stringPreferencesKey("display_currency")

    override val displayCurrency: Flow<Currency> = context.dataStore.data.map { prefs ->
        runCatching { Currency.valueOf(prefs[currencyKey] ?: "USD") }.getOrElse { Currency.USD }
    }

    override suspend fun setDisplayCurrency(currency: Currency) {
        context.dataStore.edit { it[currencyKey] = currency.name }
    }
}
