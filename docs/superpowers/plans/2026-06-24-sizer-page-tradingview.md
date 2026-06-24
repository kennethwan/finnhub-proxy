# Sizer Page TradingView Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated localized `/[locale]/sizer` workspace with shared position sizing controls and a large real TradingView chart.

**Architecture:** Extract the current calculator behavior into a reusable sizer panel, keep the existing dashboard calculator as a wrapper, and add a new page shell that pairs the shared panel with a TradingView widget. Keep chart-symbol normalization in a small tested library so widget behavior is deterministic.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, styled-components, jotai, next-intl, Vitest, TradingView embedded widget script.

---

## File Structure

- Create `src/lib/tradingViewSymbol.ts`: pure symbol normalization for TradingView widget symbols.
- Create `src/lib/tradingViewSymbol.test.ts`: Vitest coverage for US symbols, HK `.HK` symbols, empty input, malformed HK suffixes, and already-prefixed TradingView symbols.
- Create `src/components/Sizer/PositionSizerPanel.tsx`: shared client component containing sizing inputs, result rendering, add-position action, and optional chart button.
- Create `src/components/Sizer/TradingViewWidget.tsx`: client component that injects TradingView's widget script into a stable container.
- Create `src/components/Sizer/SizerWorkspace.tsx`: page-level split layout with the panel on the left and widget on the right.
- Create `src/app/[locale]/sizer/page.tsx`: localized route that renders `Header` and `SizerWorkspace`.
- Modify `src/components/Calculator/index.tsx`: reduce to a compatibility wrapper around `PositionSizerPanel` with the existing chart dialog behavior enabled.
- Modify `src/components/Header/index.tsx`: add route-aware navigation links for dashboard and sizer, preserving locale switching behavior.
- Modify `src/messages/zh-HK.json` and `src/messages/en.json`: add header navigation labels and sizer workspace strings.

## Task 1: TradingView Symbol Normalization

**Files:**
- Create: `src/lib/tradingViewSymbol.ts`
- Create: `src/lib/tradingViewSymbol.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/tradingViewSymbol.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_TRADING_VIEW_SYMBOL, normalizeTradingViewSymbol } from './tradingViewSymbol';

describe('normalizeTradingViewSymbol', () => {
  it('returns the default symbol for empty input', () => {
    expect(normalizeTradingViewSymbol('')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
    expect(normalizeTradingViewSymbol('   ')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
  });

  it('passes US-style symbols through as NASDAQ symbols', () => {
    expect(normalizeTradingViewSymbol('aapl')).toBe('NASDAQ:AAPL');
    expect(normalizeTradingViewSymbol('TSLA')).toBe('NASDAQ:TSLA');
  });

  it('converts Hong Kong .HK symbols to HKEX symbols without leading zeroes', () => {
    expect(normalizeTradingViewSymbol('0700.HK')).toBe('HKEX:700');
    expect(normalizeTradingViewSymbol('0005.hk')).toBe('HKEX:5');
    expect(normalizeTradingViewSymbol('9988.HK')).toBe('HKEX:9988');
  });

  it('keeps already-prefixed TradingView symbols uppercase', () => {
    expect(normalizeTradingViewSymbol('hkex:700')).toBe('HKEX:700');
    expect(normalizeTradingViewSymbol('nasdaq:msft')).toBe('NASDAQ:MSFT');
  });

  it('falls back to the default for malformed Hong Kong suffixes', () => {
    expect(normalizeTradingViewSymbol('ABCD.HK')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
    expect(normalizeTradingViewSymbol('.HK')).toBe(DEFAULT_TRADING_VIEW_SYMBOL);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm test src/lib/tradingViewSymbol.test.ts
```

Expected: FAIL because `src/lib/tradingViewSymbol.ts` does not exist.

- [ ] **Step 3: Implement the normalization library**

Create `src/lib/tradingViewSymbol.ts`:

```ts
export const DEFAULT_TRADING_VIEW_SYMBOL = 'NASDAQ:AAPL';

const TV_PREFIX_RE = /^[A-Z0-9_]+:[A-Z0-9._-]+$/;
const US_SYMBOL_RE = /^[A-Z][A-Z0-9._-]{0,9}$/;

export function normalizeTradingViewSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) return DEFAULT_TRADING_VIEW_SYMBOL;

  if (TV_PREFIX_RE.test(raw)) return raw;

  if (raw.endsWith('.HK')) {
    const code = raw.slice(0, -3);
    if (!/^\d{1,5}$/.test(code)) return DEFAULT_TRADING_VIEW_SYMBOL;
    const numericCode = Number.parseInt(code, 10);
    if (!Number.isFinite(numericCode) || numericCode <= 0) return DEFAULT_TRADING_VIEW_SYMBOL;
    return `HKEX:${numericCode}`;
  }

  if (US_SYMBOL_RE.test(raw)) return `NASDAQ:${raw}`;

  return DEFAULT_TRADING_VIEW_SYMBOL;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test src/lib/tradingViewSymbol.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tradingViewSymbol.ts src/lib/tradingViewSymbol.test.ts
git commit -m "test: add tradingview symbol normalization"
```

## Task 2: Shared Position Sizer Panel

**Files:**
- Create: `src/components/Sizer/PositionSizerPanel.tsx`
- Modify: `src/components/Calculator/index.tsx`

- [ ] **Step 1: Move the current calculator component into the shared panel**

Create `src/components/Sizer/PositionSizerPanel.tsx` by moving the current contents of `src/components/Calculator/index.tsx` into the new file. Rename the exported component to `PositionSizerPanel` and add props at the top of the component section:

```ts
interface PositionSizerPanelProps {
  chartMode?: 'dialog' | 'none';
  onSymbolChange?: (symbol: string) => void;
}

export default function PositionSizerPanel({
  chartMode = 'dialog',
  onSymbolChange,
}: PositionSizerPanelProps) {
```

Change the symbol input `onChange` handler from:

```tsx
onChange={(e) => setSymbol(e.target.value.toUpperCase())}
```

to:

```tsx
onChange={(e) => {
  const next = e.target.value.toUpperCase();
  setSymbol(next);
  onSymbolChange?.(next);
}}
```

Wrap the chart button and dialog with `chartMode === 'dialog'`:

```tsx
{chartMode === 'dialog' && (
  <ChartBtn
    type="button"
    disabled={!symbol.trim()}
    onClick={() => setChartOpen(true)}
  >
    {t('openChart')}
  </ChartBtn>
)}
```

```tsx
{chartMode === 'dialog' && (
  <StopTargetChartDialog
    open={chartOpen}
    symbol={symbol}
    buyPrice={parseFloat(buyPrice) || null}
    stop={stopForChart}
    target={parseFloat(targetPrice) || null}
    onPickStop={(p) => { setStopLossType('price'); setStopLoss(p.toFixed(2)); }}
    onPickTarget={(p) => setTargetPrice(p.toFixed(2))}
    onClose={() => setChartOpen(false)}
  />
)}
```

- [ ] **Step 2: Replace the old calculator with a wrapper**

Replace `src/components/Calculator/index.tsx` with:

```tsx
'use client';

import PositionSizerPanel from '@/components/Sizer/PositionSizerPanel';

export default function Calculator() {
  return <PositionSizerPanel chartMode="dialog" />;
}
```

- [ ] **Step 3: Run a focused build check**

Run:

```bash
pnpm lint
```

Expected: PASS. If TypeScript or lint reports unused declarations from the move, remove only those unused declarations.

- [ ] **Step 4: Manually verify the existing dashboard still renders**

With `pnpm dev` running, open:

```text
http://localhost:3000/zh-HK
```

Expected: the existing calculator still appears on the dashboard, the `睇圖` button appears after entering a symbol, and positions/history remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sizer/PositionSizerPanel.tsx src/components/Calculator/index.tsx
git commit -m "refactor: share position sizer panel"
```

## Task 3: TradingView Widget Component

**Files:**
- Create: `src/components/Sizer/TradingViewWidget.tsx`

- [ ] **Step 1: Implement the widget component**

Create `src/components/Sizer/TradingViewWidget.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useLocale } from 'next-intl';
import { DEFAULT_TRADING_VIEW_SYMBOL, normalizeTradingViewSymbol } from '@/lib/tradingViewSymbol';

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

const Shell = styled.div`
  min-height: 520px;
  height: calc(100dvh - 104px);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  overflow: hidden;

  @media (max-width: 1023px) {
    height: 58dvh;
    min-height: 360px;
  }
`;

const Container = styled.div`
  width: 100%;
  height: 100%;
`;

interface TradingViewWidgetProps {
  symbol: string;
}

export default function TradingViewWidget({ symbol }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const locale = useLocale();
  const normalizedSymbol = useMemo(
    () => normalizeTradingViewSymbol(symbol || DEFAULT_TRADING_VIEW_SYMBOL),
    [symbol],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const widgetRoot = document.createElement('div');
    widgetRoot.className = 'tradingview-widget-container__widget';
    widgetRoot.style.width = '100%';
    widgetRoot.style.height = '100%';
    container.appendChild(widgetRoot);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: normalizedSymbol,
      interval: 'D',
      timezone: 'Asia/Hong_Kong',
      theme: 'dark',
      style: '1',
      locale: locale === 'zh-HK' ? 'zh_HK' : 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [locale, normalizedSymbol]);

  return (
    <Shell>
      <Container ref={containerRef} />
    </Shell>
  );
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sizer/TradingViewWidget.tsx
git commit -m "feat: add tradingview widget"
```

## Task 4: Dedicated Sizer Route And Workspace

**Files:**
- Create: `src/components/Sizer/SizerWorkspace.tsx`
- Create: `src/app/[locale]/sizer/page.tsx`
- Modify: `src/messages/zh-HK.json`
- Modify: `src/messages/en.json`

- [ ] **Step 1: Add sizer workspace messages**

Add to `src/messages/zh-HK.json` at the top level:

```json
"sizerPage": {
  "title": "Sizer Workspace",
  "chartLabel": "TradingView 圖表"
}
```

Add to `src/messages/en.json` at the top level:

```json
"sizerPage": {
  "title": "Sizer Workspace",
  "chartLabel": "TradingView Chart"
}
```

- [ ] **Step 2: Implement the workspace shell**

Create `src/components/Sizer/SizerWorkspace.tsx`:

```tsx
'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import PositionSizerPanel from '@/components/Sizer/PositionSizerPanel';
import TradingViewWidget from '@/components/Sizer/TradingViewWidget';

const Container = styled.div`
  max-width: 1480px;
  margin: 0 auto;
  padding: 16px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
  }
`;

const PanelRail = styled.div`
  position: sticky;
  top: 72px;

  @media (max-width: 1023px) {
    position: static;
    order: 2;
  }
`;

const ChartRail = styled.section`
  min-width: 0;

  @media (max-width: 1023px) {
    order: 1;
  }
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
`;

export default function SizerWorkspace() {
  const t = useTranslations('sizerPage');
  const [symbol, setSymbol] = useState('');

  return (
    <Container>
      <Grid>
        <PanelRail>
          <PositionSizerPanel chartMode="none" onSymbolChange={setSymbol} />
        </PanelRail>
        <ChartRail aria-label={t('chartLabel')}>
          <ChartHeader>
            <span>{t('chartLabel')}</span>
            <span>{symbol || 'AAPL'}</span>
          </ChartHeader>
          <TradingViewWidget symbol={symbol} />
        </ChartRail>
      </Grid>
    </Container>
  );
}
```

- [ ] **Step 3: Add the localized route**

Create `src/app/[locale]/sizer/page.tsx`:

```tsx
import Header from '@/components/Header';
import SizerWorkspace from '@/components/Sizer/SizerWorkspace';

export default function SizerPage() {
  return (
    <>
      <Header />
      <main>
        <SizerWorkspace />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sizer/SizerWorkspace.tsx src/app/[locale]/sizer/page.tsx src/messages/zh-HK.json src/messages/en.json
git commit -m "feat: add sizer workspace route"
```

## Task 5: Header Navigation

**Files:**
- Modify: `src/components/Header/index.tsx`
- Modify: `src/messages/zh-HK.json`
- Modify: `src/messages/en.json`

- [ ] **Step 1: Add navigation labels**

In `src/messages/zh-HK.json`, extend `header`:

```json
"dashboard": "總覽",
"sizer": "Sizer"
```

In `src/messages/en.json`, extend `header`:

```json
"dashboard": "Dashboard",
"sizer": "Sizer"
```

- [ ] **Step 2: Add route-aware header buttons**

In `src/components/Header/index.tsx`, import `Link`:

```ts
import Link from 'next/link';
```

Add this styled component near `Btn`:

```ts
const NavLink = styled(Link)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  color: ${({ $active, theme }) => $active ? theme.colors.accentText : theme.colors.text};
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.border};
  border-radius: 6px;
  text-decoration: none;
`;
```

Inside `Header`, add:

```ts
const dashboardHref = `/${locale}`;
const sizerHref = `/${locale}/sizer`;
const isSizer = pathname.endsWith('/sizer');
```

Render the links before the currency button:

```tsx
<NavLink href={dashboardHref} $active={!isSizer}>{th('dashboard')}</NavLink>
<NavLink href={sizerHref} $active={isSizer}>{th('sizer')}</NavLink>
```

- [ ] **Step 3: Verify locale switching preserves `/sizer`**

No code change is expected in `switchLocale`; it already replaces only the leading locale segment:

```ts
router.push(pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${next}`));
```

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header/index.tsx src/messages/zh-HK.json src/messages/en.json
git commit -m "feat: add sizer navigation"
```

## Task 6: Final Verification

**Files:**
- No planned source edits unless verification finds a defect.

- [ ] **Step 1: Run unit tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Browser verify desktop**

With `pnpm dev` running, open:

```text
http://localhost:3000/zh-HK/sizer
```

Expected:

- Header shows Dashboard and Sizer navigation.
- Sizer navigation is active.
- Left panel shows the calculator controls.
- Right panel shows a large TradingView chart.
- Entering `0700.HK` updates the chart label to `0700.HK` and the widget script config to `HKEX:700`.
- Existing add-position action still works when valid sizing inputs are entered.

- [ ] **Step 5: Browser verify mobile**

Set the browser viewport to a mobile width around 390px and reload:

```text
http://localhost:3000/zh-HK/sizer
```

Expected:

- TradingView chart appears above the sizing controls.
- Text and controls do not overlap.
- The calculator remains usable.

- [ ] **Step 6: Verify existing dashboard**

Open:

```text
http://localhost:3000/zh-HK
```

Expected:

- Existing dashboard still renders.
- Existing calculator still has its popup chart button.
- Positions/history tabs still work.

- [ ] **Step 7: Commit verification fixes if any**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: polish sizer workspace"
```

If no fixes were required, do not create an empty commit.

## Self-Review

- Spec coverage: The plan adds `/[locale]/sizer`, keeps `/[locale]`, uses a split desktop layout, stacks mobile layout, embeds real TradingView, preserves existing calculator popup behavior, and tests symbol normalization.
- Placeholder scan: No task uses unresolved implementation markers; each code step includes concrete paths, snippets, and commands.
- Type consistency: `normalizeTradingViewSymbol`, `PositionSizerPanel`, `TradingViewWidget`, and `SizerWorkspace` names are consistent across tasks.
