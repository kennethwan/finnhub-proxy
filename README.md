# 倉位計算器 · Position Sizer

A risk-management trading dashboard (Next.js 16 + TypeScript + styled-components + jotai + next-intl).
Position sizing, live positions with NAV/exposure/drawdown, history, charts with key-level stop/target.

## Develop
- `pnpm install`
- copy `.env.example` → `.env` and fill the values
- `pnpm dev` → http://localhost:3000
- `pnpm test` (Vitest), `pnpm build`, `pnpm lint`

## Environment variables
| var | purpose | scope |
|---|---|---|
| `FINNHUB_API_KEY` | US quotes via Finnhub (`/api/quotes`) | server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | client |

`.HK` symbols are priced via yahoo-finance2; others via Finnhub. Charts use `/api/candles` (yahoo-finance2).

## Deploy (Vercel)
Vercel auto-detects Next.js. **Set the three env vars above in the Vercel project** (the same `/api/quotes` + `/api/candles` endpoints serve the Android app, so keep them stable). The `android/` directory is a separate Kotlin app and is ignored by the web build.

## Structure
`src/app/[locale]` (App Router + next-intl) · `src/components` · `src/store` (jotai) · `src/hooks` · `src/lib` (`finance`, `keyLevels`, `format` — pure + unit-tested) · `src/styles` (light/dark theme).
