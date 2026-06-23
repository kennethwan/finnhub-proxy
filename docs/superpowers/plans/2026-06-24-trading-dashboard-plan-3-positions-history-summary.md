# Trading Dashboard — Plan 3: Positions, History, Summary & Live Polling

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Render the persisted trades as a dashboard — a **Positions** view (open trades with live quotes, per-trade R/FP/SDD/WDD/MDD, trailing-stop/close/delete) and a **History** view (closed trades), each topped by a summary (NAV/Exposure/Drawdown for positions; realized stats for history), with 60s live price polling and the desktop "calculator rail + summary + [持倉|歷史]" layout (collapsing to tabs on mobile).

**Architecture:** A `usePricePolling` hook fills `pricesAtom` from `/api/quotes` every 60s while open trades exist. Presentational components (`PositionsSummary`, `HistorySummary`, `TradeCard`, `HistoryCard`) consume the already-tested pure functions `portfolioStats`/`historyStats`/`tradeMetrics` (`lib/finance.ts`) and `formatCurrency`/`formatPercent` (`lib/format.ts`). The page becomes the dashboard shell with an `activeTab` (calculator/positions/history on mobile) and a desktop grid. Visual reference: the redesigned terminal `index.html` (repo root, on this branch) — port its summary tiles and trade/history card markup into styled-components.

**Tech Stack:** Next 16, React 19, TS, styled-components, jotai, next-intl, Vitest. Builds on Plans 1–2 (`finance`, `format`, `useTrades`, `currencyAtom`, `fullPositionPctAtom`, `pricesAtom`, `Calculator`, `Header`).

## Global Constraints

- **Visual + behavioral reference: `index.html` (repo root, this branch)** — the dark "trading terminal" dashboard built earlier (summary tiles ~lines 668-681, TradeCard ~688-794, calculator results, → Risk Free progress bar, update-stop/close/delete inline forms). Port its markup/semantics into styled-components reading `theme.colors.*`. Keep the aesthetic (charcoal/amber dark, light variant via theme).
- **All money math via `lib/finance.ts`** — `tradeMetrics(trade, {currentPrice, capital, fullPositionPct, now})`, `portfolioStats(trades, {prices, capital, fullPositionPct, display})`, `historyStats(closed, display)`. Do NOT recompute P&L/R/SDD/etc. Money formatted via `formatCurrency(value, getSymbolCurrency(symbol), currency)`; percents via `formatPercent`.
- `capital` for stats comes from the calculator's capital input. Expose it via a new `capitalAtom` (`atomWithStorage<string>('calc-capital','128000')`) so Calculator and Summary share it. (Calculator currently has local capital state — migrate it to this atom in Task 7.)
- `now` passed to `tradeMetrics` must be created in an effect/handler or memoized per render tick — NEVER call `Date.now()` during a Server Component render. Components using it are `'use client'`.
- Live polling: `usePricePolling` calls `GET /api/quotes?symbols=<open symbols, comma-joined>` every 60s (and once immediately) only when ≥1 open trade exists; writes `{price,change,changePercent,updatedAt}` per symbol into `pricesAtom` for quotes with `c>0`. Mirrors legacy `index.html fetchPrices`.
- i18n: all visible strings via `useTranslations`; add keys to BOTH `zh-HK.json` and `en.json` (same key sets). No hardcoded Cantonese in TSX (emoji are fine).
- Desktop (≥1024px): calculator sticky left rail + right column (summary + `[持倉|歷史]` subtab + list). Mobile: top tab switcher `計算器/持倉/歷史`; positions tab shows PositionsSummary atop, history tab shows HistorySummary atop.
- pnpm; conventional commits; no attribution footer; full suite before each commit.

---

## File Structure

```
src/store/capitalAtom.ts                         (new)  shared capital
src/store/uiAtom.ts                              (new)  activeTab / positions-subtab
src/hooks/usePricePolling.ts                     (new)
src/components/ui/StatTile.tsx                    (new)
src/components/ui/Segmented.tsx                   (new)  generic 2-option toggle
src/components/Summary/PositionsSummary.tsx       (new)
src/components/Summary/HistorySummary.tsx         (new)
src/components/Positions/TradeCard.tsx            (new)
src/components/Positions/index.tsx                (new)  list + summary + refresh
src/components/History/HistoryCard.tsx            (new)
src/components/History/index.tsx                  (new)  list + summary
src/components/Dashboard/index.tsx                (new)  layout shell (rail + tabs/subtabs)
src/components/Calculator/index.tsx              (modify: capital from capitalAtom; add FP% control)
src/app/[locale]/page.tsx                        (modify: render <Dashboard/>)
src/messages/{zh-HK,en}.json                     (modify)
```

---

### Task 1: `capitalAtom` + `uiAtom` + `usePricePolling`

**Files:** Create `src/store/capitalAtom.ts`, `src/store/uiAtom.ts`, `src/hooks/usePricePolling.ts`.

**Interfaces:**
- `capitalAtom` = `atomWithStorage<string>('calc-capital', '128000')`.
- `activeTabAtom` = `atom<'calculator'|'positions'|'history'>('calculator')`; `positionsSubtabAtom` = `atom<'positions'|'history'>('positions')` (desktop right-column subtab).
- `usePricePolling()` — installs the 60s interval; no return value (writes `pricesAtom`).

- [ ] **Step 1: Create atoms**

`src/store/capitalAtom.ts`:
```ts
import { atomWithStorage } from 'jotai/utils';
export const capitalAtom = atomWithStorage<string>('calc-capital', '128000');
```
`src/store/uiAtom.ts`:
```ts
import { atom } from 'jotai';
export type ActiveTab = 'calculator' | 'positions' | 'history';
export const activeTabAtom = atom<ActiveTab>('calculator');
export type PositionsSubtab = 'positions' | 'history';
export const positionsSubtabAtom = atom<PositionsSubtab>('positions');
```

- [ ] **Step 2: Create `src/hooks/usePricePolling.ts`** (mirrors legacy `fetchPrices` + 60s interval)

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { tradesAtom } from '@/store/tradesAtom';
import { pricesAtom } from '@/store/pricesAtom';

export function usePricePolling() {
  const trades = useAtomValue(tradesAtom);
  const setPrices = useSetAtom(pricesAtom);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openSymbols = trades.filter((t) => t.status === 'open').map((t) => t.symbol);
  const symbolKey = Array.from(new Set(openSymbols)).sort().join(',');

  const fetchPrices = useCallback(async () => {
    if (!symbolKey) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes?symbols=${symbolKey}`);
      const data = await res.json();
      if (data.error) {
        setError(String(data.error));
      } else {
        const next: Record<string, { price: number; change: number; changePercent: number; updatedAt: string }> = {};
        for (const [sym, q] of Object.entries(data as Record<string, { c?: number; d?: number; dp?: number }>)) {
          if (q.c && q.c > 0) next[sym] = { price: q.c, change: q.d ?? 0, changePercent: q.dp ?? 0, updatedAt: new Date().toISOString() };
        }
        setPrices(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch failed');
    }
    setLoading(false);
  }, [symbolKey, setPrices]);

  useEffect(() => {
    if (!symbolKey) return;
    fetchPrices();
    const id = setInterval(fetchPrices, 60000);
    return () => clearInterval(id);
  }, [symbolKey, fetchPrices]);

  return { loading, error, refresh: fetchPrices };
}
```

- [ ] **Step 3: Verify** `pnpm exec tsc --noEmit` (exit 0), `pnpm build` (PASS). **Commit:** `feat: add capital/ui atoms and usePricePolling hook`.

---

### Task 2: UI primitives — `StatTile` + `Segmented`

**Files:** Create `src/components/ui/StatTile.tsx`, `src/components/ui/Segmented.tsx`.

**Interfaces:**
- `<StatTile label value tone? accent?>` — label (uppercase muted) over a mono `value`; `tone?: 'pos'|'neg'|'muted'` colors the value; `accent?` highlights the border.
- `<Segmented options={[{key,label}]} value onChange>` — generic 2-option toggle (active = accent bg + `accentText`).

- [ ] **Step 1: `StatTile.tsx`**
```tsx
'use client';
import styled from 'styled-components';

const Box = styled.div<{ $accent?: boolean }>`
  border: 1px solid ${({ $accent, theme }) => ($accent ? theme.colors.positive : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px; padding: 10px 12px;
`;
const Label = styled.p` font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: ${({ theme }) => theme.colors.textMuted}; `;
const Value = styled.p<{ $tone?: 'pos'|'neg'|'muted' }>`
  font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums;
  font-size: 18px; font-weight: 600; margin-top: 4px;
  color: ${({ $tone, theme }) => $tone === 'pos' ? theme.colors.positive : $tone === 'neg' ? theme.colors.negative : $tone === 'muted' ? theme.colors.textFaint : theme.colors.text};
`;
export default function StatTile({ label, value, tone, accent }: { label: string; value: React.ReactNode; tone?: 'pos'|'neg'|'muted'; accent?: boolean }) {
  return (<Box $accent={accent}><Label>{label}</Label><Value $tone={tone}>{value}</Value></Box>);
}
```

- [ ] **Step 2: `Segmented.tsx`**
```tsx
'use client';
import styled from 'styled-components';

const Wrap = styled.div` display: inline-flex; width: 100%; padding: 2px; gap: 2px; border-radius: 8px; background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; `;
const Item = styled.button<{ $active: boolean }>`
  flex: 1; padding: 8px 10px; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px;
  background: ${({ $active, theme }) => ($active ? theme.colors.accent : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.accentText : theme.colors.textMuted)};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;
export default function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (<Wrap>{options.map((o) => (<Item key={o.key} $active={o.key === value} onClick={() => onChange(o.key)}>{o.label}</Item>))}</Wrap>);
}
```

- [ ] **Step 3: Verify** `pnpm exec tsc --noEmit` (0). **Commit:** `feat: add StatTile and Segmented UI primitives`.

---

### Task 3: `PositionsSummary` (NAV / Exposure / Drawdown)

**Files:** Create `src/components/Summary/PositionsSummary.tsx`. Modify message files.

**Interface:** `<PositionsSummary/>` — reads `tradesAtom`, `pricesAtom`, `currencyAtom`, `fullPositionPctAtom`, `capitalAtom`; calls `portfolioStats(trades, {prices, capital: parseFloat(capital)||0, fullPositionPct, display: currency})`; renders two rows of `StatTile`.

- [ ] **Step 1: Implement.** Tiles (labels via `useTranslations('summary')`):
  - Row 1 (NAV): `Current NAV` = `formatCurrency(s.nav, currency, currency)`; `Total P/L` (tone pos/neg); `未實現` (s.unrealized, tone); `已實現` (s.realized, tone).
  - Row 2 (risk/exposure): `% Invested` = `${s.pctInvested.toFixed(1)}%`; `# of stock` = `s.numStock`; `O/S # of FP` = `s.osFp.toFixed(2)`; `SDD` = `formatCurrency(s.sdd,currency,currency)` (tone neg if <0); `MDD` = `formatCurrency(s.mdd,currency,currency)` (tone neg).
  - Note `s.nav`/`s.sdd`/etc. are already in display currency → pass `from = currency` to `formatCurrency` (no double-convert).
  - Responsive grid: `grid-template-columns: repeat(2, 1fr)` mobile, up to 5 on wide (`@media (min-width: 768px)`).
- [ ] **Step 2: Add `summary` keys to both message files** (currentNav, totalPL, unrealized, realized, pctInvested, numStock, osFp, sdd, mdd).
- [ ] **Step 3: Verify** `pnpm build` (no missing-message). **Commit:** `feat: add PositionsSummary (NAV/exposure/drawdown tiles)`.

---

### Task 4: `TradeCard` (open position)

**Files:** Create `src/components/Positions/TradeCard.tsx`. Modify message files.

**Interface:** `<TradeCard trade onUpdateStop onClose onDelete/>` — given an open `Trade`, reads `pricesAtom`/`currencyAtom`/`fullPositionPctAtom`/`capitalAtom`, computes `m = tradeMetrics(trade, {currentPrice: prices[symbol]?.price ?? null, capital, fullPositionPct, now})` (now from a `Date.now()` memo set in an effect), and renders the terminal card. `onUpdateStop(id, newStop)`, `onClose(id, exitPrice)`, `onDelete(id)` come from props (wired to `useTrades` in Positions/index).

- [ ] **Step 1: Implement** — port the legacy `index.html` TradeCard (~lines 688-794) into styled-components reading theme colors. Show: symbol + status chip (Risk Free / At Risk) + #days; right side current price + unrealized P&L + Ch% (tone) OR "無報價" when no price; a metrics grid (入場/股數/Amt Allocated/`%C`/Ptn Sizing(`m.ptnSizing>=1?`${m.ptnSizing.toFixed(2)} FP`:`${(m.ptnSizing).toFixed(2)} HP`` — display as `×`-multiple is fine)/現時止損); a risk row showing SDD·WDD·MDD as `R | US$ | %C` (use `m.sdd/m.wdd/m.mdd` triples; mdd may be null → `—`); a → Risk Free progress bar when `!m.isRiskFree` (width = `Math.max(0,Math.min(100,((currentStop-initialStop)/(entry-initialStop))*100))`); and inline actions: default = 更新止損 / 平倉 / 🗑; editing = number input + ✓/✕ calling `onUpdateStop`; closing = number input + ✓/✕ calling `onClose`. Local `useState` for edit/close mode + input values. `now` via `const [now,setNow]=useState(()=>Date.now()); useEffect(()=>setNow(Date.now()),[])` (avoids SSR `Date.now`). All labels via `useTranslations('card')`.
- [ ] **Step 2: Add `card` keys to both message files** (status.riskFree, status.atRisk, entry, shares, allocated, ofCapital, ptnSizing, currentStop, riskAmount, guaranteedProfit, toRiskFree, updateStop, close, newStopPlaceholder, exitPlaceholder, noQuote, days).
- [ ] **Step 3: Verify** `pnpm build`. **Commit:** `feat: add TradeCard with per-trade metrics, progress and inline actions`.

---

### Task 5: `HistoryCard` + `HistorySummary`

**Files:** Create `src/components/History/HistoryCard.tsx`, `src/components/Summary/HistorySummary.tsx`. Modify message files.

**Interfaces:** `<HistoryCard trade onDelete/>` (closed trade); `<HistorySummary/>` (reads closed trades + currency, calls `historyStats(closed, currency)`).

- [ ] **Step 1: `HistorySummary`** — tiles: `已實現 P/L` (formatCurrency, tone), `已平倉` (count), `勝/負` (`${h.wins}W/${h.losses}L`), `勝率` (`${h.winRate.toFixed(0)}%`), `平均 R` (`h.avgR==null?'—':h.avgR.toFixed(2)`), `最佳`/`最差` (formatCurrency, tone). Labels via `useTranslations('history')`.
- [ ] **Step 2: `HistoryCard`** — closed trade: symbol + Win/Loss chip + 持有日數 (`tradeMetrics(...).days`); right side 平倉價 + 已實現 P/L (tone); metrics grid 入場/平倉/股數/初始止損/Amt Allocated/`%C`; delete button. Money via formatCurrency. Labels via `useTranslations('card'/'history')` (reuse card keys where possible; add `exit`, `realized`, `holdDays`, `win`, `loss`).
- [ ] **Step 3: Verify** `pnpm build`. **Commit:** `feat: add HistoryCard and HistorySummary`.

---

### Task 6: `Positions` + `History` list views

**Files:** Create `src/components/Positions/index.tsx`, `src/components/History/index.tsx`.

**Interfaces:** `<Positions/>` — `useTrades()` + `usePricePolling()`; renders `<PositionsSummary/>`, a live-quote bar (pulsing dot + "每 60 秒自動更新 · Finnhub" + refresh button calling `usePricePolling().refresh`, + `error`), then open trades (sorted newest-first) as `<TradeCard>`s wired to `useTrades.updateStop/closeTrade/removeTrade`, plus an empty state. `<History/>` — closed trades as `<HistoryCard>`s + `<HistorySummary/>` on top + empty state.

- [ ] **Step 1: Implement** both. Open list = `trades.filter(t=>t.status==='open')` sorted by `createdAt` desc; closed = `filter(status==='closed')` sorted by `createdAt` desc. Empty states via i18n (`positions.empty`, `history.empty`). Refresh button + auto-update note via `useTranslations`.
- [ ] **Step 2: Verify** `pnpm build` + `pnpm test`. **Commit:** `feat: add Positions and History list views with live quote bar`.

---

### Task 7: Calculator → shared `capitalAtom` + FP% control

**Files:** Modify `src/components/Calculator/index.tsx`. Modify message files.

- [ ] **Step 1:** Replace the Calculator's local `capital` state with `useAtom(capitalAtom)` (so Summary shares the same capital). Behavior otherwise unchanged (still the `總本金` input).
- [ ] **Step 2:** Add a small FP setting control: `useAtom(fullPositionPctAtom)` — a labeled number input `1 Full Position = X%` (default 0.5), placed under the calculator (or in a small settings row). Label via `useTranslations('calculator')` (`fullPositionLabel`). Persist via the atom (already `atomWithStorage`).
- [ ] **Step 3: Verify** `pnpm build` + `pnpm test`. Confirm changing capital updates both calculator sizing and (later) summary. **Commit:** `feat: share capital via atom and add full-position % control`.

---

### Task 8: `Dashboard` shell — rail + tabs/subtabs; wire into page

**Files:** Create `src/components/Dashboard/index.tsx`. Modify `src/app/[locale]/page.tsx`. Modify message files.

**Interface:** `<Dashboard/>` — the responsive shell.

- [ ] **Step 1: Implement `Dashboard`** (`'use client'`):
  - Reads `activeTabAtom` (mobile) + `positionsSubtabAtom` (desktop right column).
  - **Mobile (<1024px):** a top `計算器/持倉/歷史` 3-tab switcher (styled, active = accent); show only the active tab's content (`<Calculator/>` / `<Positions/>` / `<History/>`).
  - **Desktop (≥1024px):** CSS grid `grid-template-columns: minmax(360px, 420px) 1fr; gap: 24px;` — left = `<Calculator/>` (sticky `position: sticky; top: 72px`), right = a `[持倉|歷史]` `<Segmented/>` (driven by `positionsSubtabAtom`) over `<Positions/>` or `<History/>`. Hide the mobile tab switcher at ≥1024 and show both columns; hide the desktop grid's duplication on mobile. Use styled-components media queries (`theme.breakpoints.xl`/a 1024px query) — render one structure with CSS `display` toggles to avoid duplicate-mount of stateful inputs (e.g., wrap mobile switcher in a `styled.div` that is `display:none` ≥1024, and the desktop grid `display:none` <1024). The Calculator/Positions/History each mount once — to satisfy "Calculator in rail on desktop, in tab on mobile" without double-mounting, render the three panes once inside a container whose layout changes by media query, controlling visibility by `activeTab` on mobile and always-visible (calculator + selected subtab) on desktop. (If a single-structure approach is too complex, render two structures but accept that inputs reset on breakpoint cross — document the choice.)
  - All tab/subtab labels via `useTranslations('nav')` (calculator/positions/history).
  - Footer note "報價來源 Finnhub · 每 60 秒自動更新" via i18n.
- [ ] **Step 2:** `page.tsx` → `<><Header/><main><Dashboard/></main></>` (full-width main; Dashboard manages its own max-width ~1400px centered).
- [ ] **Step 3: Add `nav` keys** to both message files (calculator/positions/history, + footer).
- [ ] **Step 4: Verify** `pnpm build` + `pnpm test` (all pass). Then with `pnpm dev`: add a trade in the calculator, switch to 持倉 → the TradeCard + summary render (live price fetched), → Risk Free progress shows; close it → moves to 歷史 with realized P&L. **Commit:** `feat: add responsive Dashboard shell (calculator rail + positions/history)`.

---

## Plan 3 Deliverable

The full single-account dashboard: size a position, add it, watch it live in 持倉 (with NAV/exposure/drawdown summary, per-trade R/FP/SDD/WDD/MDD, trailing-stop & close), and review closed trades in 歷史 with realized stats — responsive desktop-rail / mobile-tabs. Next: **Plan 4 — Charts & Key Levels** (the `StopTargetChartDialog` on the calculator + `TradeChartDialog` per open trade, via lightweight-charts + `lib/keyLevels`).

## Self-Review

- **Spec coverage:** §6 polling (T1), §7 metrics rendering (T3/T4/T5 via finance), §8 layout (T8), §3.x summary (T3/T5). Charts deferred to Plan 4.
- **Placeholder note:** T4/T5/T8 lean on the `index.html` reference for dense markup rather than inlining ~100 lines of JSX each — the data bindings (`tradeMetrics`/`portfolioStats` fields), labels (i18n keys), and interactions are fully specified, and the math is in tested lib functions. The one genuine design risk is the T8 single-vs-double-structure layout (flagged inline with an accepted fallback).
- **Type consistency:** `tradeMetrics`/`portfolioStats`/`historyStats` field names (nav, unrealized, realized, pctInvested, numStock, osFp, sdd, mdd, hasLiveUnrealized; m.amtAllocated, m.pctAllocated, m.ptnSizing, m.r, m.changePct, m.status, m.isRiskFree, m.sdd/wdd/mdd triples {r,usd,pctC}; h.wins/losses/winRate/avgR/best/worst) match Plan-1 `finance.ts`. `capitalAtom` is a string (parseFloat at use). `pricesAtom` value shape `{price,change,changePercent,updatedAt}` matches `PriceData`.
