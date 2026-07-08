import { useState } from 'react';
import { Link } from 'react-router-dom';

const FREE_FEATURES = [
  '每月 30 次回測',
  '僅支援 Binance（加密貨幣）',
  '單一策略分析',
  'MA / RSI / MACD 指標',
  '基本統計數據',
  '圖表浮水印',
];

const PRO_FEATURES = [
  '無限次回測',
  { icon: '🚧', text: '股票市場支援（美股/台股）', soon: true },
  { icon: '🚧', text: '多策略組合回測', soon: true },
  '策略一鍵保存/載入 ✅ 本次新增',
  'PDF / CSV 報告匯出 ✅ 本次新增',
  '完整風險指標（Sortino、Calmar、VAR、CAGR）✅ 本次新增',
  '優先客戶支援',
  '無浮水印',
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1 className="pricing-title">選擇你的回測方案</h1>
        <p className="pricing-subtitle">從免費開始，隨時升級 Pro 釋放全部功能</p>
        <div className="billing-toggle">
          <span className={!annual ? 'active' : ''}>月付</span>
          <button className={`toggle-btn ${annual ? 'on' : ''}`} onClick={() => setAnnual(!annual)}>
            <span className="toggle-knob" />
          </button>
          <span className={annual ? 'active' : ''}>
            年付 <span className="save-badge">省 17%</span>
          </span>
        </div>
      </div>

      <div className="pricing-cards">
        <div className="pricing-card free">
          <div className="card-header">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              <span className="price-amount">$0</span>
              <span className="price-period">永久免費</span>
            </div>
            <p className="plan-desc">適合業餘玩家驗證基本策略</p>
          </div>
          <ul className="feature-list">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="feature-item">
                <span className="feature-check">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link to="/" className="plan-btn free-btn">開始使用</Link>
        </div>

        <div className="pricing-card pro">
          <div className="popular-badge">熱門選擇</div>
          <div className="card-header">
            <div className="plan-name">Pro</div>
            <div className="plan-price">
              <span className="price-amount">
                {annual ? '$79' : '$9.99'}
              </span>
              <span className="price-period">/ {annual ? '年' : '月'}</span>
            </div>
            {annual && <div className="annual-note">相當於 $6.58/月</div>}
            <p className="plan-desc">適合认真对待交易的专业玩家</p>
          </div>
          <ul className="feature-list">
            {PRO_FEATURES.map((f, i) => {
              const text = typeof f === 'string' ? f : f.text;
              const soon = typeof f === 'object' && f.soon;
              return (
                <li key={i} className={`feature-item ${soon ? 'feature-soon' : ''}`}>
                  <span className="feature-check pro-check">{soon ? '🚧' : '✓'}</span> {text}
                </li>
              );
            })}
          </ul>
          <button
            className="plan-btn pro-btn"
            onClick={() => {
              const el = document.createElement('div');
              el.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#1a1f2e;padding:14px 24px;border-radius:8px;font-weight:700;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);';
              el.textContent = '🚀 Pro 方案即將上線！目前所有 Pro 功能（CAGR/Sortino/Calmar/VAR/CSV 匯出/策略預設）已免費解鎖搶先體驗。';
              document.body.appendChild(el);
              setTimeout(() => el.remove(), 4500);
            }}
          >
            升級 Pro
          </button>
        </div>
      </div>

      <div className="comparison-section">
        <h2 className="comparison-title">功能比較</h2>
        <div className="comparison-table">
          <div className="comp-header">
            <span>功能</span>
            <span>Free</span>
            <span>Pro</span>
          </div>
          {[
            ['每月回測次數', '30', '無限制'],
            ['市場支持', '僅加密貨幣', '加密 + 美股 + 台股'],
            ['指標', 'MA / RSI / MACD', '全部 + BB + 自訂'],
            ['布林通道 (BB)', '❌', '✓'],
            ['MACD 副圖', '❌', '✓'],
            ['資金曲線', '❌', '✓'],
            ['策略保存/載入', '❌', '✓'],
            ['多策略組合', '❌', '✓'],
            ['PDF / CSV 匯出', '❌', '✓'],
            ['圖表浮水印', '✓', '無'],
            ['支援', '社群', '優先客服'],
          ].map(([feature, free, pro], i) => (
            <div key={i} className="comp-row">
              <span className="comp-feature">{feature}</span>
              <span className={`comp-free ${free.startsWith('✓') ? 'yes' : free.startsWith('❌') ? 'no' : ''}`}>{free}</span>
              <span className="comp-pro">{pro}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pricing-faq">
        <h2 className="faq-title">常見問題</h2>
        <div className="faq-grid">
          <div className="faq-item">
            <h3>免費版真的免費嗎？</h3>
            <p>是的，Free 方案永久免費，無需綁定信用卡。</p>
          </div>
          <div className="faq-item">
            <h3>如何升級 Pro？</h3>
            <p>點擊「升級 Pro」按鈕，選擇月付或年付，輕鬆啟用。</p>
          </div>
          <div className="faq-item">
            <h3>可以隨時取消嗎？</h3>
            <p>可以，取消後 Pro 功能在當期結束前仍有效。</p>
          </div>
          <div className="faq-item">
            <h3>資料會被保存嗎？</h3>
            <p>Pro 用戶的策略和回測歷史會安全保存在雲端。</p>
          </div>
        </div>
      </div>
    </div>
  );
}