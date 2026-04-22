package com.kenneth.stockcalc.di

import com.kenneth.stockcalc.data.CompositeTradesRepository
import com.kenneth.stockcalc.data.local.PreferencesRepositoryImpl
import com.kenneth.stockcalc.data.remote.QuotesRepositoryImpl
import com.kenneth.stockcalc.data.supabase.SupabaseAuthRepositoryImpl
import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds @Singleton
    abstract fun bindAuth(impl: SupabaseAuthRepositoryImpl): AuthRepository

    @Binds @Singleton
    abstract fun bindTrades(impl: CompositeTradesRepository): TradesRepository

    @Binds @Singleton
    abstract fun bindQuotes(impl: QuotesRepositoryImpl): QuotesRepository

    @Binds @Singleton
    abstract fun bindPreferences(impl: PreferencesRepositoryImpl): PreferencesRepository
}
