package com.kenneth.stockcalc.data

import com.kenneth.stockcalc.data.local.LocalTradesRepositoryImpl
import com.kenneth.stockcalc.data.supabase.SupabaseTradesRepositoryImpl
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import javax.inject.Inject

class CompositeTradesRepository @Inject constructor(
    private val auth: AuthRepository,
    private val remote: SupabaseTradesRepositoryImpl,
    private val local: LocalTradesRepositoryImpl,
) : TradesRepository {

    @OptIn(ExperimentalCoroutinesApi::class)
    override val trades: Flow<List<Trade>> =
        auth.currentUser.flatMapLatest { user ->
            if (user == null) local.trades else remote.trades
        }

    override suspend fun refresh() {
        if (auth.currentUser.first() != null) remote.refresh()
    }

    override suspend fun add(trade: Trade): Result<Trade> =
        if (auth.currentUser.first() != null) remote.add(trade) else local.add(trade)

    override suspend fun update(trade: Trade): Result<Unit> =
        if (auth.currentUser.first() != null) remote.update(trade) else local.update(trade)

    override suspend fun delete(id: String): Result<Unit> =
        if (auth.currentUser.first() != null) remote.delete(id) else local.delete(id)
}
