// Pro 功能：CSV 報告匯出
export function exportTradesCSV(trades, meta = {}) {
  const headers = [
    '時間',
    '類型',
    '價格',
    '數量',
    '損益',
    '報酬率(%)',
    '持倉時間(根K線)',
    '策略',
    '訊號',
  ];

  const rows = trades.map((t, i) => {
    const prev = trades[i - 1];
    const ts = t.date ? new Date(t.date * 1000).toISOString() : (t.time || '');
    const holdBars = prev && prev.date && t.date
      ? Math.round(((t.date - prev.date) / 60 / 60))
      : '';
    const returnPct = t.pnl !== undefined && prev && prev.price
      ? ((t.price - prev.price) / prev.price * 100).toFixed(2)
      : '';
    return [
      ts,
      t.type === 'BUY' ? '買入' : '賣出',
      t.price?.toFixed(2) || '',
      t.quantity?.toFixed(6) || '',
      t.pnl?.toFixed(2) || '',
      returnPct,
      holdBars,
      meta.strategy || '',
      t.signal || '',
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // 加 BOM 讓 Excel 正確辨識 UTF-8 中文
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `trades-${meta.symbol || 'export'}-${ts}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportPDF(result, params, symbol) {
  // 簡易文字報告（不依賴 jsPDF）
  const lines = [
    '═══════════════════════════════════════',
    '  交易回測報告',
    '═══════════════════════════════════════',
    '',
    `幣種：${symbol}`,
    `策略：${params.strategy}`,
    `回測區間：${params.startDate} 至 ${params.endDate}`,
    `生成時間：${new Date().toLocaleString('zh-TW')}`,
    '',
    '── 報酬統計 ──',
    `初始資金：$${result.initialCapital.toLocaleString()}`,
    `最終資金：$${result.finalCapital.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `總收益率：${result.totalReturn.toFixed(2)}%`,
    `年化報酬 (CAGR)：${result.cagr?.toFixed(2) || 0}%`,
    `最大回撤：${result.maxDrawdown.toFixed(2)}%`,
    '',
    '── 風險指標 ──',
    `夏普比率 (Sharpe)：${result.sharpeRatio.toFixed(3)}`,
    `索提諾比率 (Sortino)：${result.sortinoRatio?.toFixed(3) || 0}`,
    `卡瑪比率 (Calmar)：${result.calmarRatio?.toFixed(3) || 0}`,
    `風險價值 VAR(95%)：${result.var95?.toFixed(2) || 0}%`,
    '',
    '── 交易統計 ──',
    `總交易次數：${result.totalTrades}`,
    `獲利交易：${result.winningTrades}`,
    `虧損交易：${result.losingTrades}`,
    `勝率：${result.winRate.toFixed(1)}%`,
    `獲利因子 (Profit Factor)：${Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : '∞ (無虧損)'}`,
    `期望值 (Expectancy)：$${result.expectancy?.toFixed(2) || 0}`,
    `平均獲利：$${result.avgWin?.toFixed(2) || 0}`,
    `平均虧損：$${result.avgLoss?.toFixed(2) || 0}`,
    '',
    '═══════════════════════════════════════',
    'Trading Backtest v3.0 · Hermes Auto-Generated',
    '═══════════════════════════════════════',
  ];

  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `backtest-report-${symbol}-${ts}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function saveStrategyPreset(name, params) {
  const presets = JSON.parse(localStorage.getItem('tb-presets') || '{}');
  presets[name] = {
    params,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem('tb-presets', JSON.stringify(presets));
  return presets;
}

export function loadStrategyPreset(name) {
  const presets = JSON.parse(localStorage.getItem('tb-presets') || '{}');
  return presets[name]?.params || null;
}

export function listStrategyPresets() {
  const presets = JSON.parse(localStorage.getItem('tb-presets') || '{}');
  return Object.entries(presets).map(([name, data]) => ({
    name,
    savedAt: data.savedAt,
    params: data.params,
  }));
}

export function deleteStrategyPreset(name) {
  const presets = JSON.parse(localStorage.getItem('tb-presets') || '{}');
  delete presets[name];
  localStorage.setItem('tb-presets', JSON.stringify(presets));
  return presets;
}