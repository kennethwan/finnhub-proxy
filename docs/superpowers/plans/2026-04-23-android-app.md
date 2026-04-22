# Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Android app (Jetpack Compose) with 1:1 feature parity to the existing stock position calculator web app, reusing the Vercel `/api/quotes` proxy and Supabase backend.

**Architecture:** Clean Architecture with three layers (UI / domain / data). Feature-per-folder UI split. Hilt for DI. Supabase-kt for auth and postgrest. Ktor for the quote proxy call. DataStore for offline cache and user preferences.

**Tech Stack:** Kotlin 2.0, Jetpack Compose + Material 3, Hilt 2.51, Ktor 2.3, supabase-kt 2.5, kotlinx.serialization, kotlinx-datetime, JUnit 5, MockK, Turbine, Gradle Kotlin DSL + version catalog. Min SDK 26, target SDK 35.

---

## File Structure

```
android/                                        <-- new subdirectory in repo
  build.gradle.kts
  settings.gradle.kts
  gradle.properties
  gradle/libs.versions.toml
  app/
    build.gradle.kts
    proguard-rules.pro
    src/main/
      AndroidManifest.xml
      res/values/strings.xml                    # zh-HK strings
      res/values/themes.xml
      kotlin/com/kenneth/stockcalc/
        StockCalcApplication.kt
        MainActivity.kt
        di/
          AppModule.kt                          # Ktor, Supabase, DataStore
          RepositoryModule.kt                   # interface bindings
        domain/
          model/Currency.kt
          model/Trade.kt
          model/Quote.kt
          model/Calculation.kt
          usecase/CalculatePositionUseCase.kt
          usecase/ConvertCurrencyUseCase.kt
          repository/AuthRepository.kt
          repository/TradesRepository.kt
          repository/QuotesRepository.kt
          repository/PreferencesRepository.kt
        data/
          remote/QuotesApi.kt
          remote/QuotesDto.kt
          remote/QuotesRepositoryImpl.kt
          supabase/SupabaseProvider.kt
          supabase/TradeDto.kt
          supabase/TradeMapper.kt
          supabase/SupabaseAuthRepositoryImpl.kt
          supabase/SupabaseTradesRepositoryImpl.kt
          local/PreferencesRepositoryImpl.kt
          local/LocalTradesRepositoryImpl.kt
          CompositeTradesRepository.kt
        ui/
          theme/Color.kt
          theme/Theme.kt
          theme/Type.kt
          components/CurrencyChip.kt
          components/RiskFreeBadge.kt
          components/TradeCard.kt
          calculator/CalculatorUiState.kt
          calculator/CalculatorViewModel.kt
          calculator/CalculatorScreen.kt
          trades/TradesUiState.kt
          trades/TradesViewModel.kt
          trades/TradesScreen.kt
          trades/UpdateStopLossDialog.kt
          trades/CloseTradeDialog.kt
          history/HistoryViewModel.kt
          history/HistoryScreen.kt
          auth/AuthViewModel.kt
          auth/AuthBottomSheet.kt
          navigation/AppNavigation.kt
    src/test/kotlin/com/kenneth/stockcalc/      # unit tests (JUnit 5 + MockK)
    src/androidTest/kotlin/com/kenneth/stockcalc/  # Compose UI tests
```

The Android project lives under `/android/` inside the existing repo so the Vercel frontend and the Android app share one git history.

---

## Phase 0 — Scaffolding

### Task 0.1: Initialize Gradle project skeleton

**Files:**
- Create: `android/settings.gradle.kts`
- Create: `android/build.gradle.kts`
- Create: `android/gradle.properties`
- Create: `android/gradle/libs.versions.toml`
- Create: `android/gradle/wrapper/gradle-wrapper.properties`

- [ ] **Step 1: Write `settings.gradle.kts`**

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "stockcalc"
include(":app")
```

- [ ] **Step 2: Write `gradle.properties`**

```
org.gradle.jvmargs=-Xmx4g -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
```

- [ ] **Step 3: Write `gradle/libs.versions.toml`**

```toml
[versions]
agp = "8.5.2"
kotlin = "2.0.20"
ksp = "2.0.20-1.0.25"
hilt = "2.51.1"
compose-bom = "2024.09.02"
nav-compose = "2.8.1"
hilt-nav-compose = "1.2.0"
lifecycle = "2.8.6"
ktor = "2.3.12"
supabase = "2.5.4"
datastore = "1.1.1"
kotlinx-serialization = "1.7.1"
kotlinx-datetime = "0.6.1"
coroutines = "1.9.0"
junit5 = "5.11.0"
mockk = "1.13.12"
turbine = "1.1.0"

[libraries]
androidx-core-ktx = { module = "androidx.core:core-ktx", version = "1.13.1" }
androidx-activity-compose = { module = "androidx.activity:activity-compose", version = "1.9.2" }
androidx-lifecycle-runtime-ktx = { module = "androidx.lifecycle:lifecycle-runtime-ktx", version.ref = "lifecycle" }
androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }
compose-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
compose-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-material-icons = { module = "androidx.compose.material:material-icons-extended" }
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "nav-compose" }
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
hilt-nav-compose = { module = "androidx.hilt:hilt-navigation-compose", version.ref = "hilt-nav-compose" }
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-mock = { module = "io.ktor:ktor-client-mock", version.ref = "ktor" }
supabase-bom = { module = "io.github.jan-tennert.supabase:bom", version.ref = "supabase" }
supabase-postgrest = { module = "io.github.jan-tennert.supabase:postgrest-kt" }
supabase-gotrue = { module = "io.github.jan-tennert.supabase:gotrue-kt" }
datastore-preferences = { module = "androidx.datastore:datastore-preferences", version.ref = "datastore" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinx-serialization" }
kotlinx-datetime = { module = "org.jetbrains.kotlinx:kotlinx-datetime", version.ref = "kotlinx-datetime" }
kotlinx-coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
kotlinx-coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines" }
junit-jupiter-api = { module = "org.junit.jupiter:junit-jupiter-api", version.ref = "junit5" }
junit-jupiter-engine = { module = "org.junit.jupiter:junit-jupiter-engine", version.ref = "junit5" }
junit-jupiter-params = { module = "org.junit.jupiter:junit-jupiter-params", version.ref = "junit5" }
mockk = { module = "io.mockk:mockk", version.ref = "mockk" }
turbine = { module = "app.cash.turbine:turbine", version.ref = "turbine" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
```

- [ ] **Step 4: Write root `build.gradle.kts`**

```kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
}
```

- [ ] **Step 5: Write `gradle/wrapper/gradle-wrapper.properties`**

```
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kenneth/Downloads/finnhub-proxy
git add android/settings.gradle.kts android/build.gradle.kts android/gradle.properties android/gradle/libs.versions.toml android/gradle/wrapper/gradle-wrapper.properties
git commit -m "chore(android): initialize gradle project skeleton"
```

---

### Task 0.2: Create `:app` module and manifest

**Files:**
- Create: `android/app/build.gradle.kts`
- Create: `android/app/proguard-rules.pro`
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/res/values/strings.xml`
- Create: `android/app/src/main/res/values/themes.xml`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/StockCalcApplication.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/MainActivity.kt`

- [ ] **Step 1: Write `app/build.gradle.kts`**

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "com.kenneth.stockcalc"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.kenneth.stockcalc"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField(
            "String",
            "QUOTES_BASE_URL",
            "\"https://finnhub-proxy.vercel.app\""
        )
        buildConfigField(
            "String",
            "SUPABASE_URL",
            "\"https://ykdlifojtvejjvccjvcx.supabase.co\""
        )
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"sb_publishable_rFGQ5h2Yq4GnApAZq9cTCQ_B84OgS9O\""
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin { jvmToolchain(17) }

    sourceSets["main"].java.srcDirs("src/main/kotlin")
    sourceSets["test"].java.srcDirs("src/test/kotlin")
    sourceSets["androidTest"].java.srcDirs("src/androidTest/kotlin")

    testOptions {
        unitTests.all { it.useJUnitPlatform() }
    }

    packaging {
        resources.excludes += setOf(
            "META-INF/AL2.0",
            "META-INF/LGPL2.1",
            "META-INF/LICENSE.md",
            "META-INF/LICENSE-notice.md",
        )
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.navigation.compose)
    implementation(libs.hilt.nav.compose)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)

    implementation(platform(libs.supabase.bom))
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.gotrue)

    implementation(libs.datastore.preferences)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.datetime)
    implementation(libs.kotlinx.coroutines.android)

    testImplementation(libs.junit.jupiter.api)
    testImplementation(libs.junit.jupiter.params)
    testRuntimeOnly(libs.junit.jupiter.engine)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.ktor.client.mock)
}
```

- [ ] **Step 2: Write `app/proguard-rules.pro`**

```
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
-keep class io.github.jan.supabase.** { *; }
```

- [ ] **Step 3: Write `AndroidManifest.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".StockCalcApplication"
        android:label="@string/app_name"
        android:theme="@style/Theme.StockCalc"
        android:allowBackup="false"
        android:supportsRtl="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.StockCalc">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

- [ ] **Step 4: Write `res/values/strings.xml` (zh-HK labels)**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">股票倉位計算器</string>
    <string name="tab_calculator">計算機</string>
    <string name="tab_trades">持倉</string>
    <string name="tab_history">歷史</string>
    <string name="label_capital">資金</string>
    <string name="label_symbol">股票代號</string>
    <string name="label_buy_price">買入價</string>
    <string name="label_stop_loss">止損價</string>
    <string name="label_stop_loss_percent">止損 %</string>
    <string name="label_max_loss_percent">最大風險 %</string>
    <string name="label_target_price">目標價</string>
    <string name="action_add_trade">加入追蹤</string>
    <string name="action_update_stop">推高止損</string>
    <string name="action_close_trade">平倉</string>
    <string name="action_delete">刪除</string>
    <string name="action_login">登入</string>
    <string name="action_signup">註冊</string>
    <string name="action_sign_out">登出</string>
    <string name="error_stop_above_entry">止損價必須低於買入價</string>
    <string name="badge_risk_free">✅ Risk Free</string>
</resources>
```

- [ ] **Step 5: Write `res/values/themes.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.StockCalc" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:windowBackground">@android:color/black</item>
    </style>
</resources>
```

- [ ] **Step 6: Write `StockCalcApplication.kt`**

```kotlin
package com.kenneth.stockcalc

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class StockCalcApplication : Application()
```

- [ ] **Step 7: Write a minimal `MainActivity.kt`**

```kotlin
package com.kenneth.stockcalc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(Modifier.fillMaxSize()) {
                    Text("股票倉位計算器")
                }
            }
        }
    }
}
```

- [ ] **Step 8: Verify build**

Run: `cd android && ./gradlew :app:assembleDebug`
Expected: `BUILD SUCCESSFUL`. If the wrapper jar is missing, run
`gradle wrapper --gradle-version 8.9` (system gradle) once first.

- [ ] **Step 9: Commit**

```bash
git add android/app/
git commit -m "feat(android): add :app module with Hilt application and manifest"
```

---

## Phase 1 — Domain layer (TDD, no Android deps)

### Task 1.1: Currency model

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/Currency.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/domain/model/CurrencyTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd android && ./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.domain.model.CurrencyTest"`
Expected: FAIL with "unresolved reference: Currency".

- [ ] **Step 3: Write minimal implementation**

```kotlin
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.domain.model.CurrencyTest"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/Currency.kt \
        android/app/src/test/kotlin/com/kenneth/stockcalc/domain/model/CurrencyTest.kt
git commit -m "feat(domain): add Currency enum with fromSymbol and conversion"
```

---

### Task 1.2: Trade / Quote / Calculation models

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/Trade.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/Quote.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/Calculation.kt`

- [ ] **Step 1: Write `Trade.kt`**

```kotlin
package com.kenneth.stockcalc.domain.model

import kotlinx.datetime.Instant

enum class TradeStatus { OPEN, CLOSED }

data class StopLossEntry(
    val price: Double,
    val date: Instant,
    val note: String,
)

data class Trade(
    val id: String,
    val symbol: String,
    val entryPrice: Double,
    val shares: Int,
    val initialStopLoss: Double,
    val currentStopLoss: Double,
    val targetPrice: Double?,
    val status: TradeStatus,
    val riskAmount: Double,
    val createdAt: Instant,
    val stopLossHistory: List<StopLossEntry>,
    val exitPrice: Double? = null,
    val pnl: Double? = null,
    val closedAt: Instant? = null,
) {
    val isRiskFree: Boolean get() = currentStopLoss >= entryPrice
    val nativeCurrency: Currency get() = Currency.fromSymbol(symbol)
}
```

- [ ] **Step 2: Write `Quote.kt`**

```kotlin
package com.kenneth.stockcalc.domain.model

import kotlinx.datetime.Instant

data class Quote(
    val symbol: String,
    val price: Double,
    val change: Double,
    val changePercent: Double,
    val updatedAt: Instant,
)
```

- [ ] **Step 3: Write `Calculation.kt`**

```kotlin
package com.kenneth.stockcalc.domain.model

data class Calculation(
    val shares: Int,
    val riskPerShare: Double,
    val stopLossPercentage: Double,
    val maxLossAmount: Double,
    val requiredCapital: Double,
    val actualRisk: Double,
    val actualRiskPercent: Double,
    val capitalUsagePercent: Double,
    val canAfford: Boolean,
    val actualStopLoss: Double,
    val riskRewardRatio: Double?,
    val potentialProfit: Double?,
    val targetGainPercent: Double?,
) {
    companion object {
        val INVALID_STOP_LOSS: String = "止損價必須低於買入價"
    }
}

sealed interface CalculationResult {
    data class Success(val calculation: Calculation) : CalculationResult
    data class Error(val message: String) : CalculationResult
    data object Incomplete : CalculationResult
}
```

- [ ] **Step 4: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/domain/model/
git commit -m "feat(domain): add Trade, Quote, Calculation models"
```

---

### Task 1.3: `CalculatePositionUseCase` (TDD, includes currency-cross cases)

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/usecase/CalculatePositionUseCase.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/domain/usecase/CalculatePositionUseCaseTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.math.abs

class CalculatePositionUseCaseTest {
    private val useCase = CalculatePositionUseCase()

    @Test
    fun `same-currency USD happy path`() {
        val result = useCase(
            capital = 10_000.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 1.0,
            targetPrice = 120.0,
        )
        val calc = (result as CalculationResult.Success).calculation
        assertEquals(10, calc.shares)            // risk$ 100 / riskPerShare 10
        assertEquals(10.0, calc.riskPerShare)
        assertEquals(100.0, calc.maxLossAmount)
        assertEquals(1_000.0, calc.requiredCapital)
        assertEquals(100.0, calc.actualRisk)
        assertEquals(2.0, calc.riskRewardRatio)
        assertEquals(200.0, calc.potentialProfit)
    }

    @Test
    fun `cross-currency HKD capital with USD stock`() {
        // capital in HKD, buy USD stock: convert maxLoss HKD->USD for shares calc,
        // convert result values USD->HKD for display
        val result = useCase(
            capital = 78_000.0,
            displayCurrency = Currency.HKD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 1.0,
            targetPrice = null,
        )
        val calc = (result as CalculationResult.Success).calculation
        // maxLoss HKD 780 -> USD 100 / risk 10 = 10 shares
        assertEquals(10, calc.shares)
        // riskPerShare stays native (USD)
        assertEquals(10.0, calc.riskPerShare)
        // display dollar amounts converted to HKD
        assertEquals(780.0, calc.maxLossAmount)
        // requiredCapital USD 1000 -> HKD 7800
        assertTrue(abs(calc.requiredCapital - 7_800.0) < 0.01)
        assertTrue(abs(calc.actualRisk - 780.0) < 0.01)
    }

    @Test
    fun `stop loss above entry returns error`() {
        val result = useCase(
            capital = 10_000.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 110.0,
            maxLossPercent = 1.0,
            targetPrice = null,
        )
        assertTrue(result is CalculationResult.Error)
        assertEquals("止損價必須低於買入價", (result as CalculationResult.Error).message)
    }

    @Test
    fun `missing inputs return incomplete`() {
        val result = useCase(
            capital = null, displayCurrency = Currency.USD, symbol = "AAPL",
            buyPrice = 100.0, stopLoss = 90.0, maxLossPercent = 1.0, targetPrice = null,
        )
        assertTrue(result is CalculationResult.Incomplete)
    }

    @Test
    fun `canAfford is false when required capital exceeds budget`() {
        val result = useCase(
            capital = 500.0,
            displayCurrency = Currency.USD,
            symbol = "AAPL",
            buyPrice = 100.0,
            stopLoss = 90.0,
            maxLossPercent = 20.0,   // maxLoss 100 -> 10 shares -> requires $1000
            targetPrice = null,
        )
        val calc = (result as CalculationResult.Success).calculation
        assertEquals(10, calc.shares)
        assertEquals(false, calc.canAfford)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCaseTest"`
Expected: FAIL with "unresolved reference: CalculatePositionUseCase".

- [ ] **Step 3: Write the implementation**

```kotlin
package com.kenneth.stockcalc.domain.usecase

import com.kenneth.stockcalc.domain.model.Calculation
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import kotlin.math.floor

class CalculatePositionUseCase {
    operator fun invoke(
        capital: Double?,
        displayCurrency: Currency,
        symbol: String,
        buyPrice: Double?,
        stopLoss: Double?,
        maxLossPercent: Double?,
        targetPrice: Double?,
    ): CalculationResult {
        if (capital == null || buyPrice == null || stopLoss == null || maxLossPercent == null) {
            return CalculationResult.Incomplete
        }
        if (stopLoss >= buyPrice) {
            return CalculationResult.Error(Calculation.INVALID_STOP_LOSS)
        }

        val nativeCurrency = Currency.fromSymbol(symbol)
        val riskPerShare = buyPrice - stopLoss                                // native
        val maxLossDisplay = capital * maxLossPercent / 100.0                 // display currency
        val maxLossNative = Currency.convert(maxLossDisplay, displayCurrency, nativeCurrency)
        val shares = floor(maxLossNative / riskPerShare).toInt().coerceAtLeast(0)

        val requiredCapitalNative = shares * buyPrice
        val requiredCapitalDisplay = Currency.convert(requiredCapitalNative, nativeCurrency, displayCurrency)
        val actualRiskNative = shares * riskPerShare
        val actualRiskDisplay = Currency.convert(actualRiskNative, nativeCurrency, displayCurrency)
        val actualRiskPercent = if (capital > 0) actualRiskDisplay / capital * 100.0 else 0.0
        val capitalUsagePercent = if (capital > 0) requiredCapitalDisplay / capital * 100.0 else 0.0
        val stopLossPercentage = riskPerShare / buyPrice * 100.0

        var rr: Double? = null
        var potentialProfit: Double? = null
        var targetGain: Double? = null
        if (targetPrice != null && targetPrice > buyPrice) {
            val profitPerShare = targetPrice - buyPrice
            rr = profitPerShare / riskPerShare
            val profitNative = shares * profitPerShare
            potentialProfit = Currency.convert(profitNative, nativeCurrency, displayCurrency)
            targetGain = profitPerShare / buyPrice * 100.0
        }

        return CalculationResult.Success(
            Calculation(
                shares = shares,
                riskPerShare = riskPerShare,
                stopLossPercentage = stopLossPercentage,
                maxLossAmount = maxLossDisplay,
                requiredCapital = requiredCapitalDisplay,
                actualRisk = actualRiskDisplay,
                actualRiskPercent = actualRiskPercent,
                capitalUsagePercent = capitalUsagePercent,
                canAfford = requiredCapitalDisplay <= capital,
                actualStopLoss = stopLoss,
                riskRewardRatio = rr,
                potentialProfit = potentialProfit,
                targetGainPercent = targetGain,
            )
        )
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCaseTest"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/domain/usecase/CalculatePositionUseCase.kt \
        android/app/src/test/kotlin/com/kenneth/stockcalc/domain/usecase/CalculatePositionUseCaseTest.kt
git commit -m "feat(domain): add CalculatePositionUseCase with currency-cross support"
```

---

### Task 1.4: Repository interfaces

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/repository/AuthRepository.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/repository/TradesRepository.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/repository/QuotesRepository.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/domain/repository/PreferencesRepository.kt`

- [ ] **Step 1: Write `AuthRepository.kt`**

```kotlin
package com.kenneth.stockcalc.domain.repository

import kotlinx.coroutines.flow.Flow

data class AuthUser(val id: String, val email: String)

interface AuthRepository {
    val currentUser: Flow<AuthUser?>
    suspend fun signIn(email: String, password: String): Result<Unit>
    suspend fun signUp(email: String, password: String): Result<Unit>
    suspend fun signOut()
}
```

- [ ] **Step 2: Write `TradesRepository.kt`**

```kotlin
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
```

- [ ] **Step 3: Write `QuotesRepository.kt`**

```kotlin
package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Quote

interface QuotesRepository {
    suspend fun fetch(symbols: List<String>): Result<Map<String, Quote>>
}
```

- [ ] **Step 4: Write `PreferencesRepository.kt`**

```kotlin
package com.kenneth.stockcalc.domain.repository

import com.kenneth.stockcalc.domain.model.Currency
import kotlinx.coroutines.flow.Flow

interface PreferencesRepository {
    val displayCurrency: Flow<Currency>
    suspend fun setDisplayCurrency(currency: Currency)
}
```

- [ ] **Step 5: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/domain/repository/
git commit -m "feat(domain): add repository interfaces"
```

---

## Phase 2 — Data layer

### Task 2.1: Quotes DTO + Ktor API

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/remote/QuotesDto.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/remote/QuotesApi.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/data/remote/QuotesApiTest.kt`

- [ ] **Step 1: Write the failing test (using Ktor MockEngine)**

```kotlin
package com.kenneth.stockcalc.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import io.ktor.serialization.kotlinx.json.json
import io.ktor.utils.io.ByteReadChannel
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class QuotesApiTest {
    private val json = Json { ignoreUnknownKeys = true }

    private fun mockClient(body: String): HttpClient = HttpClient(MockEngine { _ ->
        respond(
            content = ByteReadChannel(body),
            status = HttpStatusCode.OK,
            headers = headersOf(HttpHeaders.ContentType, "application/json"),
        )
    }) {
        install(ContentNegotiation) { json(json) }
    }

    @Test
    fun `parses multi-symbol response`() = runTest {
        val body = """
            {"AAPL":{"c":180.5,"d":1.2,"dp":0.67,"h":181,"l":179,"o":179.5,"pc":179.3,"t":1714000000},
             "0700.HK":{"c":320.0,"d":2.0,"dp":0.63,"h":321,"l":318,"o":319,"pc":318.0,"t":1714000000}}
        """.trimIndent()
        val api = QuotesApi(mockClient(body), baseUrl = "https://example.com")
        val result = api.fetchQuotes(listOf("AAPL", "0700.HK"))
        assertEquals(2, result.size)
        assertEquals(180.5, result["AAPL"]?.c)
        assertEquals(320.0, result["0700.HK"]?.c)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.remote.QuotesApiTest"`
Expected: FAIL with "unresolved reference: QuotesApi".

- [ ] **Step 3: Write `QuotesDto.kt`**

```kotlin
package com.kenneth.stockcalc.data.remote

import kotlinx.serialization.Serializable

@Serializable
data class QuoteDto(
    val c: Double = 0.0,       // current price
    val d: Double = 0.0,       // change
    val dp: Double = 0.0,      // change percent
    val h: Double = 0.0,
    val l: Double = 0.0,
    val o: Double = 0.0,
    val pc: Double = 0.0,
    val t: Long = 0L,
    val error: String? = null,
)
```

- [ ] **Step 4: Write `QuotesApi.kt`**

```kotlin
package com.kenneth.stockcalc.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter

class QuotesApi(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    suspend fun fetchQuotes(symbols: List<String>): Map<String, QuoteDto> {
        if (symbols.isEmpty()) return emptyMap()
        return client.get("$baseUrl/api/quotes") {
            parameter("symbols", symbols.joinToString(","))
        }.body()
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.remote.QuotesApiTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/remote/ \
        android/app/src/test/kotlin/com/kenneth/stockcalc/data/remote/
git commit -m "feat(data): add QuotesApi + DTO with Ktor"
```

---

### Task 2.2: `QuotesRepositoryImpl`

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/remote/QuotesRepositoryImpl.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/data/remote/QuotesRepositoryImplTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.kenneth.stockcalc.data.remote

import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class QuotesRepositoryImplTest {
    @Test
    fun `maps DTOs into Quotes and filters invalid prices`() = runTest {
        val api = mockk<QuotesApi>()
        coEvery { api.fetchQuotes(any()) } returns mapOf(
            "AAPL" to QuoteDto(c = 180.0, d = 1.0, dp = 0.5, t = 1714000000L),
            "BAD"  to QuoteDto(c = 0.0, error = "not found"),
        )
        val repo = QuotesRepositoryImpl(api)
        val result = repo.fetch(listOf("AAPL", "BAD")).getOrThrow()
        assertEquals(1, result.size)
        assertTrue(result.containsKey("AAPL"))
        assertEquals(180.0, result["AAPL"]?.price)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.remote.QuotesRepositoryImplTest"`
Expected: FAIL with "unresolved reference: QuotesRepositoryImpl".

- [ ] **Step 3: Write `QuotesRepositoryImpl.kt`**

```kotlin
package com.kenneth.stockcalc.data.remote

import com.kenneth.stockcalc.domain.model.Quote
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import kotlinx.datetime.Instant
import javax.inject.Inject

class QuotesRepositoryImpl @Inject constructor(
    private val api: QuotesApi,
) : QuotesRepository {
    override suspend fun fetch(symbols: List<String>): Result<Map<String, Quote>> = runCatching {
        val dtos = api.fetchQuotes(symbols)
        dtos.mapNotNull { (symbol, dto) ->
            if (dto.error != null || dto.c <= 0.0) null
            else symbol to Quote(
                symbol = symbol,
                price = dto.c,
                change = dto.d,
                changePercent = dto.dp,
                updatedAt = Instant.fromEpochSeconds(if (dto.t > 0) dto.t else System.currentTimeMillis() / 1000),
            )
        }.toMap()
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.remote.QuotesRepositoryImplTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/remote/QuotesRepositoryImpl.kt \
        android/app/src/test/kotlin/com/kenneth/stockcalc/data/remote/QuotesRepositoryImplTest.kt
git commit -m "feat(data): add QuotesRepositoryImpl mapping DTO to Quote"
```

---

### Task 2.3: Trade DTO + TradeMapper

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/TradeDto.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/TradeMapper.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/data/supabase/TradeMapperTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import kotlinx.datetime.Instant
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class TradeMapperTest {
    private val now = Instant.parse("2026-04-23T02:00:00Z")

    private val domain = Trade(
        id = "00000000-0000-0000-0000-000000000001",
        symbol = "AAPL",
        entryPrice = 100.0,
        shares = 10,
        initialStopLoss = 90.0,
        currentStopLoss = 92.0,
        targetPrice = 120.0,
        status = TradeStatus.OPEN,
        riskAmount = 100.0,
        createdAt = now,
        stopLossHistory = listOf(StopLossEntry(90.0, now, "初始止損")),
    )

    @Test
    fun `toDto maps camelCase to snake_case`() {
        val dto = TradeMapper.toDto(domain, userId = "user-1")
        assertEquals("user-1", dto.userId)
        assertEquals("AAPL", dto.symbol)
        assertEquals(100.0, dto.entryPrice)
        assertEquals(10, dto.shares)
        assertEquals(90.0, dto.initialStopLoss)
        assertEquals(92.0, dto.currentStopLoss)
        assertEquals(120.0, dto.targetPrice)
        assertEquals("open", dto.status)
        assertEquals(1, dto.stopLossHistory.size)
    }

    @Test
    fun `toDomain maps snake_case to camelCase`() {
        val dto = TradeDto(
            id = "00000000-0000-0000-0000-000000000001",
            userId = "user-1",
            symbol = "0700.HK",
            entryPrice = 320.0,
            shares = 5,
            initialStopLoss = 310.0,
            currentStopLoss = 315.0,
            targetPrice = 340.0,
            status = "closed",
            riskAmount = 50.0,
            createdAt = "2026-04-23T02:00:00Z",
            stopLossHistory = emptyList(),
            exitPrice = 335.0,
            pnl = 75.0,
            closedAt = "2026-04-23T03:00:00Z",
        )
        val trade = TradeMapper.toDomain(dto)
        assertEquals(TradeStatus.CLOSED, trade.status)
        assertEquals(335.0, trade.exitPrice)
        assertEquals("0700.HK", trade.symbol)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.supabase.TradeMapperTest"`
Expected: FAIL.

- [ ] **Step 3: Write `TradeDto.kt`**

```kotlin
package com.kenneth.stockcalc.data.supabase

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StopLossEntryDto(
    val price: Double,
    val date: String,
    val note: String,
)

@Serializable
data class TradeDto(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val symbol: String,
    @SerialName("entry_price") val entryPrice: Double,
    val shares: Int,
    @SerialName("initial_stop_loss") val initialStopLoss: Double,
    @SerialName("current_stop_loss") val currentStopLoss: Double,
    @SerialName("target_price") val targetPrice: Double? = null,
    val status: String,
    @SerialName("risk_amount") val riskAmount: Double,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("stop_loss_history") val stopLossHistory: List<StopLossEntryDto> = emptyList(),
    @SerialName("exit_price") val exitPrice: Double? = null,
    val pnl: Double? = null,
    @SerialName("closed_at") val closedAt: String? = null,
)
```

- [ ] **Step 4: Write `TradeMapper.kt`**

```kotlin
package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import kotlinx.datetime.Instant
import java.util.UUID

object TradeMapper {
    fun toDto(trade: Trade, userId: String): TradeDto = TradeDto(
        id = trade.id.takeIf { it.isNotBlank() },
        userId = userId,
        symbol = trade.symbol,
        entryPrice = trade.entryPrice,
        shares = trade.shares,
        initialStopLoss = trade.initialStopLoss,
        currentStopLoss = trade.currentStopLoss,
        targetPrice = trade.targetPrice,
        status = trade.status.name.lowercase(),
        riskAmount = trade.riskAmount,
        createdAt = trade.createdAt.toString(),
        stopLossHistory = trade.stopLossHistory.map {
            StopLossEntryDto(it.price, it.date.toString(), it.note)
        },
        exitPrice = trade.exitPrice,
        pnl = trade.pnl,
        closedAt = trade.closedAt?.toString(),
    )

    fun toDomain(dto: TradeDto): Trade = Trade(
        id = dto.id ?: UUID.randomUUID().toString(),
        symbol = dto.symbol,
        entryPrice = dto.entryPrice,
        shares = dto.shares,
        initialStopLoss = dto.initialStopLoss,
        currentStopLoss = dto.currentStopLoss,
        targetPrice = dto.targetPrice,
        status = when (dto.status.lowercase()) {
            "closed" -> TradeStatus.CLOSED
            else -> TradeStatus.OPEN
        },
        riskAmount = dto.riskAmount,
        createdAt = dto.createdAt?.let { Instant.parse(it) } ?: Instant.DISTANT_PAST,
        stopLossHistory = dto.stopLossHistory.map {
            StopLossEntry(it.price, Instant.parse(it.date), it.note)
        },
        exitPrice = dto.exitPrice,
        pnl = dto.pnl,
        closedAt = dto.closedAt?.let { Instant.parse(it) },
    )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.data.supabase.TradeMapperTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/ \
        android/app/src/test/kotlin/com/kenneth/stockcalc/data/supabase/
git commit -m "feat(data): add TradeDto + mapper between domain and Supabase"
```

---

### Task 2.4: Supabase provider + auth repository

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseProvider.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseAuthRepositoryImpl.kt`

- [ ] **Step 1: Write `SupabaseProvider.kt`**

```kotlin
package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseProvider {
    fun create(): SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
    ) {
        install(Auth)
        install(Postgrest)
    }
}
```

- [ ] **Step 2: Write `SupabaseAuthRepositoryImpl.kt`**

```kotlin
package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.AuthUser
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class SupabaseAuthRepositoryImpl @Inject constructor(
    private val client: SupabaseClient,
) : AuthRepository {
    override val currentUser: Flow<AuthUser?> =
        client.auth.sessionStatus.map { status ->
            val session = (status as? io.github.jan.supabase.gotrue.SessionStatus.Authenticated)?.session
            session?.user?.let { AuthUser(id = it.id, email = it.email.orEmpty()) }
        }

    override suspend fun signIn(email: String, password: String): Result<Unit> = runCatching {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun signUp(email: String, password: String): Result<Unit> = runCatching {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun signOut() {
        client.auth.signOut()
    }
}
```

- [ ] **Step 3: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseProvider.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseAuthRepositoryImpl.kt
git commit -m "feat(data): add Supabase client provider and auth repository"
```

---

### Task 2.5: `SupabaseTradesRepositoryImpl`

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseTradesRepositoryImpl.kt`

- [ ] **Step 1: Write the class**

```kotlin
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
        client.postgrest.from("trades").update(TradeMapper.toDto(trade, userId)) {
            filter {
                eq("id", trade.id)
                eq("user_id", userId)
            }
        }
        _trades.value = _trades.value.map { if (it.id == trade.id) trade else it }
    }

    override suspend fun delete(id: String): Result<Unit> = runCatching {
        val userId = requireNotNull(auth.currentUser.first()?.id) { "not authenticated" }
        client.postgrest.from("trades").delete {
            filter {
                eq("id", id)
                eq("user_id", userId)
            }
        }
        _trades.value = _trades.value.filterNot { it.id == id }
    }
}
```

- [ ] **Step 2: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/supabase/SupabaseTradesRepositoryImpl.kt
git commit -m "feat(data): add SupabaseTradesRepository with CRUD and cache flow"
```

---

### Task 2.6: DataStore preferences + local trades fallback

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/local/PreferencesRepositoryImpl.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/local/LocalTradesRepositoryImpl.kt`

- [ ] **Step 1: Write `PreferencesRepositoryImpl.kt`**

```kotlin
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
```

- [ ] **Step 2: Write `LocalTradesRepositoryImpl.kt`**

```kotlin
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
```

- [ ] **Step 3: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/local/
git commit -m "feat(data): add DataStore preferences + local trades fallback"
```

---

### Task 2.7: `CompositeTradesRepository`

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/data/CompositeTradesRepository.kt`

- [ ] **Step 1: Write the class**

```kotlin
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
```

- [ ] **Step 2: Verify compile**

Run: `./gradlew :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/data/CompositeTradesRepository.kt
git commit -m "feat(data): add CompositeTradesRepository routing by auth state"
```

---

### Task 2.8: Hilt modules

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/di/AppModule.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/di/RepositoryModule.kt`

- [ ] **Step 1: Write `AppModule.kt`**

```kotlin
package com.kenneth.stockcalc.di

import com.kenneth.stockcalc.BuildConfig
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
    }

    @Provides @Singleton
    fun provideQuotesApi(client: HttpClient): QuotesApi =
        QuotesApi(client, baseUrl = BuildConfig.QUOTES_BASE_URL)

    @Provides @Singleton
    fun provideSupabaseClient(): SupabaseClient = SupabaseProvider.create()
}
```

- [ ] **Step 2: Write `RepositoryModule.kt`**

```kotlin
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
```

- [ ] **Step 3: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/di/
git commit -m "feat(di): wire Hilt modules for Ktor, Supabase, and repositories"
```

---

## Phase 3 — UI: theme, navigation shell, currency toggle

### Task 3.1: Material 3 theme

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/theme/Color.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/theme/Type.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/theme/Theme.kt`

- [ ] **Step 1: Write `Color.kt`**

```kotlin
package com.kenneth.stockcalc.ui.theme

import androidx.compose.ui.graphics.Color

val Slate950 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Slate400 = Color(0xFF94A3B8)
val Slate200 = Color(0xFFE2E8F0)
val EmeraldAccent = Color(0xFF10B981)
val RoseLoss = Color(0xFFF43F5E)
val AmberRiskFree = Color(0xFFFBBF24)
```

- [ ] **Step 2: Write `Type.kt`**

```kotlin
package com.kenneth.stockcalc.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val AppTypography = Typography(
    headlineSmall = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.sp),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium),
)
```

- [ ] **Step 3: Write `Theme.kt`**

```kotlin
package com.kenneth.stockcalc.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = EmeraldAccent,
    onPrimary = Slate950,
    background = Slate950,
    onBackground = Slate200,
    surface = Slate800,
    onSurface = Slate200,
    surfaceVariant = Slate700,
    onSurfaceVariant = Slate400,
    error = RoseLoss,
    onError = Slate950,
)

@Composable
fun StockCalcTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, typography = AppTypography, content = content)
}
```

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/theme/
git commit -m "feat(ui): add StockCalc Material 3 dark theme"
```

---

### Task 3.2: Currency chip component

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/CurrencyChip.kt`

- [ ] **Step 1: Write the component**

```kotlin
package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Currency

@Composable
fun CurrencyChip(
    current: Currency,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    AssistChip(
        modifier = modifier.padding(horizontal = 8.dp),
        onClick = onToggle,
        label = { Text(current.name) },
        colors = AssistChipDefaults.assistChipColors(),
    )
}
```

- [ ] **Step 2: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/CurrencyChip.kt
git commit -m "feat(ui): add CurrencyChip toggle component"
```

---

### Task 3.3: Navigation shell with bottom tabs

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt`
- Modify: `android/app/src/main/kotlin/com/kenneth/stockcalc/MainActivity.kt`

- [ ] **Step 1: Write `AppNavigation.kt` (temporary screens, replaced in later tasks)**

```kotlin
package com.kenneth.stockcalc.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController

sealed class Tab(val route: String, val labelRes: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    data object Calculator : Tab("calculator", com.kenneth.stockcalc.R.string.tab_calculator, Icons.Default.Calculate)
    data object Trades : Tab("trades", com.kenneth.stockcalc.R.string.tab_trades, Icons.Default.ShowChart)
    data object History : Tab("history", com.kenneth.stockcalc.R.string.tab_history, Icons.Default.History)
}

@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val tabs = listOf(Tab.Calculator, Tab.Trades, Tab.History)
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Scaffold(
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = backStack?.destination?.hierarchy?.any { it.route == tab.route } == true,
                        onClick = {
                            if (currentRoute != tab.route) {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(androidx.compose.ui.res.stringResource(tab.labelRes)) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Tab.Calculator.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Tab.Calculator.route) { Text("Calculator placeholder") }
            composable(Tab.Trades.route) { Text("Trades placeholder") }
            composable(Tab.History.route) { Text("History placeholder") }
        }
    }
}
```

- [ ] **Step 2: Replace `MainActivity.kt`**

```kotlin
package com.kenneth.stockcalc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.kenneth.stockcalc.ui.navigation.AppNavigation
import com.kenneth.stockcalc.ui.theme.StockCalcTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            StockCalcTheme { AppNavigation() }
        }
    }
}
```

- [ ] **Step 3: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/MainActivity.kt
git commit -m "feat(ui): add navigation shell with three bottom tabs"
```

---

## Phase 4 — Calculator feature

### Task 4.1: Calculator UI state + ViewModel (TDD)

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/calculator/CalculatorUiState.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/calculator/CalculatorViewModel.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/ui/calculator/CalculatorViewModelTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.kenneth.stockcalc.ui.calculator

import app.cash.turbine.test
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCase
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CalculatorViewModelTest {
    private val useCase = CalculatePositionUseCase()
    private val prefs = mockk<PreferencesRepository>(relaxed = true)
    private val trades = mockk<TradesRepository>(relaxed = true)

    @BeforeEach fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @AfterEach fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `updates result when inputs are valid`() = runTest {
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        val vm = CalculatorViewModel(useCase, prefs, trades)
        vm.onCapitalChange("10000")
        vm.onSymbolChange("AAPL")
        vm.onBuyPriceChange("100")
        vm.onStopLossChange("90")
        vm.onMaxLossPercentChange("1")

        vm.uiState.test {
            val latest = expectMostRecentItem()
            assertTrue(latest.result is CalculationResult.Success)
            val calc = (latest.result as CalculationResult.Success).calculation
            assertEquals(10, calc.shares)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `addTrade persists to repository`() = runTest {
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        val tradeSlot = slot<Trade>()
        coEvery { trades.add(capture(tradeSlot)) } coAnswers { Result.success(tradeSlot.captured) }

        val vm = CalculatorViewModel(useCase, prefs, trades)
        vm.onCapitalChange("10000")
        vm.onSymbolChange("AAPL")
        vm.onBuyPriceChange("100")
        vm.onStopLossChange("90")
        vm.onMaxLossPercentChange("1")
        vm.onAddTrade()

        coVerify { trades.add(any()) }
        assertEquals("AAPL", tradeSlot.captured.symbol)
        assertEquals(10, tradeSlot.captured.shares)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.ui.calculator.CalculatorViewModelTest"`
Expected: FAIL with "unresolved reference: CalculatorViewModel".

- [ ] **Step 3: Write `CalculatorUiState.kt`**

```kotlin
package com.kenneth.stockcalc.ui.calculator

import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.Currency

enum class StopLossMode { PRICE, PERCENT }

data class CalculatorUiState(
    val capital: String = "128000",
    val symbol: String = "",
    val buyPrice: String = "",
    val stopLossMode: StopLossMode = StopLossMode.PRICE,
    val stopLoss: String = "",
    val stopLossPercent: String = "",
    val maxLossPercent: String = "0.5",
    val targetPrice: String = "",
    val displayCurrency: Currency = Currency.USD,
    val result: CalculationResult = CalculationResult.Incomplete,
    val savedTradeId: String? = null,
)
```

- [ ] **Step 4: Write `CalculatorViewModel.kt`**

```kotlin
package com.kenneth.stockcalc.ui.calculator

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.CalculationResult
import com.kenneth.stockcalc.domain.model.StopLossEntry
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import com.kenneth.stockcalc.domain.usecase.CalculatePositionUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class CalculatorViewModel @Inject constructor(
    private val calculate: CalculatePositionUseCase,
    private val prefs: PreferencesRepository,
    private val trades: TradesRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(CalculatorUiState())
    val uiState: StateFlow<CalculatorUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            prefs.displayCurrency.collect { c ->
                _uiState.update { it.copy(displayCurrency = c) }
                recalc()
            }
        }
    }

    fun onCapitalChange(v: String) { update { copy(capital = v) } }
    fun onSymbolChange(v: String) { update { copy(symbol = v.uppercase()) } }
    fun onBuyPriceChange(v: String) { update { copy(buyPrice = v) } }
    fun onStopLossChange(v: String) { update { copy(stopLoss = v) } }
    fun onStopLossPercentChange(v: String) { update { copy(stopLossPercent = v) } }
    fun onStopLossModeChange(m: StopLossMode) { update { copy(stopLossMode = m) } }
    fun onMaxLossPercentChange(v: String) { update { copy(maxLossPercent = v) } }
    fun onTargetPriceChange(v: String) { update { copy(targetPrice = v) } }

    fun onAddTrade() {
        val s = _uiState.value
        val success = s.result as? CalculationResult.Success ?: return
        val calc = success.calculation
        if (s.symbol.isBlank()) return
        val newTrade = Trade(
            id = UUID.randomUUID().toString(),
            symbol = s.symbol.trim().uppercase(),
            entryPrice = s.buyPrice.toDouble(),
            shares = calc.shares,
            initialStopLoss = calc.actualStopLoss,
            currentStopLoss = calc.actualStopLoss,
            targetPrice = s.targetPrice.toDoubleOrNull(),
            status = TradeStatus.OPEN,
            riskAmount = calc.actualRisk,
            createdAt = Clock.System.now(),
            stopLossHistory = listOf(StopLossEntry(calc.actualStopLoss, Clock.System.now(), "初始止損")),
        )
        viewModelScope.launch {
            trades.add(newTrade).onSuccess { saved ->
                _uiState.update {
                    CalculatorUiState(
                        displayCurrency = it.displayCurrency,
                        capital = it.capital,
                        maxLossPercent = it.maxLossPercent,
                        savedTradeId = saved.id,
                    )
                }
            }
        }
    }

    private fun update(transform: CalculatorUiState.() -> CalculatorUiState) {
        _uiState.update(transform)
        recalc()
    }

    private fun recalc() {
        val s = _uiState.value
        val capital = s.capital.toDoubleOrNull()
        val buy = s.buyPrice.toDoubleOrNull()
        val maxLoss = s.maxLossPercent.toDoubleOrNull()
        val stopLoss = when (s.stopLossMode) {
            StopLossMode.PRICE -> s.stopLoss.toDoubleOrNull()
            StopLossMode.PERCENT -> {
                val pct = s.stopLossPercent.toDoubleOrNull()
                if (pct != null && buy != null) buy * (1 - pct / 100.0) else null
            }
        }
        val target = s.targetPrice.toDoubleOrNull()

        val result = calculate(
            capital = capital,
            displayCurrency = s.displayCurrency,
            symbol = s.symbol,
            buyPrice = buy,
            stopLoss = stopLoss,
            maxLossPercent = maxLoss,
            targetPrice = target,
        )
        _uiState.update { it.copy(result = result) }
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.ui.calculator.CalculatorViewModelTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/calculator/ \
        android/app/src/test/kotlin/com/kenneth/stockcalc/ui/calculator/
git commit -m "feat(calculator): add UI state and ViewModel with TDD coverage"
```

---

### Task 4.2: Calculator screen composable

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/calculator/CalculatorScreen.kt`
- Modify: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt`

- [ ] **Step 1: Write `CalculatorScreen.kt`**

```kotlin
package com.kenneth.stockcalc.ui.calculator

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.R
import com.kenneth.stockcalc.domain.model.CalculationResult
import androidx.compose.ui.res.stringResource

@Composable
fun CalculatorScreen(
    onTradeAdded: () -> Unit,
    viewModel: CalculatorViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffectOnTradeAdded(state.savedTradeId, onTradeAdded)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        NumberField(state.capital, viewModel::onCapitalChange, stringResource(R.string.label_capital))
        OutlinedTextField(
            value = state.symbol,
            onValueChange = viewModel::onSymbolChange,
            label = { Text(stringResource(R.string.label_symbol)) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        NumberField(state.buyPrice, viewModel::onBuyPriceChange, stringResource(R.string.label_buy_price))

        SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
            val options = listOf(StopLossMode.PRICE, StopLossMode.PERCENT)
            options.forEachIndexed { index, mode ->
                SegmentedButton(
                    shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
                    selected = state.stopLossMode == mode,
                    onClick = { viewModel.onStopLossModeChange(mode) },
                    label = { Text(if (mode == StopLossMode.PRICE) "價格" else "%") },
                )
            }
        }
        if (state.stopLossMode == StopLossMode.PRICE) {
            NumberField(state.stopLoss, viewModel::onStopLossChange, stringResource(R.string.label_stop_loss))
        } else {
            NumberField(state.stopLossPercent, viewModel::onStopLossPercentChange, stringResource(R.string.label_stop_loss_percent))
        }
        NumberField(state.maxLossPercent, viewModel::onMaxLossPercentChange, stringResource(R.string.label_max_loss_percent))
        NumberField(state.targetPrice, viewModel::onTargetPriceChange, stringResource(R.string.label_target_price))

        ResultCard(state)

        Button(
            onClick = viewModel::onAddTrade,
            enabled = state.result is CalculationResult.Success && state.symbol.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text(stringResource(R.string.action_add_trade)) }
    }
}

@Composable
private fun NumberField(value: String, onChange: (String) -> Unit, label: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun ResultCard(state: CalculatorUiState) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            when (val r = state.result) {
                is CalculationResult.Incomplete -> Text("輸入完成後顯示結果")
                is CalculationResult.Error -> Text(r.message)
                is CalculationResult.Success -> {
                    val c = r.calculation
                    Text("股數: ${c.shares}")
                    Text("所需資金: ${formatMoney(c.requiredCapital, state.displayCurrency.name)}")
                    Text("實際風險: ${formatMoney(c.actualRisk, state.displayCurrency.name)} (${"%.2f".format(c.actualRiskPercent)}%)")
                    Text("資金使用: ${"%.2f".format(c.capitalUsagePercent)}%")
                    c.riskRewardRatio?.let { Text("RR: ${"%.2f".format(it)} · 潛在利潤 ${formatMoney(c.potentialProfit!!, state.displayCurrency.name)}") }
                    if (!c.canAfford) Text("⚠️ 資金不足")
                }
            }
        }
    }
}

private fun formatMoney(amount: Double, currency: String) =
    "$currency ${"%,.2f".format(amount)}"

@Composable
private fun LaunchedEffectOnTradeAdded(savedId: String?, callback: () -> Unit) {
    androidx.compose.runtime.LaunchedEffect(savedId) { if (savedId != null) callback() }
}
```

- [ ] **Step 2: Wire the screen into `AppNavigation.kt`**

Replace the `composable(Tab.Calculator.route) { Text("Calculator placeholder") }`
line with:

```kotlin
composable(Tab.Calculator.route) {
    com.kenneth.stockcalc.ui.calculator.CalculatorScreen(
        onTradeAdded = {
            nav.navigate(Tab.Trades.route) {
                popUpTo(nav.graph.startDestinationId) { saveState = true }
                launchSingleTop = true
                restoreState = true
            }
        }
    )
}
```

- [ ] **Step 3: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/calculator/CalculatorScreen.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt
git commit -m "feat(calculator): add CalculatorScreen composable and nav wiring"
```

---

## Phase 5 — Trades feature

### Task 5.1: Trades ViewModel with 60s polling

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/TradesUiState.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/TradesViewModel.kt`
- Create: `android/app/src/test/kotlin/com/kenneth/stockcalc/ui/trades/TradesViewModelTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
package com.kenneth.stockcalc.ui.trades

import app.cash.turbine.test
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Quote
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TradesViewModelTest {
    private val tradesRepo = mockk<TradesRepository>(relaxed = true)
    private val quotesRepo = mockk<QuotesRepository>(relaxed = true)
    private val prefs = mockk<PreferencesRepository>(relaxed = true)

    @BeforeEach fun setUp() { Dispatchers.setMain(UnconfinedTestDispatcher()) }
    @AfterEach fun tearDown() { Dispatchers.resetMain() }

    @Test
    fun `uiState contains open trades with current quotes`() = runTest {
        val open = sampleOpenTrade()
        coEvery { tradesRepo.trades } returns flowOf(listOf(open))
        coEvery { prefs.displayCurrency } returns flowOf(Currency.USD)
        coEvery { quotesRepo.fetch(listOf("AAPL")) } returns Result.success(
            mapOf("AAPL" to Quote("AAPL", 110.0, 1.0, 0.9, Clock.System.now()))
        )

        val vm = TradesViewModel(tradesRepo, quotesRepo, prefs)

        vm.uiState.test {
            val latest = expectMostRecentItem()
            assertEquals(1, latest.items.size)
            assertEquals(110.0, latest.items.first().currentPrice)
            cancelAndIgnoreRemainingEvents()
        }
    }

    private fun sampleOpenTrade() = Trade(
        id = "t1", symbol = "AAPL", entryPrice = 100.0, shares = 10,
        initialStopLoss = 90.0, currentStopLoss = 90.0, targetPrice = null,
        status = TradeStatus.OPEN, riskAmount = 100.0,
        createdAt = Instant.parse("2026-04-23T00:00:00Z"), stopLossHistory = emptyList(),
    )
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.ui.trades.TradesViewModelTest"`
Expected: FAIL.

- [ ] **Step 3: Write `TradesUiState.kt`**

```kotlin
package com.kenneth.stockcalc.ui.trades

import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade

data class TradeItem(
    val trade: Trade,
    val currentPrice: Double?,
    val change: Double?,
    val changePercent: Double?,
    val unrealizedPnl: Double?,
    val unrealizedPnlPercent: Double?,
    val isRiskFree: Boolean,
)

data class TradesUiState(
    val items: List<TradeItem> = emptyList(),
    val displayCurrency: Currency = Currency.USD,
    val loading: Boolean = false,
    val error: String? = null,
)
```

- [ ] **Step 4: Write `TradesViewModel.kt`**

```kotlin
package com.kenneth.stockcalc.ui.trades

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.QuotesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import javax.inject.Inject

@HiltViewModel
class TradesViewModel @Inject constructor(
    private val tradesRepo: TradesRepository,
    private val quotesRepo: QuotesRepository,
    private val prefs: PreferencesRepository,
) : ViewModel() {
    private val _quotes = MutableStateFlow<Map<String, com.kenneth.stockcalc.domain.model.Quote>>(emptyMap())

    val uiState: StateFlow<TradesUiState> =
        combine(tradesRepo.trades, _quotes, prefs.displayCurrency) { trades, quotes, ccy ->
            TradesUiState(
                items = trades.filter { it.status == TradeStatus.OPEN }.map { t -> toItem(t, quotes[t.symbol], ccy) },
                displayCurrency = ccy,
            )
        }.let { flow ->
            MutableStateFlow(TradesUiState()).also { state ->
                flow.onEach { state.value = it }.launchIn(viewModelScope)
            }
        }.asStateFlow()

    private var pollJob: Job? = null

    init {
        viewModelScope.launch { tradesRepo.refresh() }
        startPolling()
    }

    fun refresh() = viewModelScope.launch {
        tradesRepo.refresh()
        fetchQuotesOnce()
    }

    fun updateStopLoss(tradeId: String, newStopLoss: Double) = viewModelScope.launch {
        val current = uiState.value.items.firstOrNull { it.trade.id == tradeId }?.trade ?: return@launch
        val isRiskFree = newStopLoss >= current.entryPrice
        val updated = current.copy(
            currentStopLoss = newStopLoss,
            stopLossHistory = current.stopLossHistory + com.kenneth.stockcalc.domain.model.StopLossEntry(
                price = newStopLoss,
                date = Clock.System.now(),
                note = if (isRiskFree) "✅ Risk Free!" else "推高止損",
            ),
        )
        tradesRepo.update(updated)
    }

    fun closeTrade(tradeId: String, exitPrice: Double) = viewModelScope.launch {
        val current = uiState.value.items.firstOrNull { it.trade.id == tradeId }?.trade ?: return@launch
        val pnl = (exitPrice - current.entryPrice) * current.shares
        val updated = current.copy(
            status = TradeStatus.CLOSED,
            exitPrice = exitPrice,
            pnl = pnl,
            closedAt = Clock.System.now(),
        )
        tradesRepo.update(updated)
    }

    fun deleteTrade(tradeId: String) = viewModelScope.launch {
        tradesRepo.delete(tradeId)
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (true) {
                fetchQuotesOnce()
                delay(60_000)
            }
        }
    }

    private suspend fun fetchQuotesOnce() {
        val symbols = uiState.value.items.map { it.trade.symbol }.distinct()
        if (symbols.isEmpty()) return
        quotesRepo.fetch(symbols).onSuccess { _quotes.value = _quotes.value + it }
    }

    private fun toItem(trade: Trade, quote: com.kenneth.stockcalc.domain.model.Quote?, display: Currency): TradeItem {
        val priceNative = quote?.price
        val pnlNative = if (priceNative != null) (priceNative - trade.entryPrice) * trade.shares else null
        val pnlDisplay = pnlNative?.let { Currency.convert(it, trade.nativeCurrency, display) }
        val pnlPct = if (priceNative != null) (priceNative - trade.entryPrice) / trade.entryPrice * 100 else null
        return TradeItem(
            trade = trade,
            currentPrice = priceNative,
            change = quote?.change,
            changePercent = quote?.changePercent,
            unrealizedPnl = pnlDisplay,
            unrealizedPnlPercent = pnlPct,
            isRiskFree = trade.isRiskFree,
        )
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `./gradlew :app:testDebugUnitTest --tests "com.kenneth.stockcalc.ui.trades.TradesViewModelTest"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/ \
        android/app/src/test/kotlin/com/kenneth/stockcalc/ui/trades/
git commit -m "feat(trades): ViewModel with 60s quote polling and mutation actions"
```

---

### Task 5.2: Trades screen + card + dialogs

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/TradeCard.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/RiskFreeBadge.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/UpdateStopLossDialog.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/CloseTradeDialog.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/TradesScreen.kt`
- Modify: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt`

- [ ] **Step 1: Write `RiskFreeBadge.kt`**

```kotlin
package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.ui.theme.AmberRiskFree
import com.kenneth.stockcalc.ui.theme.Slate950

@Composable
fun RiskFreeBadge(modifier: Modifier = Modifier) {
    Text(
        text = "✅ Risk Free",
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(AmberRiskFree)
            .padding(horizontal = 8.dp, vertical = 2.dp),
        color = Slate950,
    )
}
```

- [ ] **Step 2: Write `TradeCard.kt`**

```kotlin
package com.kenneth.stockcalc.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss
import com.kenneth.stockcalc.ui.trades.TradeItem

@Composable
fun TradeCard(
    item: TradeItem,
    displayCurrency: Currency,
    onUpdateStopLoss: () -> Unit,
    onClose: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(item.trade.symbol, style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
                if (item.isRiskFree) RiskFreeBadge()
            }
            val native = item.trade.nativeCurrency.name
            Text("Entry: $native ${"%.2f".format(item.trade.entryPrice)}  ·  Shares: ${item.trade.shares}")
            Text("Stop: $native ${"%.2f".format(item.trade.currentStopLoss)}")
            item.currentPrice?.let { price ->
                Text("Current: $native ${"%.2f".format(price)}  (${"%+.2f".format(item.changePercent ?: 0.0)}%)")
            } ?: Text("Current: —")
            item.unrealizedPnl?.let { pnl ->
                val color = if (pnl >= 0) EmeraldAccent else RoseLoss
                Text(
                    "P&L: ${displayCurrency.name} ${"%,.2f".format(pnl)}  (${"%+.2f".format(item.unrealizedPnlPercent ?: 0.0)}%)",
                    color = color,
                )
            }
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onUpdateStopLoss) { Text("推高止損") }
                TextButton(onClick = onClose) { Text("平倉") }
                TextButton(onClick = onDelete) { Text("刪除", color = Color.Red) }
            }
        }
    }
}
```

- [ ] **Step 3: Write `UpdateStopLossDialog.kt`**

```kotlin
package com.kenneth.stockcalc.ui.trades

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

@Composable
fun UpdateStopLossDialog(
    tradeSymbol: String,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit,
) {
    var input by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("推高止損 · $tradeSymbol") },
        text = {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                label = { Text("新止損價") },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(onClick = {
                input.toDoubleOrNull()?.let { onConfirm(it) }
            }) { Text("確認") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}
```

- [ ] **Step 4: Write `CloseTradeDialog.kt`**

```kotlin
package com.kenneth.stockcalc.ui.trades

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

@Composable
fun CloseTradeDialog(
    tradeSymbol: String,
    onConfirm: (Double) -> Unit,
    onDismiss: () -> Unit,
) {
    var input by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("平倉 · $tradeSymbol") },
        text = {
            OutlinedTextField(
                value = input,
                onValueChange = { input = it },
                label = { Text("平倉價") },
                singleLine = true,
            )
        },
        confirmButton = {
            TextButton(onClick = {
                input.toDoubleOrNull()?.let { onConfirm(it) }
            }) { Text("確認") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("取消") } },
    )
}
```

- [ ] **Step 5: Write `TradesScreen.kt`**

```kotlin
package com.kenneth.stockcalc.ui.trades

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.ui.components.TradeCard

@Composable
fun TradesScreen(viewModel: TradesViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var updatingId by remember { mutableStateOf<String?>(null) }
    var closingId by remember { mutableStateOf<String?>(null) }

    if (state.items.isEmpty()) {
        Text(
            "尚無持倉",
            modifier = Modifier.padding(16.dp),
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items(state.items, key = { it.trade.id }) { item ->
            TradeCard(
                item = item,
                displayCurrency = state.displayCurrency,
                onUpdateStopLoss = { updatingId = item.trade.id },
                onClose = { closingId = item.trade.id },
                onDelete = { viewModel.deleteTrade(item.trade.id) },
            )
        }
    }

    updatingId?.let { id ->
        val symbol = state.items.firstOrNull { it.trade.id == id }?.trade?.symbol ?: ""
        UpdateStopLossDialog(
            tradeSymbol = symbol,
            onConfirm = {
                viewModel.updateStopLoss(id, it)
                updatingId = null
            },
            onDismiss = { updatingId = null },
        )
    }
    closingId?.let { id ->
        val symbol = state.items.firstOrNull { it.trade.id == id }?.trade?.symbol ?: ""
        CloseTradeDialog(
            tradeSymbol = symbol,
            onConfirm = {
                viewModel.closeTrade(id, it)
                closingId = null
            },
            onDismiss = { closingId = null },
        )
    }
}
```

- [ ] **Step 6: Wire into navigation — replace the `Trades` placeholder**

In `AppNavigation.kt` replace:

```kotlin
composable(Tab.Trades.route) { Text("Trades placeholder") }
```

with:

```kotlin
composable(Tab.Trades.route) { com.kenneth.stockcalc.ui.trades.TradesScreen() }
```

- [ ] **Step 7: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 8: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/TradeCard.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/components/RiskFreeBadge.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/trades/ \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt
git commit -m "feat(trades): TradesScreen with cards, update stop, close and delete"
```

---

## Phase 6 — History feature

### Task 6.1: History ViewModel + screen

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/history/HistoryViewModel.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/history/HistoryScreen.kt`
- Modify: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt`

- [ ] **Step 1: Write `HistoryViewModel.kt`**

```kotlin
package com.kenneth.stockcalc.ui.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.domain.model.TradeStatus
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import com.kenneth.stockcalc.domain.repository.TradesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class HistoryUiState(
    val closed: List<Trade> = emptyList(),
    val totalPnlDisplay: Double = 0.0,
    val displayCurrency: Currency = Currency.USD,
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    repo: TradesRepository,
    prefs: PreferencesRepository,
) : ViewModel() {
    val uiState: StateFlow<HistoryUiState> = combine(repo.trades, prefs.displayCurrency) { trades, ccy ->
        val closed = trades.filter { it.status == TradeStatus.CLOSED }
            .sortedByDescending { it.closedAt ?: it.createdAt }
        val total = closed.sumOf { t ->
            val pnl = t.pnl ?: 0.0
            Currency.convert(pnl, t.nativeCurrency, ccy)
        }
        HistoryUiState(closed = closed, totalPnlDisplay = total, displayCurrency = ccy)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HistoryUiState())
}
```

- [ ] **Step 2: Write `HistoryScreen.kt`**

```kotlin
package com.kenneth.stockcalc.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.model.Trade
import com.kenneth.stockcalc.ui.theme.EmeraldAccent
import com.kenneth.stockcalc.ui.theme.RoseLoss

@Composable
fun HistoryScreen(vm: HistoryViewModel = hiltViewModel()) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    if (state.closed.isEmpty()) {
        Text("尚無歷史紀錄", modifier = Modifier.padding(16.dp))
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { TotalCard(state.totalPnlDisplay, state.displayCurrency) }
        items(state.closed, key = { it.id }) { trade ->
            ClosedTradeCard(trade, state.displayCurrency)
        }
    }
}

@Composable
private fun TotalCard(total: Double, ccy: Currency) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            val color: Color = if (total >= 0) EmeraldAccent else RoseLoss
            Text("已實現 P&L 合計:", color = Color.Unspecified)
            Text("${ccy.name} ${"%,.2f".format(total)}", color = color)
        }
    }
}

@Composable
private fun ClosedTradeCard(t: Trade, displayCurrency: Currency) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            val native = t.nativeCurrency.name
            Text("${t.symbol} · ${t.shares} shares")
            Text("Entry: $native ${"%.2f".format(t.entryPrice)} · Exit: $native ${"%.2f".format(t.exitPrice ?: 0.0)}")
            val pnlNative = t.pnl ?: 0.0
            val pnlDisplay = Currency.convert(pnlNative, t.nativeCurrency, displayCurrency)
            val color = if (pnlDisplay >= 0) EmeraldAccent else RoseLoss
            Text("P&L: ${displayCurrency.name} ${"%,.2f".format(pnlDisplay)}", color = color)
        }
    }
}
```

- [ ] **Step 3: Wire into navigation**

Replace the `History` placeholder in `AppNavigation.kt`:

```kotlin
composable(Tab.History.route) { com.kenneth.stockcalc.ui.history.HistoryScreen() }
```

- [ ] **Step 4: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/history/ \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt
git commit -m "feat(history): add HistoryScreen with closed trades and P&L total"
```

---

## Phase 7 — Auth + currency toggle in TopAppBar

### Task 7.1: Auth ViewModel + bottom sheet

**Files:**
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/auth/AuthViewModel.kt`
- Create: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/auth/AuthBottomSheet.kt`

- [ ] **Step 1: Write `AuthViewModel.kt`**

```kotlin
package com.kenneth.stockcalc.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.AuthUser
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthMode { LOGIN, SIGNUP }

data class AuthUiState(
    val mode: AuthMode = AuthMode.LOGIN,
    val email: String = "",
    val password: String = "",
    val error: String? = null,
    val busy: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: AuthRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(AuthUiState())
    val ui: StateFlow<AuthUiState> = _ui.asStateFlow()

    val currentUser: StateFlow<AuthUser?> =
        auth.currentUser.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun onEmailChange(v: String) = _ui.update { copy(email = v) }
    fun onPasswordChange(v: String) = _ui.update { copy(password = v) }
    fun setMode(m: AuthMode) = _ui.update { copy(mode = m, error = null) }

    fun submit(onSuccess: () -> Unit) {
        val s = _ui.value
        _ui.update { copy(busy = true, error = null) }
        viewModelScope.launch {
            val r = when (s.mode) {
                AuthMode.LOGIN -> auth.signIn(s.email, s.password)
                AuthMode.SIGNUP -> auth.signUp(s.email, s.password)
            }
            r.onSuccess { onSuccess() }.onFailure { e ->
                _ui.update { copy(error = e.message ?: "Auth error", busy = false) }
            }
        }
    }

    fun signOut() = viewModelScope.launch { auth.signOut() }

    private inline fun MutableStateFlow<AuthUiState>.update(transform: AuthUiState.() -> AuthUiState) {
        value = value.transform()
    }
}
```

- [ ] **Step 2: Write `AuthBottomSheet.kt`**

```kotlin
package com.kenneth.stockcalc.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuthBottomSheet(
    onDismiss: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.ui.collectAsStateWithLifecycle()
    val sheetState = rememberModalBottomSheetState()
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                val modes = listOf(AuthMode.LOGIN, AuthMode.SIGNUP)
                modes.forEachIndexed { i, m ->
                    SegmentedButton(
                        shape = SegmentedButtonDefaults.itemShape(index = i, count = modes.size),
                        selected = state.mode == m,
                        onClick = { viewModel.setMode(m) },
                        label = { Text(if (m == AuthMode.LOGIN) "登入" else "註冊") },
                    )
                }
            }
            OutlinedTextField(
                value = state.email,
                onValueChange = viewModel::onEmailChange,
                label = { Text("Email") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = state.password,
                onValueChange = viewModel::onPasswordChange,
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth(),
            )
            state.error?.let { Text(it) }
            Button(
                onClick = { viewModel.submit(onDismiss) },
                enabled = !state.busy,
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (state.mode == AuthMode.LOGIN) "登入" else "註冊") }
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/auth/
git commit -m "feat(auth): add AuthViewModel and AuthBottomSheet"
```

---

### Task 7.2: TopAppBar with currency toggle and account button

**Files:**
- Modify: `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt`

- [ ] **Step 1: Update `AppNavigation.kt` to add `TopAppBar` and sheet state**

Replace the whole `AppNavigation` Composable body with:

```kotlin
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AppNavigation() {
    val nav = rememberNavController()
    val tabs = listOf(Tab.Calculator, Tab.Trades, Tab.History)
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    val authVm: com.kenneth.stockcalc.ui.auth.AuthViewModel = androidx.hilt.navigation.compose.hiltViewModel()
    val user by authVm.currentUser.collectAsStateWithLifecycle()

    val prefsVm: com.kenneth.stockcalc.ui.common.PreferencesViewModel = androidx.hilt.navigation.compose.hiltViewModel()
    val displayCurrency by prefsVm.displayCurrency.collectAsStateWithLifecycle()

    var showAuth by androidx.compose.runtime.saveable.rememberSaveable { androidx.compose.runtime.mutableStateOf(false) }

    androidx.compose.material3.Scaffold(
        topBar = {
            androidx.compose.material3.TopAppBar(
                title = { Text(androidx.compose.ui.res.stringResource(com.kenneth.stockcalc.R.string.app_name)) },
                actions = {
                    com.kenneth.stockcalc.ui.components.CurrencyChip(
                        current = displayCurrency,
                        onToggle = { prefsVm.toggle() },
                    )
                    if (user != null) {
                        androidx.compose.material3.TextButton(onClick = { authVm.signOut() }) { Text("登出") }
                    } else {
                        androidx.compose.material3.TextButton(onClick = { showAuth = true }) { Text("登入") }
                    }
                },
            )
        },
        bottomBar = {
            NavigationBar {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = backStack?.destination?.hierarchy?.any { it.route == tab.route } == true,
                        onClick = {
                            if (currentRoute != tab.route) {
                                nav.navigate(tab.route) {
                                    popUpTo(nav.graph.startDestinationId) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(androidx.compose.ui.res.stringResource(tab.labelRes)) },
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = Tab.Calculator.route,
            modifier = Modifier.padding(padding),
        ) {
            composable(Tab.Calculator.route) {
                com.kenneth.stockcalc.ui.calculator.CalculatorScreen(
                    onTradeAdded = {
                        nav.navigate(Tab.Trades.route) {
                            popUpTo(nav.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
            composable(Tab.Trades.route) { com.kenneth.stockcalc.ui.trades.TradesScreen() }
            composable(Tab.History.route) { com.kenneth.stockcalc.ui.history.HistoryScreen() }
        }
        if (showAuth) {
            com.kenneth.stockcalc.ui.auth.AuthBottomSheet(onDismiss = { showAuth = false })
        }
    }
}
```

(Add imports for `collectAsStateWithLifecycle` at the top of the file if missing.)

- [ ] **Step 2: Create `PreferencesViewModel.kt` for toggle wiring**

Create `android/app/src/main/kotlin/com/kenneth/stockcalc/ui/common/PreferencesViewModel.kt`:

```kotlin
package com.kenneth.stockcalc.ui.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kenneth.stockcalc.domain.model.Currency
import com.kenneth.stockcalc.domain.repository.PreferencesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PreferencesViewModel @Inject constructor(
    private val prefs: PreferencesRepository,
) : ViewModel() {
    val displayCurrency: StateFlow<Currency> =
        prefs.displayCurrency.stateIn(viewModelScope, SharingStarted.Eagerly, Currency.USD)

    fun toggle() = viewModelScope.launch {
        val next = if (prefs.displayCurrency.first() == Currency.USD) Currency.HKD else Currency.USD
        prefs.setDisplayCurrency(next)
    }
}
```

- [ ] **Step 3: Verify build**

Run: `./gradlew :app:assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/kotlin/com/kenneth/stockcalc/ui/navigation/AppNavigation.kt \
        android/app/src/main/kotlin/com/kenneth/stockcalc/ui/common/PreferencesViewModel.kt
git commit -m "feat(ui): TopAppBar with currency toggle and auth bottom sheet"
```

---

## Phase 8 — End-to-end verification + packaging

### Task 8.1: Full unit test pass

- [ ] **Step 1: Run all tests**

Run: `./gradlew :app:testDebugUnitTest`
Expected: All tests PASS.

- [ ] **Step 2: If anything fails, fix by editing the specific failing test's target
code — do not modify tests to match buggy implementation.**

- [ ] **Step 3: Commit any fixes**

```bash
git add -u
git commit -m "test: fix remaining unit test regressions"
```

---

### Task 8.2: Manual smoke test on device/emulator

- [ ] **Step 1: Install debug APK**

Run: `./gradlew :app:installDebug`
Expected: APK installed on connected device/emulator.

- [ ] **Step 2: Manually verify the golden path**

Walk through:

1. Calculator: `capital 10000 USD, symbol AAPL, buy 100, stop 90, maxLoss 1, target 120`
   → shares should display `10`, required capital `~1000 USD`, RR `2.00`.
2. Tap `加入追蹤` → app navigates to 持倉, card shows `AAPL · 10 shares`.
3. Toggle currency to HKD (top right). The card's per-share prices stay `USD`.
   Portfolio P&L and risk row change to `HKD`.
4. Tap `推高止損` on the AAPL card, enter `100`, confirm. Card shows `Risk Free` badge.
5. Tap `平倉`, enter `110`, confirm. Card disappears from 持倉.
6. Open 歷史 tab. Closed trade shows with P&L `USD 100` / `HKD 780` depending on toggle.
7. Login flow: tap `登入`, create a test account, verify that closing the app and
   reopening keeps the trades.

- [ ] **Step 3: If any step fails, open an issue and go back to the relevant task**

- [ ] **Step 4: No commit needed for a clean run.**

---

### Task 8.3: Release signing config + sideload APK

**Files:**
- Create: `android/app/keystore.properties.sample`
- Modify: `android/app/build.gradle.kts`

- [ ] **Step 1: Write `keystore.properties.sample`**

```
storeFile=../release.keystore
storePassword=REPLACE_ME
keyAlias=stockcalc
keyPassword=REPLACE_ME
```

- [ ] **Step 2: Add signing block to `app/build.gradle.kts`**

Inside the `android { ... }` block, before the `buildTypes` block, add:

```kotlin
val keystoreProps = java.util.Properties().apply {
    val f = rootProject.file("app/keystore.properties")
    if (f.exists()) load(f.inputStream())
}

signingConfigs {
    if (keystoreProps.isNotEmpty()) {
        create("release") {
            storeFile = file(keystoreProps["storeFile"] as String)
            storePassword = keystoreProps["storePassword"] as String
            keyAlias = keystoreProps["keyAlias"] as String
            keyPassword = keystoreProps["keyPassword"] as String
        }
    }
}
```

And update `buildTypes.release`:

```kotlin
release {
    isMinifyEnabled = true
    proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    if (keystoreProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
}
```

- [ ] **Step 3: Generate keystore (once, locally, NOT committed)**

Run:
```bash
keytool -genkey -v -keystore android/release.keystore \
  -alias stockcalc -keyalg RSA -keysize 2048 -validity 10000
cp android/app/keystore.properties.sample android/app/keystore.properties
# then fill in storePassword / keyPassword
```

- [ ] **Step 4: Add keystore files to .gitignore**

Append to `.gitignore`:

```
android/release.keystore
android/app/keystore.properties
android/build/
android/app/build/
android/.gradle/
android/local.properties
```

- [ ] **Step 5: Build release APK**

Run: `cd android && ./gradlew :app:assembleRelease`
Expected: `app/build/outputs/apk/release/app-release.apk` present and signed.

- [ ] **Step 6: Commit build and signing scaffolding**

```bash
git add android/app/build.gradle.kts android/app/keystore.properties.sample .gitignore
git commit -m "chore(android): add release signing config and gitignore entries"
```

---

## Spec coverage self-review

| Spec requirement | Implemented by |
|---|---|
| Clean Architecture three layers | Task 1.4 (interfaces), 2.1–2.8 (data), 4.x/5.x/6.x (UI) |
| Hilt DI | Task 2.8 |
| Jetpack Compose + Material 3 | Task 3.1, 4.2, 5.2, 6.1 |
| Navigation Compose with 3 bottom tabs | Task 3.3, 7.2 |
| Ktor → Vercel `/api/quotes` | Task 2.1, 2.2 |
| Supabase-kt auth + postgrest | Task 2.4, 2.5, 7.1 |
| DataStore preferences + local trades fallback | Task 2.6, 2.7 |
| Trade / Quote / Calculation domain models | Task 1.2 |
| `CalculatePositionUseCase` with currency-cross logic | Task 1.3 |
| 60s polling of open-trade quotes | Task 5.1 |
| Trailing stop, close, delete | Task 5.1, 5.2 |
| Risk-free detection (`currentStopLoss >= entryPrice`) | Task 1.2 (property), 5.1, 5.2 |
| Per-share prices native; dollar amounts follow toggle | Task 1.1, 1.3, 5.1, 5.2 |
| USD/HKD toggle persisted | Task 2.6, 7.2 |
| zh-HK UI strings | Task 0.2 |
| Supabase `trades` schema unchanged | Task 2.3 |
| Auth email/password via bottom sheet | Task 7.1, 7.2 |
| 80%+ test coverage target | Tasks 1.1, 1.3, 2.1, 2.2, 2.3, 4.1, 5.1 write tests first |
| APK sideload distribution | Task 8.3 |
| Min SDK 26 / Target SDK 35 / package `com.kenneth.stockcalc` | Task 0.2 |

No placeholders, no TBDs. All types are defined before they are consumed. Tests
precede implementation in phases 1, 2, 4, 5.
