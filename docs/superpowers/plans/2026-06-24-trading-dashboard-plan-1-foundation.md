# Trading Dashboard — Plan 1: Foundation & Core Logic

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `finnhub-proxy` into a Next.js 16 app shell (matching `Nextjs-Template-2026`) with light/dark theming, zh-HK/en i18n, ported `/api/quotes` + `/api/candles` route handlers, a Supabase client, and fully unit-tested pure-logic libraries (`finance.ts`, `keyLevels.ts`, `format.ts`).

**Architecture:** App Router under `src/app/[locale]`, styled-components (theme-driven) as primary styling with Tailwind v4 for utilities, jotai for state, next-intl for routing/i18n. All financial math and key-level detection live in `src/lib/` as framework-free pure functions with Vitest tests (≥80% coverage). API routes reuse the existing Finnhub/Yahoo logic on the Node runtime.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, styled-components 6, Tailwind v4 (`@tailwindcss/postcss`), jotai, next-intl, axios, lucide-react, @supabase/supabase-js, yahoo-finance2, Vitest.

## Global Constraints

- Mirror `~/Repositories/Nextjs-Template-2026` conventions: `@/*` → `./src/*`; `next.config.ts` uses `createNextIntlPlugin()` + `compiler.styledComponents: true`; styled-components SSR via `src/styles/registry.tsx`; next-intl middleware lives in **`src/proxy.ts`** (Next 16 naming), not `middleware.ts`.
- Locales: `['zh-HK', 'en']`, **default `zh-HK`**, `timeZone = 'Asia/Hong_Kong'`.
- Theme default: **dark**. `themeAtom` persisted to localStorage key `theme-mode`.
- Secrets via env only: `FINNHUB_API_KEY` (server), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client). Never hardcode.
- API routes: `export const runtime = 'nodejs'` (yahoo-finance2 needs Node); keep CORS `Access-Control-Allow-Origin: *` for the Android client.
- Package manager: **pnpm** (template ships `pnpm-lock.yaml`).
- Do NOT delete `index.html` / `server.js` / `api/*.js` in this plan — they are removed in Plan 5 after the new app reaches parity. The new app lives alongside them.
- Symbols ending `.HK` are HKD; all else USD. Capital is USD base.
- Commit after every task with conventional-commit messages; **no attribution footer** (disabled globally).

---

## File Structure (created in this plan)

```
package.json (rewrite)  next.config.ts  tsconfig.json  postcss.config.mjs
eslint.config.mjs  vitest.config.ts  .env.example  src/proxy.ts
src/app/[locale]/layout.tsx  src/app/[locale]/page.tsx
src/app/api/quotes/route.ts  src/app/api/candles/route.ts
src/components/Providers.tsx  src/components/JotaiProvider.tsx  src/components/Header/index.tsx
src/store/themeAtom.ts  src/store/currencyAtom.ts
src/styles/theme.ts  src/styles/globals.ts  src/styles/registry.tsx  src/styles/styled.d.ts
src/i18n/config.ts  src/i18n/request.ts  src/messages/zh-HK.json  src/messages/en.json
src/types/trade.ts  src/types/candle.ts
src/lib/supabaseClient.ts  src/lib/format.ts (+test)  src/lib/finance.ts (+test)  src/lib/keyLevels.ts (+test)
```

---

### Task 1: Project scaffold, config & test harness

**Files:**
- Modify: `package.json` (rewrite from Express → Next)
- Create: `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.env.example`, `src/app/globals.css`

**Interfaces:**
- Produces: a buildable Next app skeleton; `pnpm test` runs Vitest; path alias `@/*`.

- [ ] **Step 1: Rewrite `package.json`**

```json
{
  "name": "finnhub-proxy",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "axios": "^1.13.2",
    "jotai": "^2.16.1",
    "lucide-react": "^0.562.0",
    "next": "16.1.1",
    "next-intl": "^4.7.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "styled-components": "^6.2.0",
    "yahoo-finance2": "^3.13.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^20.19.27",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^2.1.8",
    "eslint": "^9.39.2",
    "eslint-config-next": "16.1.1",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4",
    "typescript": "^5.9.3",
    "vitest": "^2.1.8"
  },
  "engines": { "node": ">=18.0.0" }
}
```

- [ ] **Step 2: Create config files** (copied from template, adapted)

`next.config.ts`:
```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  compiler: { styledComponents: true },
};

export default withNextIntl(nextConfig);
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "android"]
}
```

`postcss.config.mjs`:
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

`eslint.config.mjs`:
```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['android/**', '.next/**', 'node_modules/**'] },
];
```

`src/app/globals.css` (Tailwind v4 entry):
```css
@import "tailwindcss";
```

`.env.example`:
```
FINNHUB_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: { include: ['src/lib/**'], thresholds: { lines: 80, functions: 80 } },
  },
});
```

- [ ] **Step 4: Install & verify**

Run: `pnpm install`
Then create `.env` from `.env.example` filling the real values (Finnhub key + Supabase URL/anon key currently in `index.html` lines 77-78 and `.env`).
Run: `pnpm exec tsc --noEmit`
Expected: PASS (no app files yet, only config — exits 0).

- [ ] **Step 5: Commit**

```bash
git add package.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs vitest.config.ts .env.example src/app/globals.css
git commit -m "chore: scaffold Next.js 16 project config and Vitest harness"
```

---

### Task 2: Domain types & Supabase client

**Files:**
- Create: `src/types/trade.ts`, `src/types/candle.ts`, `src/lib/supabaseClient.ts`

**Interfaces:**
- Produces: `Trade`, `TradeStatus`, `Currency`, `Candle`, `KeyLevel`, `PriceData`; `supabase` client instance.

- [ ] **Step 1: Create `src/types/trade.ts`**

```ts
export type TradeStatus = 'open' | 'closed';
export type Currency = 'USD' | 'HKD';

export interface StopLossEntry {
  price: number;
  date: string;
  note: string;
}

export interface Trade {
  id: string | number;
  symbol: string;
  entryPrice: number;
  shares: number;
  initialStopLoss: number;
  currentStopLoss: number;
  targetPrice: number | null;
  status: TradeStatus;
  riskAmount: number;
  createdAt: string;
  stopLossHistory: StopLossEntry[];
  exitPrice?: number | null;
  pnl?: number | null;
  closedAt?: string | null;
}

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
}
```

- [ ] **Step 2: Create `src/types/candle.ts`**

```ts
export interface Candle {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface KeyLevel {
  price: number;
  time: number; // unix seconds
  strength: number;
}
```

- [ ] **Step 3: Create `src/lib/supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY) are not configured');
}

export const supabase = createClient(url, anonKey);
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/trade.ts src/types/candle.ts src/lib/supabaseClient.ts
git commit -m "feat: add domain types and Supabase client"
```

---

### Task 3: Theme (light + dark) & styled-components plumbing

**Files:**
- Create: `src/styles/theme.ts`, `src/styles/styled.d.ts`, `src/styles/globals.ts`, `src/styles/registry.tsx`, `src/store/themeAtom.ts`, `src/store/currencyAtom.ts`, `src/components/JotaiProvider.tsx`, `src/components/Providers.tsx`

**Interfaces:**
- Consumes: jotai.
- Produces: `lightTheme`, `darkTheme`, `AppTheme` type; `themeAtom` (`'dark'|'light'`), `currencyAtom` (`'USD'|'HKD'`); `<Providers locale messages>` wrapping NextIntl → Jotai → styled ThemeProvider → GlobalStyle.

- [ ] **Step 1: Create `src/styles/theme.ts`**

```ts
export enum Breakpoint { XS = 'xs', MD = 'md', XL = 'xl' }

const breakpoints = {
  [Breakpoint.XS]: '480px',
  [Breakpoint.MD]: '768px',
  [Breakpoint.XL]: '1200px',
};

interface ThemeColors {
  bg: string; surface: string; surfaceAlt: string; border: string;
  text: string; textMuted: string; textFaint: string;
  accent: string; accentSoft: string; positive: string; negative: string;
}

export interface AppTheme {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  breakpoints: typeof breakpoints;
}

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    bg: '#0a0b0d', surface: '#0f1115', surfaceAlt: '#15181d',
    border: 'rgba(255,255,255,0.07)',
    text: '#e6e8ea', textMuted: '#8b9096', textFaint: 'rgba(255,255,255,0.35)',
    accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.12)',
    positive: '#34d399', negative: '#f87171',
  },
  breakpoints,
};

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    bg: '#f7f7f5', surface: '#ffffff', surfaceAlt: '#f0f0ee',
    border: 'rgba(0,0,0,0.08)',
    text: '#1a1c1e', textMuted: '#5b6066', textFaint: 'rgba(0,0,0,0.4)',
    accent: '#d97706', accentSoft: 'rgba(217,119,6,0.12)',
    positive: '#15803d', negative: '#dc2626',
  },
  breakpoints,
};
```

- [ ] **Step 2: Create `src/styles/styled.d.ts`** (theme typing)

```ts
import 'styled-components';
import type { AppTheme } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
```

- [ ] **Step 3: Create `src/styles/globals.ts`**

```ts
import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; padding: 0; margin: 0; }
  html, body { max-width: 100vw; overflow-x: hidden; }
  html { color-scheme: ${({ theme }) => theme.mode}; }
  body {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg};
    font-family: 'JetBrains Mono', ui-monospace, -apple-system, 'PingFang HK', 'Noto Sans HK', sans-serif;
    -webkit-font-smoothing: antialiased;
    transition: background 0.2s ease, color 0.2s ease;
  }
  a { color: inherit; text-decoration: none; }
  ::selection { background: ${({ theme }) => theme.colors.accentSoft}; }
`;
```

- [ ] **Step 4: Create `src/styles/registry.tsx`** (copy template verbatim)

```tsx
'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());
  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });
  if (typeof window !== 'undefined') return <>{children}</>;
  return <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>;
}
```

- [ ] **Step 5: Create store atoms**

`src/store/themeAtom.ts`:
```ts
import { atomWithStorage } from 'jotai/utils';

export type ThemeMode = 'dark' | 'light';
// NOTE: plain atomWithStorage (reads localStorage in a post-mount effect) → server and client
// first render both produce 'dark', so NO hydration mismatch. A light-mode user sees a brief FOUC.
// Fully flash-free theming requires cookie-based SSR (read the cookie server-side, render the right
// theme) — deferred to Plan 5 light-theme polish. Do NOT use getOnInit here: it diverges the
// client's first render from the dark SSR tree and throws a styled-components hydration error.
export const themeAtom = atomWithStorage<ThemeMode>('theme-mode', 'dark');
```

`src/store/currencyAtom.ts`:
```ts
import { atomWithStorage } from 'jotai/utils';
import type { Currency } from '@/types/trade';

export const currencyAtom = atomWithStorage<Currency>('display-currency', 'USD');
```

- [ ] **Step 6: Create `src/components/JotaiProvider.tsx`** (copy template)

```tsx
'use client';
import { Provider } from 'jotai';
export default function JotaiProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
```

- [ ] **Step 7: Create `src/components/Providers.tsx`**

```tsx
'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'styled-components';
import { useAtomValue } from 'jotai';
import JotaiProvider from '@/components/JotaiProvider';
import StyledComponentsRegistry from '@/styles/registry';
import { GlobalStyle } from '@/styles/globals';
import { darkTheme, lightTheme } from '@/styles/theme';
import { themeAtom } from '@/store/themeAtom';
import { timeZone } from '@/i18n/config';

function ThemedShell({ children }: { children: React.ReactNode }) {
  const mode = useAtomValue(themeAtom);
  return (
    <ThemeProvider theme={mode === 'light' ? lightTheme : darkTheme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children, locale, messages,
}: { children: React.ReactNode; locale: string; messages: Record<string, unknown> }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <JotaiProvider>
        <StyledComponentsRegistry>
          <ThemedShell>{children}</ThemedShell>
        </StyledComponentsRegistry>
      </JotaiProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 8: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS. (`@/i18n/config` is created in Task 4; if tsc runs before Task 4, expect an unresolved-import error on that line only — acceptable, resolved in Task 4. To verify in isolation, temporarily inline `const timeZone = 'Asia/Hong_Kong'`.)

- [ ] **Step 9: Commit**

```bash
git add src/styles src/store/themeAtom.ts src/store/currencyAtom.ts src/components/JotaiProvider.tsx src/components/Providers.tsx
git commit -m "feat: add light/dark theme, styled-components registry and jotai providers"
```

---

### Task 4: i18n + locale layout (app renders)

**Files:**
- Create: `src/i18n/config.ts`, `src/i18n/request.ts`, `src/proxy.ts`, `src/messages/zh-HK.json`, `src/messages/en.json`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `Providers` (Task 3).
- Produces: `locales`, `defaultLocale`, `timeZone`; rendered routes `/zh-HK`, `/en`.

- [ ] **Step 1: Create `src/i18n/config.ts`**

```ts
export const locales = ['zh-HK', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh-HK';
export const timeZone = 'Asia/Hong_Kong';
```

- [ ] **Step 2: Create `src/i18n/request.ts`**

```ts
import { getRequestConfig } from 'next-intl/server';
import { locales, timeZone, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    locale = defaultLocale;
  }
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages, timeZone };
});
```

- [ ] **Step 3: Create `src/proxy.ts`** (Next 16 middleware)

```ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

export default createMiddleware({ locales, defaultLocale });

export const config = {
  matcher: ['/((?!api|_next|_static|_vercel|.*\\..*).*)', '/'],
};
```

- [ ] **Step 4: Create message stubs**

`src/messages/zh-HK.json`:
```json
{ "app": { "title": "倉位計算器", "subtitle": "Position Sizer" } }
```

`src/messages/en.json`:
```json
{ "app": { "title": "Position Sizer", "subtitle": "Risk Dashboard" } }
```

- [ ] **Step 5: Create `src/app/[locale]/layout.tsx`**

```tsx
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Providers from '@/components/Providers';
import { locales } from '@/i18n/config';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages as Record<string, unknown>}>
          {children}
        </Providers>
      </body>
    </html>
  );
}

// NOTE (theme FOUC): an inline anti-flash <head> script was attempted but is ineffective here —
// the visible background comes from styled-components GlobalStyle on <body>, which still renders
// 'dark' on the client's first paint. Proper flash-free theming = cookie-based SSR (Plan 5).
```

- [ ] **Step 6: Create `src/app/[locale]/page.tsx`** (placeholder)

```tsx
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  return <Placeholder />;
}

function Placeholder() {
  const t = useTranslations('app');
  return (
    <main style={{ padding: 32 }}>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </main>
  );
}
```

- [ ] **Step 7: Run dev server and verify**

Run: `pnpm dev` (background), then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/zh-HK` and `.../en`.
Expected: both `200`. Visiting `/` redirects to `/zh-HK`. Page shows the title; toggling OS dark/light not yet wired (Task 10).

- [ ] **Step 8: Commit**

```bash
git add src/i18n src/proxy.ts src/messages src/app/[locale]
git commit -m "feat: add next-intl i18n (zh-HK/en) and locale layout"
```

---

### Task 5: `lib/format.ts` (currency & percent) — TDD

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `EXCHANGE_RATE_HKD_USD = 7.8`
  - `getSymbolCurrency(symbol: string): Currency`
  - `convertCurrency(amount: number, from: Currency, to: Currency): number`
  - `formatCurrency(amount: number, from: Currency, display: Currency): string`
  - `formatPercent(n: number): string`

- [ ] **Step 1: Write failing tests** — `src/lib/format.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { getSymbolCurrency, convertCurrency, formatPercent, EXCHANGE_RATE_HKD_USD } from './format';

describe('getSymbolCurrency', () => {
  it('returns HKD for .HK symbols', () => {
    expect(getSymbolCurrency('0700.HK')).toBe('HKD');
  });
  it('returns USD otherwise', () => {
    expect(getSymbolCurrency('AAPL')).toBe('USD');
  });
});

describe('convertCurrency', () => {
  it('returns same amount when currencies match', () => {
    expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
  });
  it('USD → HKD multiplies by rate', () => {
    expect(convertCurrency(100, 'USD', 'HKD')).toBeCloseTo(100 * EXCHANGE_RATE_HKD_USD, 6);
  });
  it('HKD → USD divides by rate', () => {
    expect(convertCurrency(780, 'HKD', 'USD')).toBeCloseTo(100, 6);
  });
});

describe('formatPercent', () => {
  it('adds + sign and 2dp for positives', () => {
    expect(formatPercent(12.345)).toBe('+12.35%');
  });
  it('keeps - sign for negatives', () => {
    expect(formatPercent(-3.3)).toBe('-3.30%');
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test src/lib/format.test.ts`
Expected: FAIL ("Failed to resolve import ./format" / function not defined).

- [ ] **Step 3: Implement `src/lib/format.ts`**

```ts
import type { Currency } from '@/types/trade';

export const EXCHANGE_RATE_HKD_USD = 7.8;

export function getSymbolCurrency(symbol: string): Currency {
  return symbol && symbol.endsWith('.HK') ? 'HKD' : 'USD';
}

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'HKD') return amount * EXCHANGE_RATE_HKD_USD;
  if (from === 'HKD' && to === 'USD') return amount / EXCHANGE_RATE_HKD_USD;
  return amount;
}

export function formatCurrency(amount: number, from: Currency, display: Currency): string {
  const converted = convertCurrency(amount, from, display);
  return new Intl.NumberFormat(display === 'HKD' ? 'zh-HK' : 'en-US', {
    style: 'currency',
    currency: display,
  }).format(converted);
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test src/lib/format.test.ts`
Expected: PASS (8 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: add currency/percent formatting helpers with tests"
```

---

### Task 6: `lib/finance.ts` (position sizing, metrics, aggregates) — TDD

**Files:**
- Create: `src/lib/finance.ts`, `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `Trade`, `Currency`, `PriceData` (Task 2); `convertCurrency`, `getSymbolCurrency` (Task 5).
- Produces:
  - `calculatePosition(input: PositionInput): PositionResult | null`
  - `tradeMetrics(trade: Trade, opts: MetricsOpts): TradeMetrics`
  - `portfolioStats(trades: Trade[], opts: PortfolioOpts): PortfolioStats`
  - `historyStats(closed: Trade[], display: Currency): HistoryStats`
  - and the types `PositionInput`, `PositionResult`, `MetricsOpts`, `TradeMetrics`, `DrawdownTriple`, `PortfolioOpts`, `PortfolioStats`, `HistoryStats`.

- [ ] **Step 1: Write failing tests** — `src/lib/finance.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { calculatePosition, tradeMetrics, portfolioStats, historyStats } from './finance';
import type { Trade } from '@/types/trade';

const baseOpen: Trade = {
  id: 1, symbol: 'AAPL', entryPrice: 150, shares: 128,
  initialStopLoss: 145, currentStopLoss: 145, targetPrice: 165,
  status: 'open', riskAmount: 640, createdAt: '2026-06-10T00:00:00Z',
  stopLossHistory: [],
};

describe('calculatePosition', () => {
  it('sizes a textbook long trade', () => {
    const r = calculatePosition({ capital: 128000, buyPrice: 150, stop: 145, maxLossPercent: 0.5, targetPrice: 165 });
    expect(r).not.toBeNull();
    if (!r || 'error' in r) throw new Error('unexpected');
    expect(r.shares).toBe(128);
    expect(r.requiredCapital).toBe(19200);
    expect(r.actualRisk).toBe(640);
    expect(r.riskRewardRatio).toBeCloseTo(3, 6);
    expect(r.potentialProfit).toBe(1920);
  });
  it('errors when stop >= buy', () => {
    const r = calculatePosition({ capital: 128000, buyPrice: 150, stop: 151, maxLossPercent: 0.5 });
    expect(r).toEqual({ error: '止損價必須低於買入價' });
  });
  it('returns null on incomplete input', () => {
    expect(calculatePosition({ capital: 0, buyPrice: 150, stop: 145, maxLossPercent: 0.5 })).toBeNull();
  });
});

describe('tradeMetrics', () => {
  const now = Date.parse('2026-06-24T00:00:00Z');
  it('computes allocation, R, drawdowns at current price', () => {
    const m = tradeMetrics(baseOpen, { currentPrice: 298.19, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.amtAllocated).toBe(19200);
    expect(m.pctAllocated).toBeCloseTo(15, 4);
    expect(m.ptnSizing).toBeCloseTo(1, 6);          // 640 / (0.5% * 128000=640)
    expect(m.days).toBe(14);
    expect(m.r).toBeCloseTo((298.19 - 150) / 5, 4);
    expect(m.status).toBe('At Risk');
    expect(m.sdd.usd).toBeCloseTo(-640, 6);          // (145-150)*128
    expect(m.wdd.r).toBeCloseTo(-1, 6);
    expect(m.mdd?.usd).toBeCloseTo((145 - 298.19) * 128, 4);
  });
  it('flags Risk Free when stop >= entry', () => {
    const rf = { ...baseOpen, currentStopLoss: 152 };
    const m = tradeMetrics(rf, { currentPrice: 298.19, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.status).toBe('Risk Free');
    expect(m.isRiskFree).toBe(true);
  });
  it('leaves price-derived fields null without a price', () => {
    const m = tradeMetrics(baseOpen, { currentPrice: null, capital: 128000, fullPositionPct: 0.5, now });
    expect(m.r).toBeNull();
    expect(m.mdd).toBeNull();
    expect(m.sdd.usd).toBeCloseTo(-640, 6); // SDD/WDD do not need price
  });
});

describe('portfolioStats', () => {
  it('aggregates NAV, exposure and drawdown in display currency', () => {
    const s = portfolioStats([baseOpen], {
      prices: { AAPL: { price: 298.19, change: 0, changePercent: 0, updatedAt: '' } },
      capital: 128000, fullPositionPct: 0.5, display: 'USD',
    });
    expect(s.unrealized).toBeCloseTo(18968.32, 2);
    expect(s.realized).toBe(0);
    expect(s.nav).toBeCloseTo(146968.32, 2);
    expect(s.numStock).toBe(1);
    expect(s.osFp).toBeCloseTo(1, 6);
    expect(s.sdd).toBeCloseTo(-640, 2);
    expect(s.mdd).toBeCloseTo(-640 - 18968.32, 2);
  });
});

describe('historyStats', () => {
  it('summarises realized trades', () => {
    const closed: Trade[] = [
      { ...baseOpen, id: 2, status: 'closed', exitPrice: 170, pnl: 2560, closedAt: '2026-06-20T00:00:00Z' },
      { ...baseOpen, id: 3, status: 'closed', exitPrice: 145, pnl: -640, closedAt: '2026-06-21T00:00:00Z' },
    ];
    const h = historyStats(closed, 'USD');
    expect(h.count).toBe(2);
    expect(h.wins).toBe(1);
    expect(h.losses).toBe(1);
    expect(h.winRate).toBeCloseTo(50, 4);
    expect(h.realized).toBeCloseTo(1920, 2);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test src/lib/finance.test.ts`
Expected: FAIL (module/functions not defined).

- [ ] **Step 3: Implement `src/lib/finance.ts`**

```ts
import type { Trade, Currency, PriceData } from '@/types/trade';
import { convertCurrency, getSymbolCurrency } from './format';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PositionInput {
  capital: number; buyPrice: number; stop: number; maxLossPercent: number; targetPrice?: number | null;
}
export interface PositionResult {
  shares: number; riskPerShare: number; stopLossPercentage: number; maxLossAmount: number;
  requiredCapital: number; actualRisk: number; actualRiskPercent: number; capitalUsagePercent: number;
  canAfford: boolean; actualStopLoss: number;
  riskRewardRatio: number | null; potentialProfit: number | null; targetGainPercent: number | null;
}

export function calculatePosition(input: PositionInput): PositionResult | { error: string } | null {
  const { capital, buyPrice, stop, maxLossPercent } = input;
  if (!capital || !buyPrice || !stop || !maxLossPercent) return null;
  if (stop >= buyPrice) return { error: '止損價必須低於買入價' };

  const riskPerShare = buyPrice - stop;
  const stopLossPercentage = (riskPerShare / buyPrice) * 100;
  const maxLossAmount = capital * (maxLossPercent / 100);
  const shares = Math.floor(maxLossAmount / riskPerShare);
  const requiredCapital = shares * buyPrice;
  const actualRisk = shares * riskPerShare;
  const actualRiskPercent = (actualRisk / capital) * 100;
  const capitalUsagePercent = (requiredCapital / capital) * 100;

  let riskRewardRatio: number | null = null, potentialProfit: number | null = null, targetGainPercent: number | null = null;
  const target = input.targetPrice ?? null;
  if (target && target > buyPrice) {
    const profitPerShare = target - buyPrice;
    riskRewardRatio = profitPerShare / riskPerShare;
    potentialProfit = shares * profitPerShare;
    targetGainPercent = (profitPerShare / buyPrice) * 100;
  }

  return {
    shares, riskPerShare, stopLossPercentage, maxLossAmount, requiredCapital, actualRisk,
    actualRiskPercent, capitalUsagePercent, canAfford: requiredCapital <= capital,
    actualStopLoss: stop, riskRewardRatio, potentialProfit, targetGainPercent,
  };
}

export interface DrawdownTriple { r: number; usd: number; pctC: number }
export interface MetricsOpts { currentPrice: number | null; capital: number; fullPositionPct: number; now: number }
export type TradeStatusLabel = 'Risk Free' | 'At Risk' | 'Win' | 'Loss';
export interface TradeMetrics {
  amtAllocated: number; pctAllocated: number; ptnSizing: number; days: number;
  marketPrice: number | null; changePct: number | null; r: number | null;
  status: TradeStatusLabel; isRiskFree: boolean; currentRisk: number;
  sdd: DrawdownTriple; wdd: DrawdownTriple; mdd: DrawdownTriple | null;
}

export function tradeMetrics(trade: Trade, opts: MetricsOpts): TradeMetrics {
  const { currentPrice, capital, fullPositionPct, now } = opts;
  const { entryPrice: E, shares: Q, initialStopLoss: IS, currentStopLoss: CS } = trade;
  const initialRiskPerShare = E - IS;
  const oneFp = (fullPositionPct / 100) * capital;

  const triple = (deltaPerShare: number): DrawdownTriple => ({
    usd: deltaPerShare * Q,
    r: initialRiskPerShare !== 0 ? deltaPerShare / initialRiskPerShare : 0,
    pctC: capital !== 0 ? (deltaPerShare * Q) / capital * 100 : 0,
  });

  const closed = trade.status === 'closed';
  const refPrice = closed ? (trade.exitPrice ?? null) : currentPrice;
  const isRiskFree = CS >= E;
  const currentRisk = isRiskFree ? (CS - E) * Q : (E - CS) * Q;

  const status: TradeStatusLabel = closed
    ? ((trade.pnl ?? 0) >= 0 ? 'Win' : 'Loss')
    : (isRiskFree ? 'Risk Free' : 'At Risk');

  const startMs = Date.parse(trade.createdAt);
  const endMs = closed && trade.closedAt ? Date.parse(trade.closedAt) : now;
  const days = Math.max(0, Math.floor((endMs - startMs) / MS_PER_DAY));

  const changePct = refPrice != null ? ((refPrice - E) / E) * 100 : null;
  const r = refPrice != null && initialRiskPerShare !== 0 ? (refPrice - E) / initialRiskPerShare : null;
  const mdd = refPrice != null ? triple(CS - refPrice) : null;

  return {
    amtAllocated: Q * E,
    pctAllocated: capital !== 0 ? (Q * E) / capital * 100 : 0,
    ptnSizing: oneFp !== 0 ? trade.riskAmount / oneFp : 0,
    days, marketPrice: refPrice, changePct, r, status, isRiskFree, currentRisk,
    sdd: triple(CS - E),
    wdd: triple(IS - E),
    mdd,
  };
}

export interface PortfolioOpts {
  prices: Record<string, PriceData>; capital: number; fullPositionPct: number; display: Currency;
}
export interface PortfolioStats {
  capital: number; unrealized: number; realized: number; totalPL: number; nav: number;
  pctInvested: number; numStock: number; osFp: number; sdd: number; mdd: number; hasLiveUnrealized: boolean;
}

export function portfolioStats(trades: Trade[], opts: PortfolioOpts): PortfolioStats {
  const { prices, capital, fullPositionPct, display } = opts;
  const open = trades.filter((t) => t.status === 'open');
  const closed = trades.filter((t) => t.status === 'closed');
  const oneFp = (fullPositionPct / 100) * capital;
  const capitalDisplay = convertCurrency(capital, 'USD', display);

  let unrealized = 0, realized = 0, invested = 0, sddUsd = 0, osFpRisk = 0;
  let hasLiveUnrealized = false;
  for (const t of open) {
    const cur = getSymbolCurrency(t.symbol);
    const p = prices[t.symbol]?.price;
    if (p != null) {
      unrealized += convertCurrency((p - t.entryPrice) * t.shares, cur, display);
      invested += convertCurrency(p * t.shares, cur, display);
      hasLiveUnrealized = true;
    }
    sddUsd += convertCurrency((t.currentStopLoss - t.entryPrice) * t.shares, cur, display);
    osFpRisk += convertCurrency(Math.max(0, (t.entryPrice - t.currentStopLoss) * t.shares), cur, display);
  }
  for (const t of closed) {
    realized += convertCurrency(t.pnl ?? 0, getSymbolCurrency(t.symbol), display);
  }

  const totalPL = unrealized + realized;
  const nav = capitalDisplay + totalPL;
  return {
    capital: capitalDisplay, unrealized, realized, totalPL, nav,
    pctInvested: nav !== 0 ? (invested / nav) * 100 : 0,
    numStock: new Set(open.map((t) => t.symbol)).size,
    osFp: oneFp !== 0 ? osFpRisk / oneFp : 0,
    sdd: sddUsd,
    mdd: sddUsd - unrealized,
    hasLiveUnrealized,
  };
}

export interface HistoryStats {
  realized: number; count: number; wins: number; losses: number; winRate: number;
  avgR: number | null; best: number | null; worst: number | null;
}

export function historyStats(closed: Trade[], display: Currency): HistoryStats {
  if (closed.length === 0) {
    return { realized: 0, count: 0, wins: 0, losses: 0, winRate: 0, avgR: null, best: null, worst: null };
  }
  let realized = 0, wins = 0, losses = 0, rSum = 0, rCount = 0;
  let best = -Infinity, worst = Infinity;
  for (const t of closed) {
    const pnl = convertCurrency(t.pnl ?? 0, getSymbolCurrency(t.symbol), display);
    realized += pnl;
    if (pnl >= 0) wins++; else losses++;
    best = Math.max(best, pnl);
    worst = Math.min(worst, pnl);
    const risk = t.entryPrice - t.initialStopLoss;
    if (t.exitPrice != null && risk !== 0) { rSum += (t.exitPrice - t.entryPrice) / risk; rCount++; }
  }
  return {
    realized, count: closed.length, wins, losses,
    winRate: (wins / closed.length) * 100,
    avgR: rCount ? rSum / rCount : null, best, worst,
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test src/lib/finance.test.ts`
Expected: PASS (all assertions). If `ptnSizing`/`osFp` differ, recheck `oneFp = fullPositionPct/100 * capital`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/finance.ts src/lib/finance.test.ts
git commit -m "feat: add position sizing, trade metrics and portfolio/history aggregates with tests"
```

---

### Task 7: `lib/keyLevels.ts` (swing detection) — TDD

**Files:**
- Create: `src/lib/keyLevels.ts`, `src/lib/keyLevels.test.ts`

**Interfaces:**
- Consumes: `Candle`, `KeyLevel` (Task 2).
- Produces:
  - `detectKeyLevels(candles: Candle[], opts?: KeyLevelOpts): KeyLevels` where `KeyLevels = { supports: KeyLevel[]; resistances: KeyLevel[] }`
  - `suggestStop(support: number): number` → `support * 0.995`
  - `suggestTarget(resistance: number): number` → `resistance * 0.995`
  - `rLevels(entry: number, stop: number): { r1: number; r2: number; r3: number }`

- [ ] **Step 1: Write failing tests** — `src/lib/keyLevels.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { detectKeyLevels, suggestStop, suggestTarget, rLevels } from './keyLevels';
import type { Candle } from '@/types/candle';

// Build a series with a clear swing low at index 11 (dip to 90) and swing high at index 23 (spike to 130).
function series(): Candle[] {
  const closes: number[] = [];
  for (let i = 0; i < 11; i++) closes.push(105 - i * 0.2);    // gentle decline ~105→103
  closes.push(90);                                            // 11: deep low (support)
  for (let i = 0; i < 11; i++) closes.push(103 + i * 0.4);    // recover ~103→107
  closes.push(130);                                           // 23: spike high (resistance)
  for (let i = 0; i < 11; i++) closes.push(112 - i * 0.2);    // drift down
  return closes.map((c, idx) => ({
    t: 1_700_000_000 + idx * 86400,
    o: c, h: c + 1, l: c - 1, c, v: 1000,
  }));
}

describe('detectKeyLevels', () => {
  it('returns empty for too-few candles', () => {
    const r = detectKeyLevels(series().slice(0, 5));
    expect(r.supports).toEqual([]);
    expect(r.resistances).toEqual([]);
  });
  it('detects the swing low as a support near 89 (low of the dip candle)', () => {
    const { supports } = detectKeyLevels(series());
    expect(supports.length).toBeGreaterThan(0);
    expect(supports.some((s) => Math.abs(s.price - 89) < 1.5)).toBe(true);
  });
  it('detects the swing high as a resistance near 131 (high of the spike candle)', () => {
    const { resistances } = detectKeyLevels(series());
    expect(resistances.some((r) => Math.abs(r.price - 131) < 1.5)).toBe(true);
  });
  it('caps to maxLevels', () => {
    const { supports } = detectKeyLevels(series(), { maxLevels: 1 });
    expect(supports.length).toBeLessThanOrEqual(1);
  });
});

describe('suggest helpers', () => {
  it('stop sits just below support', () => {
    expect(suggestStop(100)).toBeCloseTo(99.5, 6);
  });
  it('target sits just below resistance', () => {
    expect(suggestTarget(200)).toBeCloseTo(199, 6);
  });
  it('rLevels project 1R/2R/3R above entry', () => {
    expect(rLevels(150, 145)).toEqual({ r1: 155, r2: 160, r3: 165 });
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test src/lib/keyLevels.test.ts`
Expected: FAIL (module/functions not defined).

- [ ] **Step 3: Implement `src/lib/keyLevels.ts`** (port of Android `DetectKeyLevelsUseCase`, symmetric highs added)

```ts
import type { Candle, KeyLevel } from '@/types/candle';

export interface KeyLevelOpts { lookback?: number; minProminence?: number; maxLevels?: number }
export interface KeyLevels { supports: KeyLevel[]; resistances: KeyLevel[] }

function dedupeTop(raw: KeyLevel[], maxLevels: number): KeyLevel[] {
  const kept: KeyLevel[] = [];
  for (const kl of [...raw].sort((a, b) => b.strength - a.strength)) {
    const tooClose = kept.some((e) => Math.abs(e.price - kl.price) / kl.price < 0.015);
    if (!tooClose) kept.push(kl);
    if (kept.length >= maxLevels) break;
  }
  return kept.sort((a, b) => b.time - a.time);
}

export function detectKeyLevels(candles: Candle[], opts: KeyLevelOpts = {}): KeyLevels {
  const lookback = opts.lookback ?? 5;
  const minProminence = opts.minProminence ?? 0.02;
  const maxLevels = opts.maxLevels ?? 5;
  if (candles.length < lookback * 2 + 1) return { supports: [], resistances: [] };

  const lows: KeyLevel[] = [];
  const highs: KeyLevel[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const wStart = Math.max(0, i - lookback * 2);
    const wEnd = Math.min(candles.length - 1, i + lookback * 2);
    const window = candles.slice(wStart, wEnd + 1);

    // swing low → support
    const centerLow = candles[i].low;
    let leftMin = Infinity, rightMin = Infinity;
    for (let k = i - lookback; k < i; k++) leftMin = Math.min(leftMin, candles[k].low);
    for (let k = i + 1; k <= i + lookback; k++) rightMin = Math.min(rightMin, candles[k].low);
    if (centerLow < leftMin && centerLow < rightMin) {
      const nearHigh = Math.max(...window.map((c) => c.high));
      const prominence = nearHigh > 0 ? (nearHigh - centerLow) / nearHigh : 0;
      if (prominence >= minProminence) lows.push({ price: centerLow, time: candles[i].t, strength: prominence });
    }

    // swing high → resistance (symmetric)
    const centerHigh = candles[i].high;
    let leftMax = -Infinity, rightMax = -Infinity;
    for (let k = i - lookback; k < i; k++) leftMax = Math.max(leftMax, candles[k].high);
    for (let k = i + 1; k <= i + lookback; k++) rightMax = Math.max(rightMax, candles[k].high);
    if (centerHigh > leftMax && centerHigh > rightMax) {
      const nearLow = Math.min(...window.map((c) => c.low));
      const prominence = centerHigh > 0 ? (centerHigh - nearLow) / centerHigh : 0;
      if (prominence >= minProminence) highs.push({ price: centerHigh, time: candles[i].t, strength: prominence });
    }
  }

  return { supports: dedupeTop(lows, maxLevels), resistances: dedupeTop(highs, maxLevels) };
}

export function suggestStop(support: number): number { return support * 0.995; }
export function suggestTarget(resistance: number): number { return resistance * 0.995; }
export function rLevels(entry: number, stop: number): { r1: number; r2: number; r3: number } {
  const r = entry - stop;
  return { r1: entry + r, r2: entry + 2 * r, r3: entry + 3 * r };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `pnpm test src/lib/keyLevels.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/keyLevels.ts src/lib/keyLevels.test.ts
git commit -m "feat: add swing-level detection (support/resistance) with tests"
```

---

### Task 8: `/api/quotes` route handler

**Files:**
- Create: `src/app/api/quotes/route.ts`

**Interfaces:**
- Produces: `GET /api/quotes?symbols=A,B` → `{ [SYMBOL]: { c,d,dp,h,l,o,pc,t } | { error } }`, CORS `*`.

- [ ] **Step 1: Implement** (port of `api/quotes.js`)

```ts
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get('symbols');
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'FINNHUB_API_KEY not configured' }, { status: 500, headers: CORS });
  if (!symbols) return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400, headers: CORS });

  const list = symbols.split(',').map((s) => s.trim().toUpperCase());
  const results: Record<string, unknown> = {};
  await Promise.all(list.map(async (symbol) => {
    try {
      if (symbol.endsWith('.HK')) {
        const q = await yahooFinance.quote(symbol);
        results[symbol] = {
          c: q.regularMarketPrice, d: q.regularMarketChange, dp: q.regularMarketChangePercent,
          h: q.regularMarketDayHigh, l: q.regularMarketDayLow, o: q.regularMarketOpen,
          pc: q.regularMarketPreviousClose, t: Math.floor(Date.now() / 1000),
        };
      } else {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}`, {
          headers: { 'X-Finnhub-Token': apiKey },
        });
        results[symbol] = await res.json();
      }
    } catch (e) {
      results[symbol] = { error: e instanceof Error ? e.message : 'fetch failed' };
    }
  }));

  return NextResponse.json(results, { headers: CORS });
}
```

- [ ] **Step 2: Verify**

With `pnpm dev` running: `curl -s "http://localhost:3000/api/quotes?symbols=AAPL" | head -c 200`
Expected: JSON like `{"AAPL":{"c":...,"dp":...}}` with HTTP 200.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/quotes/route.ts
git commit -m "feat: port quotes proxy to Next route handler"
```

---

### Task 9: `/api/candles` route handler

**Files:**
- Create: `src/app/api/candles/route.ts`

**Interfaces:**
- Produces: `GET /api/candles?symbol=X&range=6mo&interval=1d` → `{ symbol, range, interval, candles: Candle[] }`, CORS `*`.

- [ ] **Step 1: Implement** (port of `api/candles.js`)

```ts
import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const RANGE_DAYS: Record<string, number> = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
const ALLOWED_INTERVALS = new Set(['1d', '1wk', '1mo']);

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get('symbol');
  const rangeKey = RANGE_DAYS[sp.get('range') ?? ''] ? (sp.get('range') as string) : '6mo';
  const interval = ALLOWED_INTERVALS.has(sp.get('interval') ?? '') ? (sp.get('interval') as '1d' | '1wk' | '1mo') : '1d';
  if (!symbol) return NextResponse.json({ error: 'Missing symbol parameter' }, { status: 400, headers: CORS });

  const period1 = new Date(Date.now() - RANGE_DAYS[rangeKey] * 86400 * 1000);
  try {
    const result = await yahooFinance.chart(symbol.toUpperCase(), { period1, interval });
    const candles = (result.quotes ?? [])
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        t: Math.floor(new Date(q.date).getTime() / 1000),
        o: q.open as number, h: q.high as number, l: q.low as number, c: q.close as number, v: q.volume ?? 0,
      }));
    return NextResponse.json({ symbol: symbol.toUpperCase(), range: rangeKey, interval, candles }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'chart failed' }, { status: 500, headers: CORS });
  }
}
```

- [ ] **Step 2: Verify**

`curl -s "http://localhost:3000/api/candles?symbol=AAPL&range=1mo" | head -c 200`
Expected: `{"symbol":"AAPL","range":"1mo","interval":"1d","candles":[{"t":...}]}` HTTP 200.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/candles/route.ts
git commit -m "feat: port candles proxy to Next route handler"
```

---

### Task 10: Header shell with theme / language / currency toggles

**Files:**
- Create: `src/components/Header/index.tsx`
- Modify: `src/app/[locale]/page.tsx` (render `<Header/>`)
- Modify: `src/messages/zh-HK.json`, `src/messages/en.json` (add header keys)

**Interfaces:**
- Consumes: `themeAtom`, `currencyAtom`, next-intl `useRouter`/`usePathname`, lucide icons.
- Produces: `<Header/>` with working theme switch (persists), language switch (route), currency toggle.

- [ ] **Step 1: Add message keys**

`zh-HK.json`:
```json
{ "app": { "title": "倉位計算器", "subtitle": "Position Sizer" }, "header": { "theme": "主題", "language": "語言" } }
```
`en.json`:
```json
{ "app": { "title": "Position Sizer", "subtitle": "Risk Dashboard" }, "header": { "theme": "Theme", "language": "Language" } }
```

- [ ] **Step 2: Create `src/components/Header/index.tsx`**

```tsx
'use client';

import styled from 'styled-components';
import { useAtom } from 'jotai';
import { Sun, Moon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { themeAtom } from '@/store/themeAtom';
import { currencyAtom } from '@/store/currencyAtom';
import { locales } from '@/i18n/config';

const Bar = styled.header`
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  height: 56px; padding: 0 16px;
  background: ${({ theme }) => theme.colors.bg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;
const Brand = styled.span` font-weight: 600; color: ${({ theme }) => theme.colors.text}; `;
const Btn = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 12px; cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 6px;
`;

export default function Header() {
  const t = useTranslations('app');
  const th = useTranslations('header'); // header.theme / header.language live in the 'header' namespace
  const [mode, setMode] = useAtom(themeAtom);
  const [currency, setCurrency] = useAtom(currencyAtom);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const next = locales.find((l) => l !== locale) ?? locale;
    router.push(pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`));
  };

  return (
    <Bar>
      <Brand>▲ {t('title')}</Brand>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={() => setCurrency(currency === 'USD' ? 'HKD' : 'USD')} aria-label={`${currency} currency`}>
          {currency === 'USD' ? '🇺🇸 USD' : '🇭🇰 HKD'}
        </Btn>
        <Btn onClick={switchLocale} aria-label={th('language')}>{locale === 'zh-HK' ? 'EN' : '中'}</Btn>
        <Btn onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label={th('theme')}>
          {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </Btn>
      </div>
    </Bar>
  );
}
```

- [ ] **Step 3: Render in `src/app/[locale]/page.tsx`**

```tsx
import Header from '@/components/Header';

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main style={{ padding: 24 }}>Dashboard coming soon…</main>
    </>
  );
}
```

- [ ] **Step 4: Manual verify**

With `pnpm dev`: open `http://localhost:3000/zh-HK`.
Expected: header shows `▲ 倉位計算器`, currency/lang/theme buttons. Click theme → page background flips dark↔light and persists across reload. Click 中/EN → URL switches `/zh-HK`↔`/en`, title translates.

- [ ] **Step 5: Build verification**

Run: `pnpm build`
Expected: build succeeds (routes `/[locale]`, `/api/quotes`, `/api/candles` compiled).
Run: `pnpm test:coverage`
Expected: all lib tests PASS; coverage ≥80% lines/functions on `src/lib/**` (Vitest exits non-zero if below threshold).

- [ ] **Step 6: Commit**

```bash
git add src/components/Header src/app/[locale]/page.tsx src/messages
git commit -m "feat: add header shell with theme, language and currency toggles"
```

---

## Plan 1 Deliverable

A deployable Next.js 16 app shell on `/zh-HK` + `/en` with working light/dark + language + currency toggles, ported `/api/quotes` & `/api/candles` route handlers (Android-compatible), a Supabase client, and **fully unit-tested** `finance.ts` / `keyLevels.ts` / `format.ts` (≥80% coverage). `index.html` / `server.js` still present (removed in Plan 5). Next: **Plan 2 — Trades store, repository (Supabase + localStorage), auth, and the Calculator UI.**

## Self-Review

- **Spec coverage:** §3 architecture/env ✓ (T1, T8, T9); §4 structure ✓; §5 types/persistence ✓ (T2, supabase); §6 atoms — theme/currency ✓ (trades/prices in Plan 2); §7 finance ✓ (T6); §9 keyLevels ✓ (T7, chart UI in Plan 4); §10 theming ✓ (T3, T10); §11 i18n ✓ (T4); §12 API ✓ (T8/T9); §13 testing ✓ (T5/6/7). Gaps deferred by design to Plans 2-5 (calculator, positions, history, summary, charts, removing old files).
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type consistency:** `Candle` uses `t/o/h/l/c/v` consistently across types, keyLevels, candles route; `KeyLevel` from `@/types/candle` used by keyLevels lib; `Currency` shared; `tradeMetrics`/`portfolioStats` signatures match their test calls.
