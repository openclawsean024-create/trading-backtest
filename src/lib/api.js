const BINANCE_BASE = 'https://api.binance.com/api/v3';

export class BinanceApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'BinanceApiError';
    this.code = code;
    this.status = status;
  }
}

export async function fetchKlines(symbol, interval, startTime, endTime, limit = 500) {
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval,
    limit: String(limit),
  });

  if (startTime) params.set('startTime', String(startTime));
  if (endTime) params.set('endTime', String(endTime));

  const url = `${BINANCE_BASE}/klines?${params.toString()}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (res.status === 429) {
      throw new BinanceApiError('Rate limit exceeded. Please wait before fetching more data.', 429, 429);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new BinanceApiError(`HTTP ${res.status}: ${text}`, 0, res.status);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new BinanceApiError('Invalid response format from Binance API', 0, res.status);
    }

    if (data.length === 0) {
      throw new BinanceApiError('No data returned for the specified date range', 0, 404);
    }

    return data.map((k) => ({
      time: Math.floor(Number(k[0]) / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (err) {
    if (err instanceof BinanceApiError) throw err;
    if (err.name === 'AbortError') {
      throw new BinanceApiError('Request timeout. Binance API took too long to respond.', 0, 408);
    }
    throw new BinanceApiError(
      err.message || 'Failed to fetch klines',
      0,
      0
    );
  }
}

export async function fetchKlinesRange(symbol, interval, startDate, endDate, maxBars = 1000) {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  const LIMIT = 1000;
  const allCandles = [];
  let currentStart = startMs;

  while (currentStart < endMs) {
    const candles = await fetchKlines(symbol, interval, currentStart, endMs, LIMIT);

    if (candles.length === 0) break;

    allCandles.push(...candles);

    if (candles.length < LIMIT) break;

    currentStart = candles[candles.length - 1].time * 1000 + 1;

    if (allCandles.length >= maxBars) {
      return allCandles.slice(-maxBars);
    }
  }

  return allCandles;
}

export async function validateSymbol(symbol) {
  try {
    const url = `${BINANCE_BASE}/exchangeInfo`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return false;
    const data = await res.json();
    return (data.symbols || []).some(
      (s) => s.symbol === symbol.toUpperCase() && s.status === 'TRADING'
    );
  } catch {
    return false;
  }
}
