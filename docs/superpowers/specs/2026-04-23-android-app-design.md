# 股票倉位計算器 — Android App Design

**Date:** 2026-04-23
**Status:** Approved for implementation planning
**Author:** Kenneth Wan

## Goal

Build a native Android app with 1:1 feature parity to the existing web app
(`/Users/kenneth/Downloads/finnhub-proxy`), reusing the existing Vercel
`/api/quotes` proxy and Supabase project (auth + `trades` table).

## Constraints

- **Framework:** Jetpack Compose (native Kotlin)
- **Backend:** Reuse existing Vercel quote proxy and Supabase instance — no
  schema changes to the `trades` table
- **Min SDK:** 26 (Android 8) — covers ~95% devices
- **Target SDK:** 35 (Android 15)
- **Package:** `com.kenneth.stockcalc`
- **Language:** UI strings in Traditional Chinese (zh-HK), same as web
- **Testing:** TDD workflow, 80%+ coverage target

## Architecture

Clean Architecture, three layers, per-feature module split.

```
┌─────────────────────────────────────────────┐
│  Android App (Jetpack Compose + Kotlin)     │
├─────────────────────────────────────────────┤
│  UI Layer     │ Compose screens + ViewModels│
│  Domain       │ UseCases + domain models    │
│  Data         │ Repositories                 │
│     ├─ remote │ Ktor → Vercel /api/quotes   │
│     ├─ auth   │ supabase-kt (gotrue)        │
│     ├─ db     │ supabase-kt (postgrest)     │
│     └─ local  │ DataStore (offline cache)   │
└─────────────────────────────────────────────┘
           │                    │
           ▼                    ▼
  Vercel /api/quotes      Supabase
  (Finnhub + Yahoo)       (auth + trades table)
```

### Module layout

```
app/
  src/main/kotlin/com/kenneth/stockcalc/
    MainActivity.kt
    StockCalcApp.kt
    di/                   // Hilt modules
    ui/
      calculator/         // CalculatorScreen + ViewModel
      trades/             // TradesScreen + ViewModel
      history/            // HistoryScreen + ViewModel
      auth/               // AuthBottomSheet + ViewModel
      components/         // Shared Composables
      theme/              // Material 3 theme, colors, typography
    domain/
      model/              // Trade, Quote, Calculation, ...
      usecase/            // CalculatePositionUseCase, ...
      repository/         // Repository interfaces
    data/
      remote/             // QuotesApi (Ktor)
      supabase/           // TradesRepository impl, AuthRepository impl
      local/              // DataStore impl for offline cache + prefs
      mapper/             // snake_case ⇄ camelCase
```

## Feature Parity Matrix

| Web feature | Android equivalent |
|---|---|
| Position size calculator | `CalculatorScreen` + `CalculatePositionUseCase` |
| Risk $ / RR ratio / capital usage breakdown | Part of `Calculation` domain model |
| Trade list with open/closed status | `TradesScreen` + `HistoryScreen` |
| Real-time quotes (60s poll) | `QuotesRepository.pollOpenTrades()` ticker Flow |
| Trailing stop update | `TradesViewModel.updateStopLoss()` |
| Risk-free detection | `isRiskFree = currentStopLoss >= entryPrice` |
| Close trade + P&L | `TradesViewModel.closeTrade()` |
| USD/HKD toggle | Top app bar toggle, persisted in DataStore |
| Supabase email/password auth | `AuthBottomSheet` — supabase-kt gotrue |
| localStorage fallback when logged out | DataStore-backed local `TradesRepository` |
| PWA/mobile UX | Native Material 3 with NavigationBar |

## Screens & Navigation

3 top-level destinations via Material 3 `NavigationBar`:

```
┌─────────────────────────────────────────┐
│  📈 股票倉位計算器      [USD/HKD] [👤]  │  ← TopAppBar
├─────────────────────────────────────────┤
│                                         │
│         (current screen)                │
│                                         │
├─────────────────────────────────────────┤
│  [🧮 計算機]  [📊 持倉]  [📜 歷史]       │  ← NavigationBar
└─────────────────────────────────────────┘
```

**CalculatorScreen**
- Inputs: capital, symbol, buy price, stop loss (price or % toggle),
  max loss %, target price
- Live result card: shares, actual risk, required capital, RR ratio, target gain %
- `加入追蹤` button → persists trade, navigates to 持倉

**TradesScreen (open trades)**
- Card list. Per card: symbol, entry, current price, P&L (red/green),
  current stop, risk-free badge when applicable
- Auto refresh every 60 s via `LaunchedEffect` + ticker `Flow`
- Pull-to-refresh
- Per-card actions: 推高止損 / 平倉 / swipe-to-delete

**HistoryScreen (closed trades)**
- Closed-trade list with realized P&L
- Monthly aggregate summary

**Auth**
- Not required for calculator use (localStorage mode)
- Modal bottom sheet for email + password login/signup (supabase-kt gotrue)

## Data Model

```kotlin
data class Trade(
    val id: String,                       // UUID
    val symbol: String,                   // "AAPL" / "0700.HK"
    val entryPrice: Double,
    val shares: Int,
    val initialStopLoss: Double,
    val currentStopLoss: Double,
    val targetPrice: Double?,
    val status: TradeStatus,              // OPEN / CLOSED
    val riskAmount: Double,
    val createdAt: Instant,
    val stopLossHistory: List<StopLossEntry>,
    val exitPrice: Double? = null,
    val pnl: Double? = null,
    val closedAt: Instant? = null,
)

data class StopLossEntry(val price: Double, val date: Instant, val note: String)
enum class TradeStatus { OPEN, CLOSED }

data class Quote(
    val price: Double,
    val change: Double,
    val changePercent: Double,
    val updatedAt: Instant,
)

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
)
```

**Supabase `trades` table** is reused as-is. The repository maps snake_case ⇄
camelCase; `stopLossHistory` maps to the `stop_loss_history jsonb` column
exactly like `loadTradesFromSupabase` in the web app.

## Currency Rules

- `EXCHANGE_RATE_HKD_USD = 7.8` — fixed constant (matches web)
- `symbolCurrency(sym: String): Currency = if (sym.endsWith(".HK")) HKD else USD`
- `displayCurrency` — user preference, persisted in DataStore
  (corresponds to web's `localStorage.display-currency`)

**Display rule (user-specified deviation from web):**

| Value type | Displayed as |
|---|---|
| Per-share prices — entry, current, stop loss, target | **Always native currency** (symbol rule) |
| Dollar amounts — P&L, risk $, capital, max-loss budget, position cost, aggregate totals | **Selected display currency** |

**Calculator flow with mixed currency:**
- User enters `capital` in the selected display currency
- User enters `buyPrice` / `stopLoss` / `targetPrice` in the stock's native currency
- When computing shares:
  - `maxLossDisplay = capital × maxLossPercent / 100` (in display currency)
  - `maxLossNative = convert(maxLossDisplay, from = displayCurrency, to = symbolCurrency(symbol))`
  - `shares = floor(maxLossNative / (buyPrice - stopLoss))`
  - `requiredCapitalNative = shares × buyPrice`
  - `requiredCapitalDisplay = convert(requiredCapitalNative, from = symbolCurrency, to = displayCurrency)`
  - All dollar-amount result fields are returned in `displayCurrency`

## Technology Choices

| Area | Choice |
|---|---|
| UI | Jetpack Compose + Material 3 |
| Navigation | Navigation Compose |
| DI | Hilt |
| Networking | Ktor Client (shared with supabase-kt) |
| Supabase SDK | `io.github.jan-tennert.supabase:postgrest-kt`, `gotrue-kt`, `realtime-kt` |
| Local storage | Jetpack DataStore (Proto) |
| Async | Kotlin Coroutines + Flow |
| Serialization | kotlinx.serialization |
| Date/time | kotlinx-datetime |
| Unit tests | JUnit 5 + MockK + Turbine |
| UI tests | Compose UI Test + Robolectric |
| Build | Gradle Kotlin DSL + version catalog |

## Error Handling

- **Quote fetch failure** — show cached price with red "未更新 Xm" badge, no crash
- **Supabase offline** — queue writes in DataStore, show "待同步" badge, flush on reconnect
- **Auth token expiry** — auto-refresh; if refresh fails, drop to localStorage mode
- **Stop loss ≥ entry** — inline error "止損價必須低於買入價" on CalculatorScreen
- **Mixed-currency portfolio** — per-card native-currency label; aggregate totals explicitly tagged `(HKD)` or `(USD)`

## Testing Strategy

TDD workflow, 80%+ coverage target, split by layer:

- **Unit tests (domain/data)** — `CalculatePositionUseCase` golden cases
  (including currency-cross cases), `TradesRepository` mapping, quote polling
  ticker, currency conversion
- **Integration tests** — Supabase calls against a test project or MockEngine
- **Compose UI tests** — CalculatorScreen input → result, TradesScreen card
  actions, auth bottom sheet flow

## Distribution

- **Phase 1:** Signed debug APK, sideload for personal use
- **Phase 2 (future):** Internal testing track on Play Store

## Out of Scope

Explicitly deferred (can be added later as separate specs):
- Push notifications for stop-loss / target triggers
- Home-screen widget for portfolio P&L
- Biometric unlock
- Material You dynamic color
- iOS / desktop ports

## Open Questions

None at time of writing. User approved all design sections interactively
before this document was produced.
