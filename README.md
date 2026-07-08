# 📈 Trading Backtest v3.1

> 免費的加密貨幣量化回測工具，支援 MA / RSI / MACD 策略 + 完整風險指標 + CSV 匯出 + 策略預設保存。

🌐 **Live Demo**: https://openclawsean024-create.github.io/trading-backtest/

![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)
![React 19](https://img.shields.io/badge/React-19-61DAFB)
![Vite 8](https://img.shields.io/badge/Vite-8-646CFF)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能亮點

### 📊 完整風險指標（Pro）
- **CAGR** — 年化複合報酬率
- **Sortino** — 只算下行波動（比夏普更貼近真實風險）
- **Calmar** — 年化報酬 / 最大回撤
- **VAR(95%)** — 最壞情況下單筆最大可能虧損
- **Profit Factor** — 總獲利 / 總虧損（>1 代表賺錢）
- **Expectancy** — 每筆交易平均損益

### 🧮 三種策略
- **均線交叉 (MA Crossover)** — 快線/慢線黃金交叉與死亡交叉
- **RSI 超買超賣** — RSI > 超買線賣出 / RSI < 超賣線買入
- **MACD** — MACD 線與信號線交叉

### 📈 15 種幣對 × 7 種 K 線週期
- 幣對：BTC / ETH / BNB / SOL / XRP / ADA / DOGE / AVAX / DOT / LINK / MATIC / LTC / UNI / ATOM / ETC
- 週期：1m / 5m / 15m / 1h / 4h / 1d / 1w

### 💾 資料匯出
- **CSV 交易明細** — 時間、類型、價格、數量、損益、報酬率、持倉時間、策略、訊號
- **文字報告** — 完整策略報表（報酬統計 / 風險指標 / 交易統計）

### 💡 策略預設管理
- LocalStorage 永久保存
- 任意命名 + 一鍵載入
- 預設可分享（匯出/匯入 JSON）

## 🚀 快速開始

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev          # http://localhost:5173

# 構建生產版本
npm run build        # 輸出到 dist/

# 預覽生產版本
npm run preview
```

## 🌐 部署到 GitHub Pages

```bash
# 構建 + 推到 gh-pages 分支
npm run build

# 使用 git subtree 或 gh-pages 工具部署
# 本專案使用 force push gh-pages 分支方式
git push -f origin master:gh-pages  # 或單獨構建 dist/ 後 push
```

Vite 已配置 `base: '/trading-backtest/'` 用於 GitHub Pages subpath 部署。
React Router 使用 `basename={import.meta.env.BASE_URL}` 自動處理路由前綴。

## 📂 技術棧

- **React 19** + **Vite 8** + **TypeScript**
- **lightweight-charts 5** (TradingView) — 專業級 K 線圖表
- **react-router-dom 7** — SPA 路由
- **date-fns 4** — 日期處理
- **Binance Public API** — K 線資料（無需 API key）

## 📋 免責聲明

本工具僅供教育與研究用途。所有回測結果為歷史模擬，不構成投資建議。
加密貨幣交易涉及高風險，請謹慎評估自身風險承受能力。

## 📝 License

MIT License — 歡迎自由使用、修改、散布。

## 🆕 更新日誌

詳見 [CHANGELOG.md](./CHANGELOG.md)

- **v3.1** — 完整風險指標、CSV/報告匯出、策略預設、JSON-LD SEO、OG image
- **v3.0** — 基本功能、Binance API 整合、TradingView 圖表

---

Made with ❤️ by Sean Li