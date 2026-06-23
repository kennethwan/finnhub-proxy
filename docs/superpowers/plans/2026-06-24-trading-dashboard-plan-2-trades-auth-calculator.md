# Trading Dashboard — Plan 2: Trades Data Layer, Auth & Calculator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the trades data layer (Supabase + localStorage repositories behind one interface), Supabase auth (session + login/signup modal), the jotai state for trades/prices/settings, a `useTrades` coordinator hook, and the Calculator UI — replacing the placeholder page with a working position-sizing calculator that adds trades to the (persisted) portfolio.

**Architecture:** A `TradesRepository` interface with two implementations (`LocalTradesRepository` over localStorage, `SupabaseTradesRepository` over the `trades` table) sharing one DTO mapper. jotai atoms hold trades/user/prices/settings; a `useTrades` hook picks the repository by auth state and keeps the `tradesAtom` in sync. The Calculator is a styled-components client component that calls the already-tested `calculatePosition` from `lib/finance.ts` and writes new trades through `useTrades`. Pure logic (mapper) is unit-tested; repositories and hooks are thin.

**Tech Stack:** Next.js 16, React 19, TypeScript, styled-components, jotai, @supabase/supabase-js, Vitest. Builds on Plan 1 (`lib/finance.ts`, `lib/format.ts`, `types/trade.ts`, theme, i18n, `supabaseClient`).

## Global Constraints

- Reference behavior is the legacy `index.html` (root of repo) — its auth handlers (`handleAuth`, `signOut`, session listener), trade CRUD (`loadTradesFromSupabase`, `saveTradeToSupabase`, `updateTradeInSupabase`, `deleteTradeFromSupabase`, `addToTrades`, `updateTrailingStop`, `closeTrade`, `deleteTrade`), and calculator are the source of truth for behavior. Match it; do not invent new semantics.
- **Supabase `trades` table column ↔ field mapping (EXACT, from `index.html`):** `entry_price↔entryPrice`, `shares↔shares`, `initial_stop_loss↔initialStopLoss`, `current_stop_loss↔currentStopLoss`, `target_price↔targetPrice`, `status↔status`, `risk_amount↔riskAmount`, `stop_loss_history↔stopLossHistory`, `exit_price↔exitPrice`, `pnl↔pnl`, `closed_at↔closedAt`, `created_at↔createdAt`, plus `user_id` (write) and `id`. Nullable money fields write `|| null`.
- **localStorage key for anonymous trades: `stock-trades-v3`** (unchanged — existing anon users' data must load).
- Anonymous = localStorage; logged-in = Supabase. On the calculator, a new trade goes to Supabase first (to get the row `id`) when logged in, else stays local with `id: Date.now()`.
- All money math via `lib/finance.ts` / `lib/format.ts` — do NOT re-derive position sizing.
- Styling: styled-components reading `theme.colors.*` (no hardcoded hex); match the Plan 1 terminal aesthetic (charcoal/amber dark, light variant).
- Cantonese (zh-HK) copy comes from `messages/*.json`; reuse the existing key style. Where the legacy UI hardcoded Cantonese strings, add them as message keys.
- pnpm; conventional commits; no attribution footer. Run focused tests during work, full suite once before each commit.

---

## File Structure (created/modified in this plan)

```
src/types/trade.ts                 (modify: add TradeDto + CreateTradeInput types)
src/lib/trades/tradeMapper.ts      (+test)   dto<->domain mapping
src/lib/trades/repository.ts                 TradesRepository interface
src/lib/trades/localTradesRepository.ts      localStorage impl
src/lib/trades/supabaseTradesRepository.ts   Supabase impl
src/lib/auth.ts                              supabase auth wrappers
src/store/tradesAtom.ts
src/store/userAtom.ts
src/store/pricesAtom.ts
src/store/fullPositionAtom.ts
src/hooks/useAuth.ts                         session listener + login/signup/signout
src/hooks/useTrades.ts                       repo selection + CRUD + atom sync
src/components/AuthModal/index.tsx
src/components/Calculator/index.tsx
src/components/ui/Field.tsx                  labeled input primitive
src/app/[locale]/page.tsx          (modify: render Calculator)
src/messages/{zh-HK,en}.json       (modify: calculator/auth keys)
```

---

### Task 1: Trade DTO types + mapper (TDD)

**Files:**
- Modify: `src/types/trade.ts`
- Create: `src/lib/trades/tradeMapper.ts`, `src/lib/trades/tradeMapper.test.ts`

**Interfaces:**
- Produces: `TradeDto` (snake_case DB shape), `CreateTradeInput`; `dtoToTrade(dto: TradeDto): Trade`, `tradeToDbRow(trade: Trade, userId: string): Omit<TradeDto,'id'|'created_at'>`.

- [ ] **Step 1: Add DTO types to `src/types/trade.ts`** (append)

```ts
export interface TradeDto {
  id: string | number;
  user_id?: string;
  symbol: string;
  entry_price: number;
  shares: number;
  initial_stop_loss: number;
  current_stop_loss: number;
  target_price: number | null;
  status: TradeStatus;
  risk_amount: number;
  stop_loss_history: StopLossEntry[] | null;
  exit_price: number | null;
  pnl: number | null;
  closed_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Write failing tests** — `src/lib/trades/tradeMapper.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { dtoToTrade, tradeToDbRow } from './tradeMapper';
import type { TradeDto, Trade } from '@/types/trade';

const dto: TradeDto = {
  id: 'abc', user_id: 'u1', symbol: 'AAPL', entry_price: 150, shares: 128,
  initial_stop_loss: 145, current_stop_loss: 145, target_price: 165, status: 'open',
  risk_amount: 640, stop_loss_history: [{ price: 145, date: '2026-06-10T00:00:00Z', note: '初始止損' }],
  exit_price: null, pnl: null, closed_at: null, created_at: '2026-06-10T00:00:00Z',
};

describe('dtoToTrade', () => {
  it('maps snake_case columns to camelCase domain fields', () => {
    const t = dtoToTrade(dto);
    expect(t).toMatchObject({
      id: 'abc', symbol: 'AAPL', entryPrice: 150, shares: 128, initialStopLoss: 145,
      currentStopLoss: 145, targetPrice: 165, status: 'open', riskAmount: 640,
      createdAt: '2026-06-10T00:00:00Z', exitPrice: null, pnl: null, closedAt: null,
    });
    expect(t.stopLossHistory).toEqual(dto.stop_loss_history);
  });
  it('defaults null stop_loss_history to []', () => {
    expect(dtoToTrade({ ...dto, stop_loss_history: null }).stopLossHistory).toEqual([]);
  });
});

describe('tradeToDbRow', () => {
  it('maps domain fields to DB columns with user_id and null-coalesced money', () => {
    const trade: Trade = dtoToTrade(dto);
    const row = tradeToDbRow(trade, 'u1');
    expect(row).toMatchObject({
      user_id: 'u1', symbol: 'AAPL', entry_price: 150, shares: 128, initial_stop_loss: 145,
      current_stop_loss: 145, target_price: 165, status: 'open', risk_amount: 640,
      exit_price: null, pnl: null, closed_at: null,
    });
    expect(row.stop_loss_history).toEqual(trade.stopLossHistory);
    expect('id' in row).toBe(false);
    expect('created_at' in row).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests, verify RED**

Run: `pnpm test src/lib/trades/tradeMapper.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/trades/tradeMapper.ts`**

```ts
import type { Trade, TradeDto } from '@/types/trade';

export function dtoToTrade(dto: TradeDto): Trade {
  return {
    id: dto.id,
    symbol: dto.symbol,
    entryPrice: dto.entry_price,
    shares: dto.shares,
    initialStopLoss: dto.initial_stop_loss,
    currentStopLoss: dto.current_stop_loss,
    targetPrice: dto.target_price,
    status: dto.status,
    riskAmount: dto.risk_amount,
    createdAt: dto.created_at,
    stopLossHistory: dto.stop_loss_history ?? [],
    exitPrice: dto.exit_price,
    pnl: dto.pnl,
    closedAt: dto.closed_at,
  };
}

export function tradeToDbRow(trade: Trade, userId: string) {
  return {
    user_id: userId,
    symbol: trade.symbol,
    entry_price: trade.entryPrice,
    shares: trade.shares,
    initial_stop_loss: trade.initialStopLoss,
    current_stop_loss: trade.currentStopLoss,
    target_price: trade.targetPrice,
    status: trade.status,
    risk_amount: trade.riskAmount,
    stop_loss_history: trade.stopLossHistory,
    exit_price: trade.exitPrice ?? null,
    pnl: trade.pnl ?? null,
    closed_at: trade.closedAt ?? null,
  };
}
```

- [ ] **Step 5: Run tests, verify GREEN.** Run: `pnpm test src/lib/trades/tradeMapper.test.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/trade.ts src/lib/trades/tradeMapper.ts src/lib/trades/tradeMapper.test.ts
git commit -m "feat: add trade DTO types and dto<->domain mapper with tests"
```

---

### Task 2: TradesRepository interface + localStorage implementation

**Files:**
- Create: `src/lib/trades/repository.ts`, `src/lib/trades/localTradesRepository.ts`, `src/lib/trades/localTradesRepository.test.ts`

**Interfaces:**
- Consumes: `Trade` (types).
- Produces:
  - `interface TradesRepository { load(): Promise<Trade[]>; add(t: Trade): Promise<Trade>; update(t: Trade): Promise<void>; remove(id: Trade['id']): Promise<void>; }`
  - `class LocalTradesRepository implements TradesRepository` (key `stock-trades-v3`).

- [ ] **Step 1: Create `src/lib/trades/repository.ts`**

```ts
import type { Trade } from '@/types/trade';

export interface TradesRepository {
  load(): Promise<Trade[]>;
  add(trade: Trade): Promise<Trade>;     // returns the stored trade (id may change)
  update(trade: Trade): Promise<void>;
  remove(id: Trade['id']): Promise<void>;
}
```

- [ ] **Step 2: Write failing tests** — `src/lib/trades/localTradesRepository.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalTradesRepository } from './localTradesRepository';
import type { Trade } from '@/types/trade';

const t = (over: Partial<Trade> = {}): Trade => ({
  id: 1, symbol: 'AAPL', entryPrice: 150, shares: 10, initialStopLoss: 145, currentStopLoss: 145,
  targetPrice: null, status: 'open', riskAmount: 50, createdAt: '2026-06-10T00:00:00Z',
  stopLossHistory: [], exitPrice: null, pnl: null, closedAt: null, ...over,
});

describe('LocalTradesRepository', () => {
  beforeEach(() => localStorage.clear());

  it('loads [] when empty', async () => {
    expect(await new LocalTradesRepository().load()).toEqual([]);
  });
  it('add persists to the stock-trades-v3 key and returns the trade', async () => {
    const repo = new LocalTradesRepository();
    const added = await repo.add(t({ id: 99 }));
    expect(added.id).toBe(99);
    expect(JSON.parse(localStorage.getItem('stock-trades-v3')!)).toHaveLength(1);
    expect(await repo.load()).toHaveLength(1);
  });
  it('update replaces by id', async () => {
    const repo = new LocalTradesRepository();
    await repo.add(t({ id: 1, currentStopLoss: 145 }));
    await repo.update(t({ id: 1, currentStopLoss: 152 }));
    expect((await repo.load())[0].currentStopLoss).toBe(152);
  });
  it('remove deletes by id', async () => {
    const repo = new LocalTradesRepository();
    await repo.add(t({ id: 1 }));
    await repo.add(t({ id: 2 }));
    await repo.remove(1);
    const all = await repo.load();
    expect(all.map((x) => x.id)).toEqual([2]);
  });
});
```

- [ ] **Step 3: Run tests, verify RED.** Run: `pnpm test src/lib/trades/localTradesRepository.test.ts` — Expected: FAIL.

- [ ] **Step 4: Implement `src/lib/trades/localTradesRepository.ts`**

```ts
import type { Trade } from '@/types/trade';
import type { TradesRepository } from './repository';

const KEY = 'stock-trades-v3';

export class LocalTradesRepository implements TradesRepository {
  private read(): Trade[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Trade[]) : [];
  }
  private write(trades: Trade[]): void {
    localStorage.setItem(KEY, JSON.stringify(trades));
  }
  async load(): Promise<Trade[]> {
    return this.read();
  }
  async add(trade: Trade): Promise<Trade> {
    this.write([trade, ...this.read()]);
    return trade;
  }
  async update(trade: Trade): Promise<void> {
    this.write(this.read().map((t) => (t.id === trade.id ? trade : t)));
  }
  async remove(id: Trade['id']): Promise<void> {
    this.write(this.read().filter((t) => t.id !== id));
  }
}
```

- [ ] **Step 5: Run tests, verify GREEN.** (jsdom provides `localStorage`.) Run: `pnpm test src/lib/trades/localTradesRepository.test.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trades/repository.ts src/lib/trades/localTradesRepository.ts src/lib/trades/localTradesRepository.test.ts
git commit -m "feat: add TradesRepository interface and localStorage implementation with tests"
```

---

### Task 3: Supabase trades repository

**Files:**
- Create: `src/lib/trades/supabaseTradesRepository.ts`

**Interfaces:**
- Consumes: `supabase` (Plan 1), `dtoToTrade`/`tradeToDbRow` (Task 1), `TradesRepository` (Task 2).
- Produces: `class SupabaseTradesRepository implements TradesRepository` constructed with `userId: string`.

- [ ] **Step 1: Implement `src/lib/trades/supabaseTradesRepository.ts`** (mirrors `index.html` queries)

```ts
import { supabase } from '@/lib/supabaseClient';
import type { Trade, TradeDto } from '@/types/trade';
import type { TradesRepository } from './repository';
import { dtoToTrade, tradeToDbRow } from './tradeMapper';

export class SupabaseTradesRepository implements TradesRepository {
  constructor(private readonly userId: string) {}

  async load(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as TradeDto[]).map(dtoToTrade);
  }

  async add(trade: Trade): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert(tradeToDbRow(trade, this.userId))
      .select()
      .single();
    if (error) throw error;
    return { ...trade, id: (data as TradeDto).id };
  }

  async update(trade: Trade): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update({
        current_stop_loss: trade.currentStopLoss,
        stop_loss_history: trade.stopLossHistory,
        status: trade.status,
        exit_price: trade.exitPrice ?? null,
        pnl: trade.pnl ?? null,
        closed_at: trade.closedAt ?? null,
      })
      .eq('id', trade.id)
      .eq('user_id', this.userId);
    if (error) throw error;
  }

  async remove(id: Trade['id']): Promise<void> {
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', this.userId);
    if (error) throw error;
  }
}
```

- [ ] **Step 2: Verify typecheck.** Run: `pnpm exec tsc --noEmit` — Expected: PASS. (No unit test: this is a thin Supabase adapter; its mapping logic is covered by Task 1's mapper tests. Integration is exercised manually in Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/trades/supabaseTradesRepository.ts
git commit -m "feat: add Supabase trades repository"
```

---

### Task 4: Store atoms (trades, user, prices, fullPosition)

**Files:**
- Create: `src/store/tradesAtom.ts`, `src/store/userAtom.ts`, `src/store/pricesAtom.ts`, `src/store/fullPositionAtom.ts`

**Interfaces:**
- Produces: `tradesAtom: PrimitiveAtom<Trade[]>`; `userAtom: PrimitiveAtom<User | null>`; `pricesAtom: PrimitiveAtom<Record<string, PriceData>>`; `fullPositionPctAtom` (`atomWithStorage`, key `full-position-pct`, default `0.5`).

- [ ] **Step 1: Create the atoms**

`src/store/tradesAtom.ts`:
```ts
import { atom } from 'jotai';
import type { Trade } from '@/types/trade';
export const tradesAtom = atom<Trade[]>([]);
```
`src/store/userAtom.ts`:
```ts
import { atom } from 'jotai';
import type { User } from '@supabase/supabase-js';
export const userAtom = atom<User | null>(null);
```
`src/store/pricesAtom.ts`:
```ts
import { atom } from 'jotai';
import type { PriceData } from '@/types/trade';
export const pricesAtom = atom<Record<string, PriceData>>({});
```
`src/store/fullPositionAtom.ts`:
```ts
import { atomWithStorage } from 'jotai/utils';
export const fullPositionPctAtom = atomWithStorage<number>('full-position-pct', 0.5);
```

- [ ] **Step 2: Verify typecheck.** Run: `pnpm exec tsc --noEmit` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/store/tradesAtom.ts src/store/userAtom.ts src/store/pricesAtom.ts src/store/fullPositionAtom.ts
git commit -m "feat: add trades, user, prices and full-position store atoms"
```

---

### Task 5: Auth — wrappers + `useAuth` hook

**Files:**
- Create: `src/lib/auth.ts`, `src/hooks/useAuth.ts`

**Interfaces:**
- Consumes: `supabase`, `userAtom`, `tradesAtom`.
- Produces: `signIn(email,password)`, `signUp(email,password)`, `signOut()` in `lib/auth.ts`; `useAuth()` → `{ user, signIn, signUp, signOut }` and installs the `onAuthStateChange` listener + initial `getSession`.

- [ ] **Step 1: Implement `src/lib/auth.ts`** (mirrors `index.html` handleAuth/signOut)

```ts
import { supabase } from '@/lib/supabaseClient';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}
```

- [ ] **Step 2: Implement `src/hooks/useAuth.ts`**

```ts
'use client';

import { useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { supabase } from '@/lib/supabaseClient';
import { userAtom } from '@/store/userAtom';
import { tradesAtom } from '@/store/tradesAtom';
import { signIn, signUp, signOutUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useAtom(userAtom);
  const setTrades = useSetAtom(tradesAtom);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null),
    );
    return () => subscription.unsubscribe();
  }, [setUser]);

  return {
    user,
    signIn,
    signUp,
    signOut: async () => {
      await signOutUser();
      setTrades([]);
    },
  };
}
```

- [ ] **Step 3: Verify typecheck + build.** Run: `pnpm exec tsc --noEmit` then `pnpm build` — Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/hooks/useAuth.ts
git commit -m "feat: add Supabase auth wrappers and useAuth hook"
```

---

### Task 6: `useTrades` coordinator hook

**Files:**
- Create: `src/hooks/useTrades.ts`

**Interfaces:**
- Consumes: `userAtom`, `tradesAtom`, repositories (Tasks 2-3).
- Produces: `useTrades()` → `{ trades, reload, addTrade, updateStop, closeTrade, removeTrade, syncing }`. Picks `SupabaseTradesRepository(user.id)` when logged in else `LocalTradesRepository`. Loads on user change. `addTrade(trade)` persists + prepends to `tradesAtom`; `updateStop(id, newStop)` appends a `stopLossHistory` entry (note `'✅ Risk Free!'` if `newStop >= entryPrice` else `'推高止損'`) and persists; `closeTrade(id, exitPrice)` sets status/exit/pnl/closedAt and persists; `removeTrade(id)` deletes.

- [ ] **Step 1: Implement `src/hooks/useTrades.ts`** (CRUD mirrors `index.html`)

```ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { userAtom } from '@/store/userAtom';
import { tradesAtom } from '@/store/tradesAtom';
import { LocalTradesRepository } from '@/lib/trades/localTradesRepository';
import { SupabaseTradesRepository } from '@/lib/trades/supabaseTradesRepository';
import type { Trade } from '@/types/trade';

export function useTrades() {
  const user = useAtomValue(userAtom);
  const [trades, setTrades] = useAtom(tradesAtom);
  const [syncing, setSyncing] = useState(false);

  const repo = useMemo(
    () => (user ? new SupabaseTradesRepository(user.id) : new LocalTradesRepository()),
    [user],
  );

  const reload = useCallback(async () => {
    setSyncing(true);
    try {
      setTrades(await repo.load());
    } finally {
      setSyncing(false);
    }
  }, [repo, setTrades]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTrade = useCallback(
    async (trade: Trade) => {
      const stored = await repo.add(trade);
      setTrades((prev) => [stored, ...prev]);
      return stored;
    },
    [repo, setTrades],
  );

  const updateStop = useCallback(
    async (id: Trade['id'], newStop: number) => {
      const current = trades.find((t) => t.id === id);
      if (!current) return;
      const isRiskFree = newStop >= current.entryPrice;
      const updated: Trade = {
        ...current,
        currentStopLoss: newStop,
        stopLossHistory: [
          ...current.stopLossHistory,
          { price: newStop, date: new Date().toISOString(), note: isRiskFree ? '✅ Risk Free!' : '推高止損' },
        ],
      };
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await repo.update(updated);
    },
    [repo, setTrades, trades],
  );

  const closeTrade = useCallback(
    async (id: Trade['id'], exitPrice: number) => {
      const current = trades.find((t) => t.id === id);
      if (!current) return;
      const updated: Trade = {
        ...current,
        status: 'closed',
        exitPrice,
        pnl: (exitPrice - current.entryPrice) * current.shares,
        closedAt: new Date().toISOString(),
      };
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await repo.update(updated);
    },
    [repo, setTrades, trades],
  );

  const removeTrade = useCallback(
    async (id: Trade['id']) => {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      await repo.remove(id);
    },
    [repo, setTrades],
  );

  return { trades, reload, addTrade, updateStop, closeTrade, removeTrade, syncing };
}
```

> Note: `new Date().toISOString()` runs only in event handlers (client), never during render — safe for SSR/determinism.

- [ ] **Step 2: Verify typecheck + build.** Run: `pnpm exec tsc --noEmit` then `pnpm build` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTrades.ts
git commit -m "feat: add useTrades coordinator hook (repo selection + CRUD)"
```

---

### Task 7: AuthModal + Field primitive + message keys

**Files:**
- Create: `src/components/ui/Field.tsx`, `src/components/AuthModal/index.tsx`
- Modify: `src/messages/zh-HK.json`, `src/messages/en.json`

**Interfaces:**
- Consumes: `useAuth` (Task 5), theme.
- Produces: `<Field label>` (labeled input) and `<AuthModal open onClose>` (login/signup toggle, calls `signIn`/`signUp`, shows success/error).

- [ ] **Step 1: Add message keys** to both files under a new `auth` and `field` section, e.g. zh-HK: `{"auth":{"login":"登入","signup":"註冊","email":"Email","password":"密碼","toSignup":"未有帳戶？註冊","toLogin":"已有帳戶？登入","signupSuccess":"註冊成功！請檢查你嘅 email 確認帳戶。","cta":"🔐 登入 / 註冊"}}` and the en equivalents.

- [ ] **Step 2: Implement `src/components/ui/Field.tsx`**

```tsx
'use client';
import styled from 'styled-components';

const Label = styled.label`
  display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: 6px; font-weight: 600;
`;
const Input = styled.input`
  width: 100%; padding: 10px 12px; border-radius: 6px;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-family: inherit; font-variant-numeric: tabular-nums;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.accent}; }
`;

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label: string; }
export default function Field({ label, ...props }: FieldProps) {
  return (<div><Label>{label}</Label><Input {...props} /></div>);
}
```

- [ ] **Step 3: Implement `src/components/AuthModal/index.tsx`** (mirrors `index.html` auth modal)

```tsx
'use client';
import { useState } from 'react';
import styled from 'styled-components';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import Field from '@/components/ui/Field';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.7); padding: 16px;
`;
const Card = styled.div`
  width: 100%; max-width: 360px; border-radius: 12px; padding: 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;
const Primary = styled.button`
  width: 100%; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
  background: ${({ theme }) => theme.colors.accent}; color: #000;
`;
const Msg = styled.div<{ $ok: boolean }>`
  font-size: 13px; padding: 8px 12px; border-radius: 6px; margin-top: 4px;
  color: ${({ $ok, theme }) => ($ok ? theme.colors.positive : theme.colors.negative)};
  border: 1px solid ${({ $ok, theme }) => ($ok ? theme.colors.positive : theme.colors.negative)};
`;

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('auth');
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setMsg({ ok: true, text: t('signupSuccess') });
      } else {
        await signIn(email, password);
        onClose();
        setEmail(''); setPassword('');
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Error' });
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <strong>{mode === 'login' ? t('login') : t('signup')}</strong>
          <button onClick={onClose} aria-label="close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('email')} type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
          <Field label={t('password')} type="password" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
          {msg && <Msg $ok={msg.ok}>{msg.text}</Msg>}
          <Primary type="submit">{mode === 'login' ? t('login') : t('signup')}</Primary>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}
          style={{ marginTop: 16, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          {mode === 'login' ? t('toSignup') : t('toLogin')}
        </button>
      </Card>
    </Overlay>
  );
}
```

- [ ] **Step 4: Verify build.** Run: `pnpm build` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Field.tsx src/components/AuthModal/index.tsx src/messages/zh-HK.json src/messages/en.json
git commit -m "feat: add AuthModal and Field primitive with i18n keys"
```

---

### Task 8: Calculator component + wire into page + account UI in Header

**Files:**
- Create: `src/components/Calculator/index.tsx`
- Modify: `src/app/[locale]/page.tsx`, `src/components/Header/index.tsx`, `src/messages/{zh-HK,en}.json`

**Interfaces:**
- Consumes: `calculatePosition` (`lib/finance`), `formatCurrency`/`getSymbolCurrency` (`lib/format`), `useTrades.addTrade`, `currencyAtom`, `fullPositionPctAtom`, `useAuth`.
- Produces: `<Calculator/>` (form + live results + 加入持倉) rendered on the page; Header shows account (email + logout) or a 登入/註冊 button opening `AuthModal`.

- [ ] **Step 1: Implement `src/components/Calculator/index.tsx`**

State: `symbol, capital('128000'), maxLossPercent('0.5'), buyPrice, targetPrice, stopLossType('price'|'percent'), stopLoss, stopLossPercent`. Compute `stop` (price mode = `parseFloat(stopLoss)`; percent mode = `buyPrice*(1-pct/100)`). Call `calculatePosition({capital, buyPrice, stop, maxLossPercent, targetPrice})`. Render results when non-null (error card if `'error' in result`): suggested shares, R:R, stop price/risk cells, potential profit, and a 加入持倉 button (disabled unless `symbol.trim()` and a valid non-error result). On add, build the `Trade` exactly like `index.html addToTrades` (`id: Date.now()`, `entryPrice: parseFloat(buyPrice)`, `shares: result.shares`, `initialStopLoss: result.actualStopLoss`, `currentStopLoss: result.actualStopLoss`, `targetPrice: parseFloat(targetPrice)||null`, `status: 'open'`, `riskAmount: result.actualRisk`, `createdAt: now`, `stopLossHistory: [{price: result.actualStopLoss, date: now, note: '初始止損'}]`), call `addTrade`, then reset inputs. Use styled-components reading `theme.colors.*`; numbers in `font-variant-numeric: tabular-nums`. Money via `formatCurrency(value, getSymbolCurrency(symbol), currency)`. All visible strings via `useTranslations('calculator')` (add keys: 股票代號/總本金/最大虧損/買入價/目標價/止損/價格/百分比/建議買入/股/所需資金/本金/風險回報/止損價/風險金額/潛在盈利/加入持倉 — with en equivalents).

(The implementer writes the full component following this spec and the legacy `index.html` calculator markup lines 561-648; keep the math in `calculatePosition`, do not recompute.)

- [ ] **Step 2: Wire `<Calculator/>` into `src/app/[locale]/page.tsx`** (replace the "Dashboard coming soon…" main)

```tsx
import Header from '@/components/Header';
import Calculator from '@/components/Calculator';

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <Calculator />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Add account UI to `src/components/Header/index.tsx`**

Add (client) `useAuth()` + local `authOpen` state. Render: if `user` → email (truncated) + a logout button (`signOut`); else a button (`t('cta')` from `auth`) that opens `<AuthModal open={authOpen} onClose={...} />`. Render `<AuthModal/>` once in the header. Keep the existing currency/language/theme buttons.

- [ ] **Step 4: Verify build + tests + live.** Run `pnpm build` (PASS) and `pnpm test` (all prior tests still pass). Then with `pnpm dev`: open `/zh-HK`, enter AAPL / buy 150 / stop 145 / target 165 → expect **128 股**, R:R **1:3.00**, potential profit **$1,920**; click 加入持倉 → no error (trade persists to localStorage when logged out — verify `localStorage['stock-trades-v3']` has 1 entry).

- [ ] **Step 5: Commit**

```bash
git add src/components/Calculator src/app/[locale]/page.tsx src/components/Header src/messages
git commit -m "feat: add position-sizing Calculator and account UI; wire into dashboard"
```

---

## Plan 2 Deliverable

A working Calculator on the dashboard that sizes positions (via the Plan-1 `calculatePosition`) and adds them to a persisted portfolio (Supabase when logged in via the new AuthModal, else localStorage under `stock-trades-v3`), backed by a clean `TradesRepository` abstraction with a tested mapper. Next: **Plan 3 — Positions & History views + portfolio/Drawdown summary + live price polling** (renders the trades this plan persists).

## Self-Review

- **Spec coverage:** §5 persistence (Tasks 1-3), §6 atoms (Task 4), auth (Task 5), trade CRUD semantics (Task 6, mirrors `index.html`), calculator (Task 8). Positions/History rendering, summary, charts → Plans 3-4 (out of scope here).
- **Placeholder scan:** Task 8 Step 1 describes the Calculator in prose + points to exact legacy markup lines and the exact `Trade` shape rather than pasting 90 lines of JSX — the field list, state list, and add-trade object are fully specified; acceptable as the component is a styling transcription of a referenced source with the math already in `calculatePosition`.
- **Type consistency:** `TradesRepository.add` returns `Trade` (id may change on Supabase insert) — `useTrades.addTrade` and the Supabase impl agree. `dtoToTrade`/`tradeToDbRow` column names match the Global Constraints mapping and `index.html`. `Trade['id']` used for `remove`/`update` consistently.
