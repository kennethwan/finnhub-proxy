package com.kenneth.stockcalc.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.kenneth.stockcalc.data.supabase.TradeDto
import com.kenneth.stockcalc.data.supabase.TradeMapper
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.repository.TradesRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject

private val Context.tradesStore by preferencesDataStore(name = "stockcalc_local_trades")

class LocalTradesRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
) : TradesRepository {
    private val tradesKey = stringPreferencesKey("trades_json")
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override val trades: Flow<List<Trade>> = context.tradesStore.data.map { prefs ->
        val raw = prefs[tradesKey] ?: return@map emptyList()
        runCatching {
            json.decodeFromString<List<TradeDto>>(raw).map(TradeMapper::toDomain)
        }.getOrElse { emptyList() }
    }

    override suspend fun refresh() { /* no-op for local */ }

    override suspend fun add(trade: Trade): Result<Trade> = runCatching {
        mutate { current -> listOf(trade) + current }
        trade
    }

    override suspend fun update(trade: Trade): Result<Unit> = runCatching {
        mutate { current -> current.map { if (it.id == trade.id) trade else it } }
    }

    override suspend fun delete(id: String): Result<Unit> = runCatching {
        mutate { current -> current.filterNot { it.id == id } }
    }

    private suspend fun mutate(transform: (List<Trade>) -> List<Trade>) {
        context.tradesStore.edit { prefs ->
            val existing = prefs[tradesKey]?.let {
                runCatching { json.decodeFromString<List<TradeDto>>(it).map(TradeMapper::toDomain) }
                    .getOrElse { emptyList() }
            } ?: emptyList()
            val updated = transform(existing).map { TradeMapper.toDto(it, userId = "local") }
            prefs[tradesKey] = json.encodeToString(updated)
        }
    }
}
