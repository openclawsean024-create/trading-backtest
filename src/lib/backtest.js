import { calcSMA, calcRSI, calcMACD } from './indicators';

export function generateSignals(candles, params) {
  const closes = candles.map((c) => c.close);
  const buySignals = [];
  const sellSignals = [];

  if (params.strategy === 'ma_crossover') {
    const fast = calcSMA(closes, params.fastPeriod || 10);
    const slow = calcSMA(closes, params.slowPeriod || 30);

    let holding = false;
    for (let i = 1; i < candles.length; i++) {
      if (isNaN(fast[i]) || isNaN(slow[i]) || isNaN(fast[i - 1]) || isNaN(slow[i - 1])) continue;

      if (fast[i - 1] <= slow[i - 1] && fast[i] > slow[i] && !holding) {
        buySignals.push({ time: candles[i].time, price: candles[i].close });
        holding = true;
      } else if (fast[i - 1] >= slow[i - 1] && fast[i] < slow[i] && holding) {
        sellSignals.push({ time: candles[i].time, price: candles[i].close });
        holding = false;
      }
    }
  } else if (params.strategy === 'rsi') {
    const rsi = calcRSI(closes, params.rsiPeriod || 14);
    let holding = false;

    for (let i = 1; i < candles.length; i++) {
      if (isNaN(rsi[i])) continue;

      const oversold = rsi[i] < (params.rsiOversold || 30);
      const overbought = rsi[i] > (params.rsiOverbought || 70);

      if (oversold && !holding) {
        buySignals.push({ time: candles[i].time, price: candles[i].close });
        holding = true;
      } else if (overbought && holding) {
        sellSignals.push({ time: candles[i].time, price: candles[i].close });
        holding = false;
      }
    }
  } else if (params.strategy === 'macd') {
    const macd = calcMACD(
      closes,
      params.fastPeriod || 12,
      params.slowPeriod || 26,
      params.signalPeriod || 9
    );
    let holding = false;

    for (let i = 1; i < candles.length; i++) {
      if (isNaN(macd.histogram[i]) || isNaN(macd.histogram[i - 1])) continue;

      const crossedUp = macd.histogram[i - 1] <= macd.signal[i - 1] && macd.histogram[i] > macd.signal[i];
      const crossedDown = macd.histogram[i - 1] >= macd.signal[i - 1] && macd.histogram[i] < macd.signal[i];

      if (crossedUp && !holding) {
        buySignals.push({ time: candles[i].time, price: candles[i].close });
        holding = true;
      } else if (crossedDown && holding) {
        sellSignals.push({ time: candles[i].time, price: candles[i].close });
        holding = false;
      }
    }
  }

  return { buySignals, sellSignals };
}

export function runBacktest(candles, params, signals) {
  if (!signals) {
    signals = generateSignals(candles, params);
  }

  const trades = [];
  let capital = params.initialCapital;
  let position = 0;
  let avgBuyPrice = 0;

  const applyCosts = (price, isBuy) => {
    const slippageFactor = isBuy ? 1 + params.slippage / 100 : 1 - params.slippage / 100;
    const feeFactor = isBuy ? 1 + params.tradingFee / 100 : 1 - params.tradingFee / 100;
    return price * slippageFactor * feeFactor;
  };

  for (const sig of signals.buySignals) {
    const adjustedPrice = applyCosts(sig.price, true);
    const quantity = capital / adjustedPrice;
    if (quantity > 0) {
      capital -= quantity * adjustedPrice;
      position += quantity;
      avgBuyPrice = adjustedPrice;
      trades.push({
        id: crypto.randomUUID(),
        date: sig.time,
        type: 'BUY',
        price: sig.price,
        quantity,
        signal: params.strategy,
      });
    }
  }

  for (const sig of signals.sellSignals) {
    if (position > 0) {
      const adjustedPrice = applyCosts(sig.price, false);
      const proceeds = position * adjustedPrice;
      const costBasis = position * avgBuyPrice * (1 + params.tradingFee / 100);
      const pnl = proceeds - costBasis;

      trades.push({
        id: crypto.randomUUID(),
        date: sig.time,
        type: 'SELL',
        price: sig.price,
        quantity: position,
        signal: params.strategy,
        pnl,
      });

      capital += proceeds;
      position = 0;
      avgBuyPrice = 0;
    }
  }

  if (position > 0 && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const adjustedPrice = applyCosts(lastCandle.close, false);
    const proceeds = position * adjustedPrice;
    const costBasis = position * avgBuyPrice * (1 + params.tradingFee / 100);
    const pnl = proceeds - costBasis;

    trades.push({
      id: crypto.randomUUID(),
      date: lastCandle.time,
      type: 'SELL',
      price: lastCandle.close,
      quantity: position,
      signal: 'FORCE_CLOSE',
      pnl,
    });

    capital += proceeds;
    position = 0;
  }

  const sellTrades = trades.filter((t) => t.type === 'SELL' && t.pnl !== undefined);
  const winningTrades = sellTrades.filter((t) => (t.pnl || 0) > 0);
  const losingTrades = sellTrades.filter((t) => (t.pnl || 0) < 0);

  const totalReturn = ((capital - params.initialCapital) / params.initialCapital) * 100;

  let peak = params.initialCapital;
  let maxDrawdown = 0;
  let runningCapital = params.initialCapital;
  const equityCurve = [params.initialCapital];

  for (const trade of trades) {
    if (trade.type === 'SELL' && trade.pnl !== undefined) {
      runningCapital += trade.pnl;
      equityCurve.push(runningCapital);
      if (runningCapital > peak) peak = runningCapital;
      const drawdown = ((peak - runningCapital) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  const returns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i] - equityCurve[i - 1]) / equityCurve[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
  const stdReturn = Math.sqrt(
    returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / (returns.length || 1)
  );
  // 風險無風險利率視為 0（crypto）；年化用 252 trading days
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  // === Pro 完整風險指標 ===
  // Sortino Ratio — 只用下行波動（負報酬的標準差）
  const downsideReturns = returns.filter((r) => r < 0);
  const downsideDeviation = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((a, b) => a + b * b, 0) / downsideReturns.length)
    : 0;
  const sortinoRatio = downsideDeviation > 0 ? (avgReturn / downsideDeviation) * Math.sqrt(252) : 0;

  // Calmar Ratio — 年化報酬 / 最大回撤
  // 計算期間（年）
  const periodYears = candles.length > 1
    ? Math.max(
        0.01,
        (new Date(candles[candles.length - 1].time).getTime() -
          new Date(candles[0].time).getTime()) /
          (1000 * 60 * 60 * 24 * 365)
      )
    : 1;
  const cagr = Math.pow(capital / params.initialCapital, 1 / periodYears) - 1;
  const calmarRatio = maxDrawdown > 0 ? (cagr * 100) / maxDrawdown : 0;

  // VAR (95%) — Value at Risk，第 5 百分位數的損失
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const varIndex = Math.max(0, Math.floor(sortedReturns.length * 0.05));
  const var95 = sortedReturns.length > 0 ? Math.abs(sortedReturns[varIndex]) * 100 : 0;

  // 獲利因子（Profit Factor）— 0 虧損時為無窮大 → 用 Infinity 標記
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((a, b) => a + (b.pnl || 0), 0) / winningTrades.length
    : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((a, b) => a + (b.pnl || 0), 0) / losingTrades.length)
    : 0;
  const profitFactor = losingTrades.length === 0
    ? (winningTrades.length > 0 ? Infinity : 0)
    : (avgWin * winningTrades.length) / (avgLoss * losingTrades.length);

  // 期望值 (Expectancy) — 每筆交易平均損益
  const expectancy = sellTrades.length > 0
    ? sellTrades.reduce((a, b) => a + (b.pnl || 0), 0) / sellTrades.length
    : 0;

  return {
    trades,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: sellTrades.length > 0 ? (winningTrades.length / sellTrades.length) * 100 : 0,
    totalReturn,
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    cagr: cagr * 100,
    var95,
    profitFactor,
    avgWin,
    avgLoss,
    expectancy,
    periodYears,
    initialCapital: params.initialCapital,
    finalCapital: capital,
    equityCurve,
  };
}
