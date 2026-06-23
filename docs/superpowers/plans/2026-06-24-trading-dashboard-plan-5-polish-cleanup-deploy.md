# Trading Dashboard — Plan 5: Polish, Cleanup & Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Finish the rebuild: fix the light-theme **FOUC** properly via cookie-based SSR theming (no flash, no hydration mismatch), fix the light-accent contrast, remove the legacy `index.html`/`server.js`/`api/*.js`, and add a README + deploy-env docs. End with a final whole-branch review.

**Architecture:** Theme becomes **cookie-driven**: the theme toggle writes a `theme-mode` cookie; the `[locale]` layout (Server Component) reads it via `next/headers` and renders the correct styled-components theme on the server, hydrating the client `themeAtom` to the same value via `useHydrateAtoms`. Server and client first-render agree → flash-free, mismatch-free. Then dead legacy files are deleted and docs added.

**Tech Stack:** Next 16, React 19, styled-components, jotai (`useHydrateAtoms`), next-intl. Builds on Plans 1–4.

## Global Constraints

- The deferred items from earlier reviews (spec §17): **(1)** light-mode theme FOUC, **(2)** light `accent #d97706` AA-Large-only contrast. Both fixed here.
- Cookie name: **`theme-mode`** (values `dark`|`light`); `path=/; max-age=31536000; samesite=lax`. Default when absent: **`dark`**.
- After the cookie change, `themeAtom` is a **plain `atom`** seeded per-request from the cookie (NOT `atomWithStorage` — the cookie is the source of truth, readable server-side). No `getOnInit`.
- Removing legacy files must NOT break the Android client: the Next route handlers `/api/quotes` + `/api/candles` already serve the same contracts, so deleting the old Express `api/*.js` + `server.js` is safe.
- pnpm; conventional commits; no attribution footer; run full suite before each commit.

---

### Task 1: Cookie-based SSR theming (FOUC fix)

**Files:** Modify `src/store/themeAtom.ts`, `src/components/Providers.tsx`, `src/app/[locale]/layout.tsx`, `src/components/Header/index.tsx`. Create `src/lib/themeCookie.ts`.

- [ ] **Step 1: `src/store/themeAtom.ts`** → plain atom (cookie is source of truth):
```ts
import { atom } from 'jotai';
export type ThemeMode = 'dark' | 'light';
export const themeAtom = atom<ThemeMode>('dark');
```

- [ ] **Step 2: Create `src/lib/themeCookie.ts`** (client writer):
```ts
import type { ThemeMode } from '@/store/themeAtom';
export const THEME_COOKIE = 'theme-mode';
export function writeThemeCookie(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}
```

- [ ] **Step 3: `src/components/Providers.tsx`** — accept `initialTheme`, hydrate the atom so client first-render matches the server:
```tsx
'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'styled-components';
import { useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import JotaiProvider from '@/components/JotaiProvider';
import StyledComponentsRegistry from '@/styles/registry';
import { GlobalStyle } from '@/styles/globals';
import { darkTheme, lightTheme } from '@/styles/theme';
import { themeAtom, type ThemeMode } from '@/store/themeAtom';
import { timeZone } from '@/i18n/config';

function ThemedShell({ children, initialTheme }: { children: React.ReactNode; initialTheme: ThemeMode }) {
  useHydrateAtoms([[themeAtom, initialTheme]] as const);
  const mode = useAtomValue(themeAtom);
  return (
    <ThemeProvider theme={mode === 'light' ? lightTheme : darkTheme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children, locale, messages, initialTheme,
}: { children: React.ReactNode; locale: string; messages: Record<string, unknown>; initialTheme: ThemeMode }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <JotaiProvider>
        <StyledComponentsRegistry>
          <ThemedShell initialTheme={initialTheme}>{children}</ThemedShell>
        </StyledComponentsRegistry>
      </JotaiProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 4: `src/app/[locale]/layout.tsx`** — read the cookie server-side; pass `initialTheme`; set `data-theme`/`color-scheme` on `<html>`:
```tsx
import { getMessages, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Providers from '@/components/Providers';
import { locales } from '@/i18n/config';
import type { ThemeMode } from '@/store/themeAtom';
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
  const cookieStore = await cookies();
  const initialTheme: ThemeMode = cookieStore.get('theme-mode')?.value === 'light' ? 'light' : 'dark';
  return (
    <html lang={locale} data-theme={initialTheme} style={{ colorScheme: initialTheme }} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages as Record<string, unknown>} initialTheme={initialTheme}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```
> NOTE: reading `cookies()` opts the `[locale]` route into dynamic rendering — acceptable (the app is a client dashboard, not statically cached). `generateStaticParams` stays for locale enumeration.

- [ ] **Step 5: `src/components/Header/index.tsx`** — the theme toggle writes the cookie alongside the atom:
```tsx
// import { writeThemeCookie } from '@/lib/themeCookie';
// in the theme toggle onClick:
onClick={() => { const next = mode === 'dark' ? 'light' : 'dark'; setMode(next); writeThemeCookie(next); }}
```
(Keep the existing `th('theme')` aria-label and the Sun/Moon icon logic.)

- [ ] **Step 6: Verify** `pnpm exec tsc --noEmit` (0) + `pnpm build` (PASS) + `pnpm test` (all pass). **Commit:** `fix: cookie-based SSR theming (flash-free light/dark, no hydration mismatch)`.
- [ ] **Step 7: LIVE verify (controller does this):** with a `theme-mode=light` cookie set, hard-reload `/zh-HK` → page paints **light immediately** (no dark flash) and the console shows **no hydration error**. Toggle dark→light→dark a few times + reload between → theme persists and never flashes.

---

### Task 2: Light-theme accent contrast

**Files:** Modify `src/styles/theme.ts`.

- [ ] **Step 1:** In `lightTheme.colors`, darken `accent` from `#d97706` to **`#b45309`** (amber-700) so it reaches WCAG AA (~4.5:1) on the `#ffffff`/`#f7f7f5` surfaces for normal text. Keep `accentSoft` proportional (e.g. `rgba(180,83,9,0.12)`). `accentText` stays `#1a1c1e` (dark text on the amber button still reads). Dark theme unchanged.
- [ ] **Step 2: Verify** `pnpm build` + `pnpm test`. **Commit:** `fix: darken light-theme accent to meet WCAG AA on light surfaces`.

---

### Task 3: Remove legacy files + README + deploy docs

**Files:** Delete `index.html`, `server.js`, `api/quotes.js`, `api/candles.js`, `package-lock.json`. Modify `.env.example`, `vercel.json` (check). Create/replace `README.md`.

- [ ] **Step 1: Delete the legacy app** (now fully replaced by the Next app + route handlers):
```bash
git rm index.html server.js api/quotes.js api/candles.js package-lock.json
# api/ should now be empty; remove if so:
rmdir api 2>/dev/null || true
```
> The Next route handlers `src/app/api/quotes/route.ts` + `src/app/api/candles/route.ts` preserve the exact `/api/quotes` + `/api/candles` contracts — the Android client is unaffected.

- [ ] **Step 2: `.env.example`** — document all required vars:
```
# Finnhub (server-side, for /api/quotes)
FINNHUB_API_KEY=
# Supabase (client-exposed)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: `vercel.json`** — for a Next.js app Vercel auto-detects everything; reduce to `{ "version": 2 }` (or delete it). Leave as `{ "version": 2 }`.

- [ ] **Step 4: `README.md`** — replace with:
```markdown
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
```

- [ ] **Step 5: Verify** `pnpm build` (still passes with legacy files gone) + `pnpm test`. **Commit:** `chore: remove legacy index.html/server.js/api, add README + deploy env docs`.

---

## Plan 5 Deliverable + Final Review

Flash-free light/dark theming, AA-compliant light accent, a clean repo (no dead legacy app), and docs for running + deploying. **The web rebuild is complete.**

**Then (controller):** run a final **whole-branch review** (opus) over the entire rebuild (`git merge-base main HEAD`..HEAD), address any Critical/Important, and present the user (on waking) with the integration decision (merge to main / PR / deploy) — do NOT merge or deploy autonomously.

## Self-Review

- **Spec coverage:** §17.1 FOUC (T1, cookie-based — the correct fix that avoids the Plan-1 getOnInit hydration error), §17.2 accent contrast (T2), §15 remove legacy + deploy docs (T3).
- **Risk note:** T1 changes how theme is applied (cookie + hydrate). The live verify (T1 Step 7) is the gate — it must show no flash AND no hydration error (the exact failure mode of the reverted Plan-1 attempt). If `useHydrateAtoms` still mismatches, the fallback is the cookie-only `<html data-theme>` + CSS-variable theming, but the hydrate approach should make server/client agree.
- **Type consistency:** `ThemeMode` shared by atom/cookie/Providers/layout; `initialTheme` threaded layout → Providers → ThemedShell.
