package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import javax.inject.Inject

class SupabaseTradesRepositoryImpl @Inject constructor(
    private val client: SupabaseClient,
    private val auth: AuthRepository,
) : TradesRepository {

    private val _trades = MutableStateFlow<List<Trade>>(emptyList())
    override val trades: Flow<List<Trade>> = _trades.asStateFlow()

    override suspend fun refresh() {
        val userId = auth.currentUser.first()?.id ?: run {
            _trades.value = emptyList()
            return
        }
        val rows = client.postgrest.from("trades")
            .select {
                filter { eq("user_id", userId) }
                order("created_at", Order.DESCENDING)
            }
            .decodeList<TradeDto>()
        _trades.value = rows.map(TradeMapper::toDomain)
    }

    override suspend fun add(trade: Trade): Result<Trade> = runCatching {
        val userId = requireNotNull(auth.currentUser.first()?.id) { "not authenticated" }
        val inserted = client.postgrest.from("trades")
            .insert(TradeMapper.toDto(trade.copy(id = ""), userId)) { select() }
            .decodeSingle<TradeDto>()
        val saved = TradeMapper.toDomain(inserted)
        _trades.value = listOf(saved) + _trades.value
        saved
    }

    override suspend fun update(trade: Trade): Result<Unit> = runCatching {
        val userId = requireNotNull(auth.currentUser.first()?.id) { "not authenticated" }
        val tradeIdLong = requireNotNull(trade.id.toLongOrNull()) { "trade id must be numeric for remote update" }
        client.postgrest.from("trades").update(TradeMapper.toUpdateDto(trade)) {
            filter {
                eq("id", tradeIdLong)
                eq("user_id", userId)
            }
        }
        _trades.value = _trades.value.map { if (it.id == trade.id) trade else it }
    }

    override suspend fun delete(id: String): Result<Unit> = runCatching {
        val userId = requireNotNull(auth.currentUser.first()?.id) { "not authenticated" }
        val idLong = requireNotNull(id.toLongOrNull()) { "id must be numeric for remote delete" }
        client.postgrest.from("trades").delete {
            filter {
                eq("id", idLong)
                eq("user_id", userId)
            }
        }
        _trades.value = _trades.value.filterNot { it.id == id }
    }
}
