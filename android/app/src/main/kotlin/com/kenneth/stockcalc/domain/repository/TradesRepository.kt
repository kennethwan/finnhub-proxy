package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Trade
import kotlinx.coroutines.flow.Flow

interface TradesRepository {
    val trades: Flow<List<Trade>>
    suspend fun add(trade: Trade): Result<Trade>
    suspend fun update(trade: Trade): Result<Unit>
    suspend fun delete(id: String): Result<Unit>
    suspend fun refresh()
}
