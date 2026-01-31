# Finnhub Proxy (Vercel)

一鍵部署到 Vercel 嘅 Finnhub API Proxy。

## 🚀 部署方法

### 方法一：Vercel CLI（推薦）

```bash
# 1. 安裝 Vercel CLI
npm i -g vercel

# 2. 登入
vercel login

# 3. 部署
vercel --prod

# 4. 設定環境變數
vercel env add FINNHUB_API_KEY
# 然後輸入你嘅 API Key: d5up83pr01qr4f8a0fe0d5up83pr01qr4f8a0feg

# 5. 重新部署（套用環境變數）
vercel --prod
```

### 方法二：Vercel Dashboard

1. Push 呢個 folder 到 GitHub
2. 去 [vercel.com](https://vercel.com) 登入
3. **Import Project** → 選擇你嘅 repo
4. **Environment Variables** 加入：
   - `FINNHUB_API_KEY` = `你嘅 API Key`
5. **Deploy**

## 使用

部署完成後你會得到 URL，例如：
```
https://finnhub-proxy-xxx.vercel.app
```

### Endpoints

| Endpoint | 範例 |
|----------|------|
| `/api/quote?symbol=AAPL` | 單一股票 |
| `/api/quotes?symbols=AAPL,TSLA` | 多個股票 |

### Response

```json
{
  "AAPL": { "c": 178.72, "d": 0.89, "dp": 0.5, "pc": 177.83 },
  "TSLA": { "c": 248.50, "d": -2.30, "dp": -0.92, "pc": 250.80 }
}
```

## 注意

- Vercel 免費 tier：100GB bandwidth/月，無限 requests
- 唔會 sleep，隨時可用
