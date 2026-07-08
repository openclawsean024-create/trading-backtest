/** Simple Moving Average */
export function calcSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/** Exponential Moving Average */
export function calcEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    result.push(NaN);
  }

  if (data.length >= period) {
    let ema = sum / period;
    result[period - 1] = ema;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }

  return result;
}

/** Relative Strength Index */
export function calcRSI(data, period) {
  const result = new Array(data.length).fill(NaN);
  if (data.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    result[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    result[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - 100 / (1 + rs);
    }
  }

  return result;
}

/** MACD */
export function calcMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calcEMA(data, fastPeriod);
  const slowEMA = calcEMA(data, slowPeriod);

  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalLine = calcEMA(validMacd, signalPeriod);

  const result = {
    macd: macdLine,
    signal: new Array(data.length).fill(NaN),
    histogram: new Array(data.length).fill(NaN),
  };

  let signalIdx = 0;
  for (let i = 0; i < macdLine.length; i++) {
    if (!isNaN(macdLine[i]) && signalIdx < signalLine.length) {
      result.signal[i] = signalLine[signalIdx];
      result.histogram[i] = macdLine[i] - signalLine[signalIdx];
      signalIdx++;
    }
  }

  return result;
}

/** Bollinger Bands */
export function calcBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calcSMA(data, period);
  const upper = [];
  const middle = sma;
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        const diff = data[i - j] - sma[i];
        sumSq += diff * diff;
      }
      const std = Math.sqrt(sumSq / period);
      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
  }

  return { upper, middle, lower };
}

/** Calculate all indicators */
export function calcIndicators(candles, params = {}) {
  const closes = candles.map((c) => c.close);
  const result = {};

  if (params.smaPeriod) {
    result.sma = calcSMA(closes, params.smaPeriod);
  }

  if (params.emaPeriod) {
    result.ema = calcEMA(closes, params.emaPeriod);
  }

  if (params.rsiPeriod) {
    result.rsi = calcRSI(closes, params.rsiPeriod);
  }

  if (params.macdFast && params.macdSlow && params.macdSignal) {
    result.macd = calcMACD(closes, params.macdFast, params.macdSlow, params.macdSignal);
  }

  if (params.bbPeriod && params.bbStdDev) {
    result.bollinger = calcBollingerBands(closes, params.bbPeriod, params.bbStdDev);
  }

  return result;
}
