# Trading Dashboard — Plan 4: Charts & Key Levels

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add candlestick charts via lightweight-charts — a calculator **stop/target picker** (chart + auto-detected support/resistance key levels + 1R/2R/3R reference lines + tap-to-pick → sets the calculator's stop & target) and a per-open-trade **read-only chart** (entry/stop/current lines + R-multiple header). Ports/extends the Android `StopLossChartSheet`/`TradeChartSheet`.

**Architecture:** A `useCandles(symbol)` hook fetches `/api/candles`. A `CandleChart` client component wraps lightweight-charts (candlestick series + horizontal price lines + click-to-pick), dynamically imported (no SSR). Two dialogs compose it: `StopTargetChartDialog` (calculator) overlays buy/stop/target lines + `detectKeyLevels` supports (green) / resistances (red) + `rLevels` 1R/2R/3R, with tappable suggestion chips; `TradeChartDialog` (per trade) is read-only with entry/stop/current lines. Key-level math is the already-tested `lib/keyLevels.ts`.

**Tech Stack:** Next 16, React 19, TS, styled-components, jotai, next-intl, **lightweight-charts ^4.2**, Vitest. Builds on Plans 1–3 (`/api/candles`, `lib/keyLevels`, `Calculator`, `TradeCard`).

## Global Constraints

- **Charting lib: `lightweight-charts` pinned `^4.2.0`** (v4 API: `chart.addCandlestickSeries(...)`, `series.setData(...)`, `series.createPriceLine(...)`, `series.removePriceLine(...)`, `chart.subscribeClick(...)`, `series.coordinateToPrice(y)`). Do NOT use the v5 `addSeries(CandlestickSeries, ...)` API — the `^4` range caps below v5.
- **Chart components are client-only:** every chart component starts with `'use client'`; the chart instance is created in `useEffect` (never during render — lightweight-charts touches `document`). Import dialogs into the calculator/card via `next/dynamic` with `{ ssr: false }`.
- **Key-level math = `lib/keyLevels.ts`** (already built + tested): `detectKeyLevels(candles, opts?) → { supports, resistances }`, `suggestStop(s)=s*0.995`, `suggestTarget(r)=r*0.995`, `rLevels(entry, stop)={r1,r2,r3}`. Do NOT recompute.
- **Candles API:** `GET /api/candles?symbol=X&range=6mo&interval=1d` → `{ symbol, range, interval, candles: [{t,o,h,l,c,v}] }` (already exists). `Candle.t` is unix **seconds** — lightweight-charts `time` accepts a UNIX-seconds number directly.
- **Suggestion semantics (from Android):** tap a support chip → calculator stop = `suggestStop(support)`; tap a resistance chip → target = `suggestTarget(resistance)`; tap a chart point → set stop (in the calculator picker). R-lines 1R/2R/3R drawn from `rLevels(entry, stop)`.
- Theme colors via `theme.colors.*` for chrome; chart candle/line colors may use explicit hex (chart lib needs string colors) but choose values consistent with theme (up `#34d399`, down `#f87171`, buy = accent/emerald, stop = `#f87171`, target = amber, support = `#34d399`, resistance = `#f87171`).
- i18n: dialog strings via `useTranslations`; keys in BOTH locales. pnpm; conventional commits; no attribution footer.

---

## File Structure

```
package.json                                   (modify: add lightweight-charts ^4.2.0)
src/hooks/useCandles.ts                         (new)
src/components/Chart/CandleChart.tsx            (new)  lightweight-charts wrapper
src/components/Chart/StopTargetChartDialog.tsx  (new)  calculator picker
src/components/Chart/TradeChartDialog.tsx       (new)  per-trade read-only
src/components/Calculator/index.tsx            (modify: 睇圖 button → StopTargetChartDialog → set stop/target)
src/components/Positions/TradeCard.tsx         (modify: 睇圖表 button → TradeChartDialog)
src/messages/{zh-HK,en}.json                   (modify)
```

---

### Task 1: Add lightweight-charts + `useCandles` hook

**Files:** Modify `package.json`; create `src/hooks/useCandles.ts`.

**Interface:** `useCandles(symbol: string | null, opts?: { range?: string; interval?: string }) → { candles: Candle[]; loading: boolean; error: string }`.

- [ ] **Step 1: Add dependency.** Add `"lightweight-charts": "^4.2.0"` to `dependencies` in `package.json`, then run `pnpm install`. Verify it resolved a 4.x version: `pnpm list lightweight-charts` → expect `lightweight-charts 4.x.x`.

- [ ] **Step 2: Create `src/hooks/useCandles.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import type { Candle } from '@/types/candle';

export function useCandles(symbol: string | null, opts?: { range?: string; interval?: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const range = opts?.range ?? '6mo';
  const interval = opts?.interval ?? '1d';

  useEffect(() => {
    if (!symbol) { setCandles([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(String(data.error));
        else setCandles((data.candles ?? []) as Candle[]);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, range, interval]);

  return { candles, loading, error };
}
```

- [ ] **Step 3: Verify** `pnpm exec tsc --noEmit` (0) + `pnpm build` (PASS). **Commit:** `feat: add lightweight-charts dep and useCandles hook`.

---

### Task 2: `CandleChart` (lightweight-charts wrapper)

**Files:** Create `src/components/Chart/CandleChart.tsx`.

**Interface:** `<CandleChart candles lines? onPriceClick? height?/>` where `PriceLine = { price: number; color: string; title: string; lineStyle?: 0|1|2|3|4 }` (0 solid, 1 dotted, 2 dashed). `onPriceClick(price)` fires when the chart is clicked.

- [ ] **Step 1: Implement** (v4 API; chart created in effect; refs for chart/series; click + line cleanup)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import {
  createChart, ColorType, type IChartApi, type ISeriesApi, type Time, type IPriceLine,
} from 'lightweight-charts';
import type { Candle } from '@/types/candle';

export interface PriceLine { price: number; color: string; title: string; lineStyle?: 0 | 1 | 2 | 3 | 4 }

interface Props { candles: Candle[]; lines?: PriceLine[]; onPriceClick?: (price: number) => void; height?: number }

export default function CandleChart({ candles, lines = [], onPriceClick, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const clickRef = useRef(onPriceClick);
  clickRef.current = onPriceClick;

  // create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      height,
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8b9096' },
      grid: { vertLines: { color: 'rgba(255,255,255,0.05)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#34d399', downColor: '#f87171', wickUpColor: '#34d399', wickDownColor: '#f87171', borderVisible: false,
    });
    chart.subscribeClick((param) => {
      if (!clickRef.current || !param.point) return;
      const price = series.coordinateToPrice(param.point.y);
      if (price != null) clickRef.current(price as number);
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => { chart.remove(); chartRef.current = null; seriesRef.current = null; };
  }, [height]);

  // data
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(candles.map((c) => ({ time: c.t as Time, open: c.o, high: c.h, low: c.l, close: c.c })));
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  // price lines (recreate on change)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    const created: IPriceLine[] = lines.map((l) =>
      series.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: l.lineStyle ?? 0, axisLabelVisible: true, title: l.title }),
    );
    return () => { created.forEach((pl) => series.removePriceLine(pl)); };
  }, [lines]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
```

- [ ] **Step 2: Verify** `pnpm exec tsc --noEmit` (0) + `pnpm build` (PASS — the component is client-only; build must not try to SSR-render lightweight-charts). If the build attempts to evaluate the chart at build time and fails, ensure consumers import it via `next/dynamic({ssr:false})` (done in Tasks 3-6); the component file itself only references `document` inside `useEffect`, so the module is import-safe. **Commit:** `feat: add CandleChart lightweight-charts wrapper`.

---

### Task 3: `StopTargetChartDialog` (calculator picker)

**Files:** Create `src/components/Chart/StopTargetChartDialog.tsx`. Modify message files.

**Interface:** `<StopTargetChartDialog open symbol buyPrice stop target onPickStop onPickTarget onClose/>` — `open: boolean`, `symbol: string`, `buyPrice: number|null`, `stop: number|null`, `target: number|null`, `onPickStop(price)`, `onPickTarget(price)`, `onClose()`.

- [ ] **Step 1: Implement** (`'use client'`, modal like AuthModal):
  - Returns null when `!open`. Uses `useCandles(open ? symbol : null)`.
  - `const { supports, resistances } = useMemo(() => detectKeyLevels(candles), [candles])`.
  - `const rl = buyPrice != null && stop != null ? rLevels(buyPrice, stop) : null`.
  - Build `lines: PriceLine[]`: buy (if buyPrice) `{price: buyPrice, color: '#34d399', title: t('buy'), lineStyle: 1}`; stop (if stop) `{price: stop, color: '#f87171', title: t('stop'), lineStyle: 0}`; target (if target) `{price: target, color: '#fbbf24', title: t('target'), lineStyle: 0}`; supports (green dashed, title `S`), resistances (red dashed, title `R`); 1R/2R/3R from rl (amber dotted, titles `1R/2R/3R`).
  - Render `<CandleChart candles={candles} lines={lines} onPriceClick={onPickStop} height={300}/>` (tap chart → set stop). Show loading/error/empty states (mirror Android: spinner / 載入失敗 / 冇歷史數據).
  - Below: a `支持位 (tap → 止損)` row of chips — `supports.map(s => <chip onClick={() => onPickStop(suggestStop(s.price))}>{s.price.toFixed(2)}</chip>)`; and a `阻力位 (tap → 止賺)` row — `resistances.map(r => <chip onClick={() => onPickTarget(suggestTarget(r.price))}>{r.price.toFixed(2)}</chip>)`.
  - A footer: current 止損 / 止賺 values + a 完成/關閉 button (`onClose`).
  - All strings via `useTranslations('chart')`.
- [ ] **Step 2: Add `chart` keys to both message files:** `title` (圖表), `buy` (買), `stop` (止), `target` (賺), `supports` (支持位 · tap 設止損), `resistances` (阻力位 · tap 設止賺), `loading` (載入中…), `loadError` (載入失敗), `noData` (冇歷史數據), `done` (完成), `rMultiples` (R 倍數). en equivalents.
- [ ] **Step 3: Verify** `pnpm build`. **Commit:** `feat: add StopTargetChartDialog (key-level stop/target picker)`.

---

### Task 4: `TradeChartDialog` (per-trade read-only)

**Files:** Create `src/components/Chart/TradeChartDialog.tsx`. Modify message files.

**Interface:** `<TradeChartDialog open trade currentPrice onClose/>` — `trade: Trade`, `currentPrice: number|null`.

- [ ] **Step 1: Implement** (`'use client'`, modal). Returns null when `!open`. `useCandles(open ? trade.symbol : null)`.
  - Header (port Android `TradeChartSheet`): `${trade.symbol} · ${trade.shares} 股`; a line `Entry <cur> X · Stop <cur> Y`; a row with `Now: <price>` and the **R multiple** `rMultiple = currentPrice!=null && (trade.entryPrice-trade.initialStopLoss)>0 ? (currentPrice - trade.entryPrice)/(trade.entryPrice - trade.initialStopLoss) : null` shown as `%+.2fR` colored (emerald ≥0 else red); and P&L `(currentPrice - trade.entryPrice) * trade.shares` via formatCurrency.
  - `lines`: entry `{price: trade.entryPrice, color: '#34d399', title: t('buy'), lineStyle: 0}`; stop `{price: trade.currentStopLoss, color: '#f87171', title: t('stop'), lineStyle: 2}`; current (if currentPrice) `{price: currentPrice, color: '#8b9096', title: t('now'), lineStyle: 0}`.
  - `<CandleChart candles={candles} lines={lines} height={300}/>` (no onPriceClick — read-only). loading/error/empty states. 關閉 button.
  - Strings via `useTranslations('chart')` (+ add `now`, `pnl`).
- [ ] **Step 2: Verify** `pnpm build`. **Commit:** `feat: add TradeChartDialog (read-only per-trade chart with R multiple)`.

---

### Task 5: Wire `StopTargetChartDialog` into Calculator

**Files:** Modify `src/components/Calculator/index.tsx`. Modify message files.

- [ ] **Step 1:** In Calculator, add `const [chartOpen, setChartOpen] = useState(false)`. Add a 睇圖 button (icon + `t('openChart')`) in the stop-loss area, enabled when `symbol.trim()` is non-empty (candles need a symbol). Import the dialog via `next/dynamic`: `const StopTargetChartDialog = dynamic(() => import('@/components/Chart/StopTargetChartDialog'), { ssr: false })`.
- [ ] **Step 2:** Render `<StopTargetChartDialog open={chartOpen} symbol={symbol} buyPrice={parseFloat(buyPrice)||null} stop={<the computed stop number used by calculatePosition>} target={parseFloat(targetPrice)||null} onPickStop={(p) => { setStopLossType('price'); setStopLoss(p.toFixed(2)); }} onPickTarget={(p) => setTargetPrice(p.toFixed(2))} onClose={() => setChartOpen(false)} />`. (`stop` = the same value the calculator passes to `calculatePosition` — price mode `parseFloat(stopLoss)`, percent mode `buyPrice*(1-pct/100)`; pass `null` if not computable.)
- [ ] **Step 3:** Add `calculator.openChart` (睇圖 / Chart) key to both locales.
- [ ] **Step 4: Verify** `pnpm build` + `pnpm test`. **Commit:** `feat: wire stop/target chart picker into the calculator`.

---

### Task 6: Wire `TradeChartDialog` into TradeCard

**Files:** Modify `src/components/Positions/TradeCard.tsx`. Modify message files.

- [ ] **Step 1:** In `TradeCard`, add `const [chartOpen, setChartOpen] = useState(false)`. Add a 睇圖表 action button (with the existing action buttons, view mode) opening the chart. Import via `next/dynamic`: `const TradeChartDialog = dynamic(() => import('@/components/Chart/TradeChartDialog'), { ssr: false })`.
- [ ] **Step 2:** Render `<TradeChartDialog open={chartOpen} trade={trade} currentPrice={m.marketPrice} onClose={() => setChartOpen(false)} />` (`m.marketPrice` from the existing `tradeMetrics` result).
- [ ] **Step 3:** Add `card.chart` (📈 圖表 / Chart) key to both locales.
- [ ] **Step 4: Verify** `pnpm build` + `pnpm test`. **Commit:** `feat: wire per-trade chart dialog into TradeCard`.

---

## Plan 4 Deliverable

Charts everywhere they help: in the calculator, a chart picker that overlays auto-detected support/resistance levels + 1R/2R/3R and lets you tap to set stop/target; on each open position, a read-only candlestick with entry/stop/current and the live R-multiple. Next: **Plan 5 — light-theme polish (FOUC via cookie-based SSR theme, accent contrast), remove the legacy `index.html`/`server.js`/`api/*.js`, README + deploy-env docs, final whole-branch review.**

## Self-Review

- **Spec coverage:** §9.1 candles (T1), §9.2 CandleChart (T2), §9.4 suggest/R-lines (T3), §9.5 calculator picker (T3/T5) + per-trade chart (T4/T6). Key-level detection reuses tested `lib/keyLevels`.
- **Risk note:** the lightweight-charts v4 API is the one genuine external-dependency risk (mirrors the earlier Babel-CDN lesson) — pinned `^4.2.0` and the v4 method names are specified explicitly; T1 Step 1 verifies the resolved major version. Chart components are client-only + dynamically imported to avoid SSR `document` access.
- **Type consistency:** `Candle` `{t,o,h,l,c,v}` (t = unix seconds) feeds lightweight-charts `time` directly; `PriceLine` shape shared by both dialogs; `detectKeyLevels`/`suggestStop`/`suggestTarget`/`rLevels` signatures match `lib/keyLevels.ts`; `tradeMetrics().marketPrice` feeds `TradeChartDialog.currentPrice`.
