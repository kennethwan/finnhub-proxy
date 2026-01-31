# 股票倉位計算器

一個幫你計算應該買幾多股嘅工具，包含實時報價同 Risk Free 追蹤。

## 功能

- 🧮 根據風險管理計算應買股數
- 📊 實時股價（Finnhub API）
- 📈 Trailing Stop 追蹤
- ✅ Risk Free 狀態監控
- 💾 本地儲存交易記錄

## 部署到 Vercel

### 1. Push 到 GitHub

```bash
git init
git add .
git commit -m "stock calculator"
git branch -M main
git remote add origin https://github.com/你的用戶名/stock-calculator.git
git push -u origin main
```

### 2. 喺 Vercel Import

1. 去 [vercel.com/new](https://vercel.com/new)
2. Import 你嘅 GitHub repo
3. **Environment Variables** 加入：
   - `FINNHUB_API_KEY` = `你的 API Key`
4. Deploy

### 3. 完成！

你會得到 URL 例如：`https://stock-calculator-xxx.vercel.app`

## 本地開發

```bash
# 需要 Vercel CLI
npm i -g vercel
vercel dev
```
