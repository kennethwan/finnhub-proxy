# 倉位計算器 → Next.js 重構 + 風險分析儀表板 — Design Spec

**Date:** 2026-06-24
**Status:** Draft (pending user review)
**Author:** Kenneth + Claude

---

## 1. Overview & Goals

把現有單檔 `index.html`(CDN + in-browser Babel React)嘅「股票倉位計算器」重構成用家平常用開嘅 stack(Next.js + TypeScript),並擴充成一個風險分析儀表板,功能對齊現有 Android app。

**核心目標:**
1. **拆 tab** — 將 `持倉`(未平倉)同 `歷史`(已平倉)分做兩個獨立 view。
2. **加風險數值** — 加入 NAV / Exposure / Drawdown summary 同每單交易嘅 R / FP / SDD / MDD 等(見 §7,只顯示有把握計啱嘅,其餘留空)。
3. **Light / Dark mode switch** — 用 styled-components theme + jotai 切換。
4. **改用慣用 stack + 多檔案結構** — 唔再用單一 `index.html`。
5. **圖表 + 建議 key level 止損/止賺價** — 移植兼擴充 Android 嘅 chart sheet 同 key-level 偵測(見 §9)。

**保持不變:** Supabase `trades` 表結構、現有 localStorage 資料、Android app、`/api/quotes` + `/api/candles` 對外行為、Finnhub/Yahoo 報價/K線邏輯。

---

## 2. Key Decisions (已拍板)

| 決定 | 選擇 |
|---|---|
| Tech stack | Next.js 16 App Router · React 19 · TS 5.9 · **styled-components 6(主)** + Tailwind v4(layout utils)· **jotai** · axios · lucide-react · next-intl(跟 `Nextjs-Template-2026`) |
| 圖表 | **lightweight-charts**(TradingView OSS, MIT)— candlestick + price line + tap 揀價 |
| 擺位 | **原地改造 `finnhub-proxy`** repo(移除 `index.html` + `server.js`;`/api/*` 變 Route Handler;`android/` 同 Supabase 不變) |
| i18n | **繁中 zh-HK(預設)+ English**,next-intl `[locale]` 路由 |
| Light/Dark | `theme.ts` 出 `lightTheme` + `darkTheme`,jotai `themeAtom`(存 localStorage,預設 **dark**),ThemeProvider 切換,header `Sun/Moon` 掣 |
| 止賺 key level | 阻力位(swing highs)做建議 + 1R/2R/3R 參考線(見 §9) |
| Layout | 桌面:計算器 sticky 左 rail + 右邊(Summary 置頂 + `[持倉\|歷史]` 子分頁 + 交易表);手機:`計算器/持倉/歷史` 三 tab |

---

## 3. Architecture & Deployment

### 3.1 Repo 轉換
`finnhub-proxy` 由「Express static server」變成「Next.js app」:

- **移除:** `index.html`、`server.js`。
- **移植:** `api/quotes.js` → `src/app/api/quotes/route.ts`;`api/candles.js` → `src/app/api/candles/route.ts`(Android chart sheet 用,保留以免整爛 Android)。邏輯不變:`.HK` → yahoo-finance2,其餘 → Finnhub。
- **`package.json`:** 由 Express 套件改成 Next 套件集(對齊 template)+ `lightweight-charts`,`scripts` = `dev/build/start/lint` + `test`。
- **`android/`:** 完全不動(已 gitignore build 產物)。

### 3.2 部署
- Vercel 原生偵測 Next.js;`vercel.json` 簡化或移除。
- Deploy URL / Vercel project 不變 → Android app 照打同一個 `/api/quotes`、`/api/candles`。

### 3.3 環境變數(由硬編碼搬入 `.env`)
| Var | 用途 | 暴露 |
|---|---|---|
| `FINNHUB_API_KEY` | 報價(server-only,route handler 用) | server |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon | client |

> `trades` 表 RLS 已按 `user_id` 隔離,anon key 屬公開類別,搬入 env 係順手安全改善。

---

## 4. Project Structure

```
finnhub-proxy/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/ layout.tsx · page.tsx        # dashboard
│  │  └─ api/ quotes/route.ts · candles/route.ts
│  ├─ components/
│  │  ├─ Header/                 # brand · CurrencyToggle · ThemeToggle · LanguageSwitch · account
│  │  ├─ Calculator/             # 倉位計算 form + 結果 + 開圖表掣
│  │  ├─ Summary/                # PositionsSummary · HistorySummary
│  │  ├─ Positions/              # 未平倉列表 + TradeCard
│  │  ├─ History/                # 已平倉列表 + HistoryCard
│  │  ├─ Chart/                  # CandleChart(lightweight-charts wrapper)· StopTargetChartDialog · TradeChartDialog
│  │  ├─ AuthModal/
│  │  └─ ui/                     # StatTile, Segmented, Field 等 styled primitives
│  ├─ store/                     # jotai atoms (見 §6)
│  ├─ lib/
│  │  ├─ supabaseClient.ts
│  │  ├─ finance.ts (+test)      # NAV/SDD/MDD/R/FP 純函數計算 (§7)
│  │  ├─ keyLevels.ts (+test)    # swing 高/低 偵測 (§9)
│  │  └─ format.ts               # 貨幣 / % 格式化 + convertCurrency
│  ├─ types/  trade.ts · candle.ts
│  ├─ styles/ theme.ts (light+dark) · globals.ts · registry.tsx
│  └─ i18n/   config.ts · request.ts · messages/{zh-HK,en}.json
├─ android/                      # 不變
└─ docs/superpowers/specs/…
```

設計原則:**計算/演算邏輯(`lib/finance.ts`、`lib/keyLevels.ts`)同 UI 完全分離** —— 純函數、可獨立單元測試、唔掂 React/DOM。

---

## 5. Data Model

### 5.1 `Trade`(對齊現有 Supabase `trades` 表,欄位不變)
```ts
interface Trade {
  id: string | number;
  symbol: string;
  entryPrice: number;        // E
  shares: number;            // Q
  initialStopLoss: number;   // IS
  currentStopLoss: number;   // CS
  targetPrice: number | null;
  status: 'open' | 'closed';
  riskAmount: number;
  createdAt: string;
  stopLossHistory: { price: number; date: string; note: string }[];
  exitPrice?: number | null; // X
  pnl?: number | null;
  closedAt?: string | null;
}
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
```

### 5.2 持久化
- **登入:** Supabase `trades`(同現有 mapping)。
- **匿名:** localStorage key `stock-trades-v3`(**沿用** → 舊資料自動帶過嚟)。
- Settings:`display-currency`、`theme-mode`、`full-position-pct` 各自存 localStorage。

---

## 6. State (jotai atoms)

| Atom | 內容 | 持久化 |
|---|---|---|
| `tradesAtom` | `Trade[]` | Supabase / localStorage |
| `userAtom` | Supabase session user / null | — |
| `pricesAtom` | `{ [symbol]: { price, change, changePercent, updatedAt } }` | — |
| `currencyAtom` | `'USD' \| 'HKD'` | localStorage |
| `themeAtom` | `'dark' \| 'light'`(預設 dark) | localStorage |
| `fullPositionPctAtom` | number(預設 0.5) | localStorage |
| UI state | `activeTab`、子分頁、開住邊個 chart | 元件本地 |

持久化用 jotai `atomWithStorage`。報價輪詢:hook `usePricePolling`(有未平倉時每 60s 經 `/api/quotes` 更新 `pricesAtom`)。K線:hook `useCandles(symbol,range,interval)`。

---

## 7. Finance / Calculation Spec (`lib/finance.ts`)

符號:**E**=入場價、**Q**=股數、**IS**=初始止損、**CS**=現時止損、**P**=現價、**X**=平倉價、**C**=本金(USD base)、**1FP$** = `fullPositionPct% × C`。

### 7.1 倉位計算(沿用現有)
`riskPerShare = E − stop`;`shares = floor((C × maxLoss%) / riskPerShare)`;R:R、潛在盈利同現狀。

### 7.2 每單 metrics
| 欄 | 公式 | 顯示 |
|---|---|---|
| Amt Allocated | Q×E | ✅ |
| % Allocated (%C) | Q×E ÷ C | ✅ |
| Ptn Sizing | 入場風險$ ÷ 1FP$ → `1 FP`/`½ HP`/`0.7×` | ✅ |
| # of days | today − createdAt(平倉:closedAt − createdAt) | ✅ |
| Market Price | P(平倉:X) | ✅ |
| Current Trade Ch% | (P−E)÷E | ✅ |
| Current Trade R | (P−E)÷(E−IS) | ✅ |
| Status | 未平倉 CS≥E→`Risk Free` 否則 `At Risk`;平倉 pnl≥0→`Win` 否則 `Loss` | ✅ |
| Long/Short | `Long`(暫 long-only) | ✅ |
| SDD `R\|US$\|%C` | (CS−E):US$=(CS−E)Q、R=(CS−E)/(E−IS) | ✅ |
| WDD `R\|US$\|%C` | (IS−E):R=−1、US$=−riskAmount | ✅ |
| MDD `R\|US$\|%C` | (CS−P):US$=(CS−P)Q、R=(CS−P)/(E−IS) | ✅ |

### 7.3 Portfolio aggregates(持倉 summary,先轉顯示幣再加總)
Capital=C;Unrlzd=Σ_open (P−E)Q;Rlzd=Σ_closed pnl;Total=Unrlzd+Rlzd;**NAV**=C+Total;% Invested=Σ_open(Q×P)÷NAV;# of stock=未平倉 symbol 數;**O/S # of FP**=Σ_open max(0,(E−CS)Q)÷1FP$;**SDD**=Σ_open (CS−E)Q;**MDD**=SDD−Unrlzd=Σ_open (CS−P)Q。

### 7.4 History stats(歷史 summary)
Rlzd P/L、已平倉數、Win/Loss(例 8W/3L)、Win%、平均 R、Best/Worst。

### 7.5 ⏸️ 暫時 skip(顯示 `—`)
`% O/S`、`Worst DD`、`MDD NAV`、Short 倉。

---

## 8. UI / Layout

### 8.1 桌面(≥ lg)
```
┌ Header: ▲ 倉位計算器  …  [USD] [☀/☾] [中/EN] [account] ┐
├───────────────┬──────────────────────────────────────┤
│ Calculator    │ Summary tiles (NAV·P/L·%Inv·SDD·MDD…) │
│ (sticky rail) │ [ 持倉 | 歷史 ] ─────────────────────│
│ + 圖表掣      │ TradeCard / HistoryCard …             │
└───────────────┴──────────────────────────────────────┘
```
### 8.2 手機
`計算器 / 持倉 / 歷史` 三 tab;持倉 tab 頂 = PositionsSummary;歷史 tab 頂 = HistorySummary。

### 8.3 卡片內容
- **TradeCard(未平倉):** 股票·Status·#days·現價·Ch%·**R**;數據格:入場/股數/Amt Allocated/%C/Ptn Sizing/現時止損;風險行:SDD·WDD·MDD(R|US$|%C);→Risk Free 進度條;**睇圖表**/更新止損/平倉/刪除。
- **HistoryCard(已平倉):** 股票·Win/Loss·持有日數·平倉價·已實現 P/L·已實現 R;數據格:入場/平倉/股數/初始止損/Amt Allocated/%C;刪除。

---

## 9. Charts & Key Levels(移植 + 擴充 Android)

### 9.1 數據
`GET /api/candles?symbol=X&range=6mo&interval=1d` → `{ symbol, range, interval, candles:[{t,o,h,l,c,v}] }`(已有,移植成 Route Handler)。

### 9.2 圖表元件 `Chart/CandleChart.tsx`
- `'use client'`,用 `lightweight-charts`(`next/dynamic` no-SSR)。
- Candlestick series + 橫線 overlay,經 `series.createPriceLine({ price, color, lineStyle, title })`(solid/dashed/dotted)。
- Tap 揀價:`chart.subscribeClick` → 回傳對應 price(對應 Android `onPriceSelected`)。

### 9.3 Key-level 偵測 `lib/keyLevels.ts`(純函數 + 測試)
移植 Android `DetectKeyLevelsUseCase` 並對稱擴充:
- **支持位(swing lows):** 每邊 `lookback=5` 局部低點;prominence=(nearHigh−low)/nearHigh ≥ `minProminence`(2%),窗口 ±2·lookback;1.5% 內去重;按 strength 取頭 5;按 time 倒序。
- **阻力位(swing highs):** 對稱 —— 局部高點;prominence=(high−nearLow)/high ≥ 2%;同樣去重/取 5。
- 介面:`detectKeyLevels(candles, opts) → { supports: KeyLevel[]; resistances: KeyLevel[] }`,`KeyLevel = { price, time, strength }`。

### 9.4 建議止損 / 止賺
- **止損建議:** tap 支持位 → 止損 = `support × 0.995`(略低於支持,跟 Android)。
- **止賺建議:** tap 阻力位 → 止賺 = `resistance × 0.995`(略低於阻力)。
- **R 倍數參考線:** 1R/2R/3R = `entry + N×(entry − stop)`,圖上畫虛線 + 可 tap 設為止賺。

### 9.5 用喺邊
- **計算器 — `StopTargetChartDialog`:** 入 symbol + 買入價 → load candles。圖顯示:買入線(emerald 點)+ 止損線(rose 實)+ 止賺線(amber)+ 支持位(綠)/阻力位(紅)key-level 線 + 1R/2R/3R 虛線。下面:`支持位` chips → 設止損、`阻力位` chips → 設止賺;tap 圖揀價。確認 → 寫返計算器 stop/target input。桌面 = modal dialog,手機 = 全螢幕 sheet。
- **每單持倉 — `TradeChartDialog`(read-only,移植 Android `TradeChartSheet`):** 買入/現時止損/現價線 + header 顯示 **R multiple**(`+2.30R`)同 P&L。由 TradeCard「睇圖表」開。

---

## 10. Theming (Light / Dark)

`theme.ts` 出兩個實作同一 `ThemeType` 嘅 palette。Token:`bg, surface, surfaceAlt, border, text, textMuted, textFaint, accent, accentSoft, positive, negative, breakpoints{xs,md,xl}`。
- **Dark(預設):** bg `#0a0b0d`、surface `#0f1115`、border `rgba(255,255,255,.07)`、text `#e6e8ea`、accent amber `#fbbf24`、pos emerald、neg red。
- **Light:** bg `#f7f7f5`、surface `#ffffff`、border `rgba(0,0,0,.08)`、text `#1a1c1e`、accent `#d97706`、pos `#15803d`、neg `#dc2626`(對比度 ≥ WCAG AA)。

切換:`themeAtom` → `ThemeProvider theme={mode==='dark'?darkTheme:lightTheme}`。lightweight-charts 亦跟 theme 換色。SSR/hydration:`<html>` 預設 dark,客戶端 mount 後讀 localStorage 修正(inline script 防閃)。

---

## 11. i18n

next-intl,locales=`['zh-HK','en']`,預設 `zh-HK`。UI 字串入 `messages/zh-HK.json` + `en.json`。Header 加語言切換。數字/貨幣用 `Intl.NumberFormat`。

---

## 12. API Routes

- `GET /api/quotes?symbols=A,B` ← `api/quotes.js`(CORS `*` 保留俾 Android)。
- `GET /api/candles?symbol=&range=&interval=` ← `api/candles.js`。
- 兩者 Node runtime(yahoo-finance2 需要)。

---

## 13. Testing (Vitest, 新加)

- `lib/finance.test.ts`:倉位計算、每單 metrics(R/FP/SDD/WDD/MDD)、portfolio aggregates、currency convert、history stats。
- `lib/keyLevels.test.ts`:swing 高/低 偵測(fixture candles 已知 pivot)、prominence 過濾、去重、supports+resistances。
- 目標覆蓋率 ≥ 80%(對齊 testing rule)。fixture 用真實數值(C=128000、AAPL E=150/IS=145/Q=128/P=298.19 → Unrlzd=18968.32)。
- 元件層:最少 smoke render;E2E 非本期重點。

---

## 14. Migration & Backward Compatibility

- Supabase `trades` 表 + `stock-trades-v3` localStorage key **不變** → 現有用家資料無縫帶過。
- `/api/quotes`、`/api/candles` 對外合約不變 → Android 無需改。
- 舊 `index.html`、`server.js` 移除(git 有紀錄可還原)。

---

## 15. Out of Scope / Deferred

`% O/S`、`Worst DD`、`MDD NAV`、Short 倉、react-query、PWA service worker(可選)、Android 端任何改動。

---

## 16. Assumptions to Verify

1. SDD/MDD/FP 公式按對交易常識推算(用家「我估你 review」)。落地後用真實 trade 對數,有出入改 `lib/finance.ts`。
2. Capital 視為 USD base;NAV 等先轉顯示幣再加總。
3. `fullPositionPct` 預設 0.5%,UI 可改。
4. Key-level 參數沿用 Android(lookback 5 / prominence 2% / dedup 1.5% / 取 5);阻力位用對稱算法。止賺 = 阻力位 × 0.995(同止損慣例)。
5. Light theme 顏色待視覺確認(對比度)。
