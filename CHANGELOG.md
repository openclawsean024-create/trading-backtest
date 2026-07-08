# Changelog — Trading Backtest

## v3.1 (Session 18) — 2026-07-09

### ✨ Pro 功能完整實裝

**新風險指標（CAGR / Sortino / Calmar / VAR / Profit Factor / Expectancy）**
- 年化報酬率（CAGR）：複合年增長率
- 索提諾比率（Sortino）：只計算下行波動，比夏普更貼近真實風險
- 卡瑪比率（Calmar）：年化報酬 / 最大回撤
- 風險價值 VAR（95%）：最壞情況下單筆最大可能虧損
- 獲利因子（Profit Factor）：總獲利 / 總虧損
- 期望值（Expectancy）：每筆交易平均損益
- 安全處理：Infinity（無虧損）顯示「∞」、無意義指標顯示「—」

**CSV / 報告匯出**
- 📊 CSV 匯出：完整交易明細（時間、類型、價格、數量、損益、報酬率、持倉時間、策略、訊號）
- 📄 文字報告匯出：完整策略報表（含報酬、風險、交易統計）

**策略預設管理（LocalStorage）**
- 💾 儲存任意命名策略組合
- 📋 列出所有已存預設
- ⚡ 一鍵載入預設
- 🗑️ 刪除不需要的預設
- ESC 鍵關閉 modal

**定價頁升級**
- Pro 卡片「本次新增」標記（風險指標 / 報告匯出 / 策略預設）
- 未實裝功能「🚧 開發中」標記（股票市場 / 多策略組合）

### 🎨 UI / UX

- Header v3.1 + 漸層金色 `✨ Pro 指標 + CSV/報告匯出` badge
- Pro 指標卡黃色邊框 + PRO 角標
- 統一 Modal 設計（策略預設）
- 統計指標智能配色（綠/紅/橘）

### 📱 Mobile Responsive

- iPhone 375 全版面優化
- Pro 指標卡 2-col 排列
- 控制區直向堆疊 + 全寬按鈕
- Modal 在小螢幕直向
- chart-container 高度調整為 220px

### 🔍 SEO / PWA

- JSON-LD WebApplication 結構化資料
- Open Graph image (1200x630 SVG，brand 配色 + K線圖示)
- Twitter Card 完整 meta
- theme-color / color-scheme meta
- canonical URL

### 🐛 Bug Fixes

- CSV trades 時間欄位改用 unix timestamp
- signal 欄位名稱統一
- oxc parser JSX comment 移出 conditional block

---

## v3.0 (prior) — 基本功能

- 15 種 Binance 幣對 + 7 種 K 線週期
- MA / RSI / MACD 三種策略
- 4 個 TradingView 圖表（K線 / RSI / MACD / 權益曲線）
- 8 個基本統計指標
- 交易記錄表格
- 完整 SEO + Twitter Card
- 暗色主題 + 響應式設計
- 部署至 Vercel