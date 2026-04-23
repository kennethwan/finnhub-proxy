package com.kenneth.stockcalc.di

import com.kenneth.stockcalc.BuildConfig
import com.kenneth.stockcalc.data.remote.CandlesApi
import com.kenneth.stockcalc.data.remote.QuotesApi
import com.kenneth.stockcalc.data.supabase.SupabaseProvider
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides @Singleton
    fun provideJson(): Json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @Provides @Singleton
    fun provideHttpClient(json: Json): HttpClient = HttpClient(OkHttp) {
        install(ContentNegotiation) { json(json) }
        expectSuccess = true
    }

    @Provides @Singleton
    fun provideQuotesApi(client: HttpClient): QuotesApi =
        QuotesApi(client, baseUrl = BuildConfig.QUOTES_BASE_URL)

    @Provides @Singleton
    fun provideCandlesApi(client: HttpClient): CandlesApi =
        CandlesApi(client, baseUrl = BuildConfig.QUOTES_BASE_URL)

    @Provides @Singleton
    fun provideSupabaseClient(): SupabaseClient = SupabaseProvider.create()
}
