# Task 8 Report: Calculator + Page + Header Account UI

## Build result
`pnpm build` — PASS (Next.js 16.1.1, Turbopack). Required an additional fix: `src/lib/supabaseClient.ts` previously threw at module-evaluation time when `NEXT_PUBLIC_SUPABASE_*` env vars were absent, causing SSG prerender to fail for `/[locale]`. Fixed by converting to a lazy Proxy singleton — client is created on first method call (always in `'use client'` components), so build-time SSR never triggers the throw.

## Test result
`pnpm test` — PASS: 5 test files, 33 tests, 0 failures. No new lib tests added (not required by spec).

## i18n keys added

**`calculator` namespace (both locales, 17 keys each):**
`title`, `symbol`, `capital`, `maxLoss`, `buyPrice`, `targetPrice`, `optional`, `stopLoss`, `price`, `percent`, `stopPricePlaceholder`, `suggestedShares`, `shares`, `requiredCapital`, `ofCapital`, `riskReward`, `stopPrice`, `riskAmount`, `potentialProfit`, `addTrade`

**`auth` namespace addition (both locales):**
`logout` / `登出`

## Math verification
AAPL / buy=150 / stop=145 / maxLoss=0.5% / capital=128000 / target=165:
- `riskPerShare` = 5, `maxLossAmount` = 640
- `shares` = floor(640/5) = **128** ✓
- `riskRewardRatio` = (165-150)/5 = **3.00** ✓
- `potentialProfit` = 128 × 15 = **$1,920** ✓

## How add-trade is wired
In `Calculator/handleAdd`: builds a `Trade` object with `id: Date.now()`, all fields matching legacy `addToTrades` exactly (including `stopLossHistory: [{ price: actualStopLoss, date: now, note: '初始止損' }]`), then calls `useTrades().addTrade(trade)`. `useTrades` routes to `SupabaseTradesRepository` when a Supabase session exists, or `LocalTradesRepository` (persisting under `stock-trades-v3` in localStorage) when not signed in. After the await, the Calculator resets `symbol`, `buyPrice`, `stopLoss`, `stopLossPercent`, `targetPrice` (capital/maxLoss persist as defaults).

## Concerns
None. The lazy Supabase client is the only non-spec change and is strictly necessary for the build to succeed without env vars in CI/local builds. The supabase proxy is backward-compatible — all existing callers (`useAuth`, `SupabaseTradesRepository`) work unchanged.

## Post-review fixes (Plan-2 review batch)

Four fixes applied in a single commit on top of this task's work:

1. **CRITICAL — supabaseClient Proxy method binding**: The `get` trap now uses `Reflect.get(client, prop, client)` and binds returned functions to the real client. This prevents `TypeError: Cannot read private member` when `@supabase/supabase-js` v2 private class fields are accessed with the wrong `this` receiver (the Proxy object).

2. **Field a11y**: `src/components/ui/Field.tsx` now calls `useId()` and wires `htmlFor={id}` on `<Label>` and `id={id}` on `<Input>`, establishing a proper label↔input association for screen readers.

3. **AuthModal error i18n**: Added `"error"` key to `auth` section of both `en.json` (`"Error"`) and `zh-HK.json` (`"錯誤"`). The catch block now uses `t('error')` instead of the hardcoded `'Error'` literal.

4. **Calculator strings/colors**: Added `"sizerTag": "Sizer"` to `calculator` section of both locales; `<CardTag>Sizer</CardTag>` is now `{t('sizerTag')}`. Added `accentText` color token to `ThemeColors` interface and both themes (`darkTheme: '#0a0b0d'`, `lightTheme: '#1a1c1e'`); replaced both `'#000'` active-text literals in `Seg` and `AddBtn` styled components with `theme.colors.accentText`.

**Verification**: `pnpm build` PASS, `pnpm test` 33/33 PASS, `pnpm exec tsc --noEmit` exit 0.
