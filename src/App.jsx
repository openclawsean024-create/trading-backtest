import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { format, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { fetchKlinesRange, BinanceApiError } from './lib/api';
import { calcIndicators, calcBollingerBands, calcMACD } from './lib/indicators';
import { generateSignals, runBacktest } from './lib/backtest';
import {
  exportTradesCSV,
  exportReportPDF,
  saveStrategyPreset,
  loadStrategyPreset,
  listStrategyPresets,
  deleteStrategyPreset,
} from './lib/export';

const DEFAULT_PARAMS = {
  initialCapital: 10000,
  tradingFee: 0.1,
  slippage: 0.05,
  strategy: 'ma_crossover',
  fastPeriod: 10,
  slowPeriod: 30,
  signalPeriod: 9,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  bbPeriod: 20,
  bbStdDev: 2,
};

const POPULAR_PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT'];

const INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
];

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('backtest');
  const [showPresetModal, setShowPresetModal] = useState(false);

  const chartContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const macdContainerRef = useRef(null);
  const equityContainerRef = useRef(null);
  const chartRef = useRef(null);
  const rsiChartRef = useRef(null);
  const macdChartRef = useRef(null);
  const equityChartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const smaSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const bbUpperRef = useRef(null);
  const bbMiddleRef = useRef(null);
  const bbLowerRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const macdHistogramRef = useRef(null);
  const macdSignalRef = useRef(null);
  const equitySeriesRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const data = await fetchKlinesRange(symbol, interval, start, end, 1500);

      if (data.length < 2) {
        setError('No data available for the selected date range. Try a longer period.');
        setCandles([]);
        return;
      }

      setCandles(data);
    } catch (err) {
      if (err instanceof BinanceApiError) {
        if (err.status === 429) {
          setError('Rate limited by Binance. Please wait a moment and try again.');
        } else if (err.status === 418) {
          setError('IP blocked by Binance. Try using a VPN or wait.');
        } else {
          setError(`Binance API error: ${err.message}`);
        }
      } else {
        setError(err.message || 'Failed to fetch data');
      }
      setCandles([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ESC 鍵關閉 modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showPresetModal) {
        setShowPresetModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showPresetModal]);

  // Init main chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const smaSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
    });

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 1,
      priceLineVisible: false,
    });

    const bbUpper = chart.addSeries(LineSeries, {
      color: 'rgba(168,85,247,0.6)',
      lineWidth: 1,
      priceLineVisible: false,
    });

    const bbMiddle = chart.addSeries(LineSeries, {
      color: 'rgba(168,85,247,0.9)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
    });

    const bbLower = chart.addSeries(LineSeries, {
      color: 'rgba(168,85,247,0.6)',
      lineWidth: 1,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Init RSI chart
  useEffect(() => {
    if (!rsiContainerRef.current) return;

    const chart = createChart(rsiContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
      width: rsiContainerRef.current.clientWidth,
      height: 150,
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#f97316',
      lineWidth: 1,
      priceLineVisible: false,
    });

    rsiChartRef.current = chart;
    rsiSeriesRef.current = rsiSeries;

    const handleResize = () => {
      if (rsiContainerRef.current) {
        chart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Init MACD chart
  useEffect(() => {
    if (!macdContainerRef.current) return;

    const chart = createChart(macdContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
      width: macdContainerRef.current.clientWidth,
      height: 140,
    });

    const histogramSeries = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceLineVisible: false,
    });

    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
    });

    macdChartRef.current = chart;
    macdHistogramRef.current = histogramSeries;
    macdSignalRef.current = signalSeries;

    const handleResizeMacd = () => {
      if (macdContainerRef.current) {
        chart.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResizeMacd);


    return () => {
      window.removeEventListener('resize', handleResizeMacd);
      chart.remove();
    };
  }, []);

  // Init Equity chart
  useEffect(() => {
    if (!equityContainerRef.current) return;

    const chart = createChart(equityContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: { borderColor: '#334155', timeVisible: true },
      width: equityContainerRef.current.clientWidth,
      height: 160,
    });

    const equitySeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      priceLineVisible: false,
    });

    equityChartRef.current = chart;
    equitySeriesRef.current = equitySeries;

    const handleResizeEquity = () => {
      if (equityContainerRef.current) {
        chart.applyOptions({ width: equityContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResizeEquity);

    return () => {
      window.removeEventListener('resize', handleResizeEquity);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    const candleData = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(candleData);

    // Calculate and set indicators
    const indicators = calcIndicators(candles, {
      smaPeriod: params.fastPeriod,
      emaPeriod: params.slowPeriod,
      rsiPeriod: params.rsiPeriod,
      bbPeriod: params.bbPeriod,
      bbStdDev: params.bbStdDev,
    });

    if (indicators.sma && smaSeriesRef.current) {
      const smaData = indicators.sma
        .map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v }))
        .filter((x) => x !== null);
      smaSeriesRef.current.setData(smaData);
    }

    if (indicators.ema && emaSeriesRef.current) {
      const emaData = indicators.ema
        .map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v }))
        .filter((x) => x !== null);
      emaSeriesRef.current.setData(emaData);
    }

    // Bollinger Bands overlay
    if (indicators.bollinger && bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      const { upper, middle, lower } = indicators.bollinger;
      const upperData = upper.map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v })).filter((x) => x !== null);
      const middleData = middle.map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v })).filter((x) => x !== null);
      const lowerData = lower.map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v })).filter((x) => x !== null);
      bbUpperRef.current.setData(upperData);
      bbMiddleRef.current.setData(middleData);
      bbLowerRef.current.setData(lowerData);
    }

    // RSI sub-chart
    if (indicators.rsi && rsiSeriesRef.current) {
      const rsiData = indicators.rsi
        .map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v }))
        .filter((x) => x !== null);
      rsiSeriesRef.current.setData(rsiData);
    }

    // MACD sub-chart
    const closes = candles.map((c) => c.close);
    const macdData = calcMACD(closes, params.fastPeriod || 12, params.slowPeriod || 26, params.signalPeriod || 9);
    if (macdHistogramRef.current) {
      const histogramData = macdData.histogram
        .map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v, color: v >= 0 ? '#22c55e' : '#ef4444' }))
        .filter((x) => x !== null);
      macdHistogramRef.current.setData(histogramData);
    }
    if (macdSignalRef.current) {
      const signalData = macdData.signal
        .map((v, i) => (isNaN(v) ? null : { time: candles[i].time, value: v }))
        .filter((x) => x !== null);
      macdSignalRef.current.setData(signalData);
    }

    // Run backtest if we have enough data
    const minPeriod = Math.max(params.fastPeriod || 10, params.slowPeriod || 30, params.rsiPeriod || 14);
    if (candles.length > minPeriod) {
      const signals = generateSignals(candles, params);
      const backtestResult = runBacktest(candles, params, signals);

      // Build equity curve over time
      if (equitySeriesRef.current && backtestResult.trades.length > 0) {
        const equityCurve = [];
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
          }
        }

        for (const sig of signals.sellSignals) {
          if (position > 0) {
            const adjustedPrice = applyCosts(sig.price, false);
            capital += position * adjustedPrice;
            position = 0;
            avgBuyPrice = 0;
          }
        }

        // Equity curve: at each candle, track running capital
        let runningCapital = params.initialCapital;
        let tradeIdx = 0;
        const sellEvents = signals.sellSignals.map((s) => ({ ...s, type: 'SELL' }));
        const buyEvents = signals.buySignals.map((s) => ({ ...s, type: 'BUY' }));
        const allEvents = [...buyEvents, ...sellEvents].sort((a, b) => a.time - b.time);

        for (const candle of candles) {
          if (position > 0) {
            runningCapital = position * candle.close;
          }
          for (const evt of allEvents) {
            if (evt.time === candle.time) {
              if (evt.type === 'SELL' && position > 0) {
                runningCapital = position * candle.close;
              }
            }
          }
          equityCurve.push({ time: candle.time, value: runningCapital });
        }
        equitySeriesRef.current.setData(equityCurve);
      }

      setResult(backtestResult);

      // Buy/sell markers
      if (candleSeriesRef.current) {
        const markers = [
          ...signals.buySignals.map((s) => ({
            time: s.time,
            position: 'belowBar',
            color: '#22c55e',
            shape: 'arrowUp',
            text: '▲ Buy',
          })),
          ...signals.sellSignals.map((s) => ({
            time: s.time,
            position: 'aboveBar',
            color: '#ef4444',
            shape: 'arrowDown',
            text: '▼ Sell',
          })),
        ];
        try { candleSeriesRef.current.setMarkers(markers); } catch (e) { /* markers optional */ }
      }
    }

    // Sync time scales
    if (chartRef.current && rsiChartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && rsiChartRef.current) {
          rsiChartRef.current.timeScale().setVisibleRange(range);
        }
      });
    }
    if (chartRef.current && macdChartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && macdChartRef.current) {
          macdChartRef.current.timeScale().setVisibleRange(range);
        }
      });
    }
    if (chartRef.current && equityChartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (range && equityChartRef.current) {
          equityChartRef.current.timeScale().setVisibleRange(range);
        }
      });
    }
  }, [candles, params]);

  const handleParamChange = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuickRange = (days) => {
    setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const formatCurrency = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

  return (
    <main className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">📈 交易回測工具</h1>
          <span className="subtitle">Trading Backtest v3.1 <span className="badge-new">✨ Pro 指標 + CSV/報告匯出</span></span>
        </div>
        <Link to="/pricing" className="pricing-link">查看定價 →</Link>
      </header>

      <div className="controls">
        <div className="control-row">
          <div className="control-group">
            <label htmlFor="exchange">交易所</label>
            <select id="exchange" value="binance" disabled className="select">
              <option value="binance">Binance</option>
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="symbol">幣種</label>
            <select id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} className="select">
              {POPULAR_PAIRS.map((pair) => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="interval">周期</label>
            <select id="interval" value={interval} onChange={(e) => setInterval(e.target.value)} className="select">
              {INTERVALS.map((iv) => (
                <option key={iv.value} value={iv.value}>{iv.label}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="startDate">開始</label>
            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div className="control-group">
            <label htmlFor="endDate">結束</label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
          <div className="quick-btns">
            <button onClick={() => handleQuickRange(7)} className="btn-quick">7天</button>
            <button onClick={() => handleQuickRange(30)} className="btn-quick">30天</button>
            <button onClick={() => handleQuickRange(90)} className="btn-quick">90天</button>
            <button onClick={() => handleQuickRange(365)} className="btn-quick">1年</button>
          </div>
          <button onClick={fetchData} disabled={loading} className="btn-fetch">
            {loading ? '讀取中...' : '取得資料'}
          </button>
        </div>

        <div className="control-row strategy-row">
          <div className="control-group">
            <label htmlFor="strategy">策略</label>
            <select
              id="strategy"
              value={params.strategy}
              onChange={(e) => handleParamChange('strategy', e.target.value)}
              className="select"
            >
              <option value="ma_crossover">均線交叉 (MA Crossover)</option>
              <option value="rsi">RSI 超買超賣</option>
              <option value="macd">MACD</option>
            </select>
          </div>
          {params.strategy === 'ma_crossover' && (
            <>
              <div className="control-group">
                <label htmlFor="fastPeriodMA">快速均線</label>
                <input
                  id="fastPeriodMA"
                  type="number"
                  value={params.fastPeriod}
                  onChange={(e) => handleParamChange('fastPeriod', parseInt(e.target.value) || 10)}
                  className="input-num"
                />
              </div>
              <div className="control-group">
                <label htmlFor="slowPeriodMA">慢速均線</label>
                <input
                  id="slowPeriodMA"
                  type="number"
                  value={params.slowPeriod}
                  onChange={(e) => handleParamChange('slowPeriod', parseInt(e.target.value) || 30)}
                  className="input-num"
                />
              </div>
            </>
          )}
          {params.strategy === 'rsi' && (
            <>
              <div className="control-group">
                <label htmlFor="rsiPeriod">RSI 週期</label>
                <input
                  id="rsiPeriod"
                  type="number"
                  value={params.rsiPeriod}
                  onChange={(e) => handleParamChange('rsiPeriod', parseInt(e.target.value) || 14)}
                  className="input-num"
                />
              </div>
              <div className="control-group">
                <label htmlFor="rsiOverbought">超買</label>
                <input
                  id="rsiOverbought"
                  type="number"
                  value={params.rsiOverbought}
                  onChange={(e) => handleParamChange('rsiOverbought', parseInt(e.target.value) || 70)}
                  className="input-num"
                />
              </div>
              <div className="control-group">
                <label htmlFor="rsiOversold">超賣</label>
                <input
                  id="rsiOversold"
                  type="number"
                  value={params.rsiOversold}
                  onChange={(e) => handleParamChange('rsiOversold', parseInt(e.target.value) || 30)}
                  className="input-num"
                />
              </div>
            </>
          )}
          {params.strategy === 'macd' && (
            <>
              <div className="control-group">
                <label htmlFor="fastPeriodMACD">Fast</label>
                <input id="fastPeriodMACD" type="number" value={params.fastPeriod} onChange={(e) => handleParamChange('fastPeriod', parseInt(e.target.value) || 12)} className="input-num" />
              </div>
              <div className="control-group">
                <label htmlFor="slowPeriodMACD">Slow</label>
                <input id="slowPeriodMACD" type="number" value={params.slowPeriod} onChange={(e) => handleParamChange('slowPeriod', parseInt(e.target.value) || 26)} className="input-num" />
              </div>
              <div className="control-group">
                <label htmlFor="signalPeriodMACD">Signal</label>
                <input id="signalPeriodMACD" type="number" value={params.signalPeriod} onChange={(e) => handleParamChange('signalPeriod', parseInt(e.target.value) || 9)} className="input-num" />
              </div>
            </>
          )}
        </div>

        <div className="control-row">
          <div className="control-group">
            <label htmlFor="initialCapital">初始資金 ($)</label>
            <input
              id="initialCapital"
              type="number"
              value={params.initialCapital}
              onChange={(e) => handleParamChange('initialCapital', parseFloat(e.target.value) || 10000)}
              className="input-num"
            />
          </div>
          <div className="control-group">
            <label htmlFor="tradingFee">交易費用 (%)</label>
            <input
              id="tradingFee"
              type="number"
              step="0.01"
              value={params.tradingFee}
              onChange={(e) => handleParamChange('tradingFee', parseFloat(e.target.value) || 0.1)}
              className="input-num"
            />
          </div>
          <div className="control-group">
            <label htmlFor="slippage">滑價 (%)</label>
            <input
              id="slippage"
              type="number"
              step="0.01"
              value={params.slippage}
              onChange={(e) => handleParamChange('slippage', parseFloat(e.target.value) || 0.05)}
              className="input-num"
            />
          </div>
          <div className="legend-row">
            <span className="legend-item"><span className="dot" style={{background:'#f59e0b'}}></span> SMA({params.fastPeriod})</span>
            <span className="legend-item"><span className="dot" style={{background:'#a78bfa'}}></span> EMA({params.slowPeriod})</span>
            <span className="legend-item"><span className="dot" style={{background:'rgba(168,85,247,0.7)'}}></span> BB({params.bbPeriod})</span>
            <span className="legend-item"><span className="dot" style={{background:'#f97316'}}></span> RSI</span>
            <span className="legend-item"><span className="dot" style={{background:'#22c55e'}}></span> Buy</span>
            <span className="legend-item"><span className="dot" style={{background:'#ef4444'}}></span> Sell</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <strong>⚠️ {error}</strong>
          <button onClick={fetchData} className="btn-retry">重試</button>
        </div>
      )}

      {result && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">總收益率</div>
            <div className={`stat-value ${result.totalReturn >= 0 ? 'pos' : 'neg'}`}>{formatPct(result.totalReturn)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">最終資金</div>
            <div className="stat-value">{formatCurrency(result.finalCapital)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">交易次數</div>
            <div className="stat-value">{result.totalTrades}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">勝率</div>
            <div className={`stat-value ${result.winRate >= 50 ? 'pos' : 'neg'}`}>{result.winRate.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">最大回撤</div>
            <div className="stat-value neg">{result.maxDrawdown.toFixed(2)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">夏普比率</div>
            <div className={`stat-value ${result.sharpeRatio >= 1 ? 'pos' : result.sharpeRatio >= 0 ? 'neutral' : 'neg'}`}>{result.sharpeRatio.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">獲利交易</div>
            <div className="stat-value pos">{result.winningTrades}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">虧損交易</div>
            <div className="stat-value neg">{result.losingTrades}</div>
          </div>
        </div>
      )}

      {/* Pro 完整風險指標 Sortino/Calmar/VAR/CAGR/Profit Factor/Expectancy */}
      {result && (
      <div className="stats-row stats-row-pro">
          <div className="stat-card pro-card" title="年化報酬率 — 假設報酬以複合方式成長">
            <div className="stat-label">CAGR 年化</div>
            <div className={`stat-value ${result.cagr >= 0 ? 'pos' : 'neg'}`}>{result.cagr.toFixed(2)}%</div>
          </div>
          <div className="stat-card pro-card" title="索提諾比率 — 只算下行波動，更貼近真實風險感受">
            <div className="stat-label">Sortino</div>
            <div className={`stat-value ${result.sortinoRatio >= 1 ? 'pos' : result.sortinoRatio >= 0 ? 'neutral' : 'neg'}`}>
              {Number.isFinite(result.sortinoRatio) && result.sortinoRatio !== 0 ? result.sortinoRatio.toFixed(2) : '—'}
            </div>
          </div>
          <div className="stat-card pro-card" title="卡瑪比率 — 年化報酬 / 最大回撤">
            <div className="stat-label">Calmar</div>
            <div className={`stat-value ${result.calmarRatio >= 1 ? 'pos' : result.calmarRatio >= 0 ? 'neutral' : 'neg'}`}>
              {Number.isFinite(result.calmarRatio) && result.calmarRatio !== 0 ? result.calmarRatio.toFixed(2) : '—'}
            </div>
          </div>
          <div className="stat-card pro-card" title="風險價值 VAR(95%) — 最壞情況下單筆最大可能虧損">
            <div className="stat-label">VAR(95%)</div>
            <div className="stat-value neg">{result.var95.toFixed(2)}%</div>
          </div>
          <div className="stat-card pro-card" title="獲利因子 — 總獲利 / 總虧損，>1 代表策略賺錢；無虧損時顯示 ∞">
            <div className="stat-label">獲利因子</div>
            <div className={`stat-value ${result.profitFactor >= 1.5 ? 'pos' : result.profitFactor >= 1 ? 'neutral' : 'neg'}`}>
              {Number.isFinite(result.profitFactor) ? result.profitFactor.toFixed(2) : '∞'}
            </div>
          </div>
          <div className="stat-card pro-card" title="期望值 — 每筆交易平均損益">
            <div className="stat-label">期望值</div>
            <div className={`stat-value ${result.expectancy >= 0 ? 'pos' : 'neg'}`}>${result.expectancy.toFixed(2)}</div>
          </div>
        </div>
      )}

      {result && (
      <div className="action-row">
        <button className="action-btn" onClick={() => exportTradesCSV(result.trades, { symbol, strategy: params.strategy })}>
          📊 匯出 CSV
        </button>
        <button className="action-btn" onClick={() => exportReportPDF(result, params, symbol)}>
          📄 匯出報告
        </button>
        <button className="action-btn action-primary" onClick={() => setShowPresetModal(true)}>
          💾 策略預設
        </button>
      </div>
      )}

      {showPresetModal && (
        <PresetModal
          params={params}
          onLoad={(p) => { setParams(p); setShowPresetModal(false); }}
          onClose={() => setShowPresetModal(false)}
        />
      )}

      <div className="chart-section">
        <div className="chart-title">
          {symbol} K線圖
          {candles.length > 0 && <span className="candle-count">{candles.length} 根K線</span>}
        </div>
        <div className="chart-container" ref={chartContainerRef} />
        <div className="chart-container" ref={rsiContainerRef} />
        <div className="chart-label">RSI</div>
        <div className="chart-container" ref={macdContainerRef} />
        <div className="chart-label">MACD</div>
        <div className="chart-container" ref={equityContainerRef} />
        <div className="chart-label">資金曲線</div>
        {!loading && candles.length === 0 && !error && (
          <div className="empty-chart">
            <p>選擇日期範圍並點擊「取得資料」載入K線數據</p>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'backtest' ? 'active' : ''}`} onClick={() => setActiveTab('backtest')}>回測參數</button>
        <button className={`tab ${activeTab === 'trades' ? 'active' : ''}`} onClick={() => setActiveTab('trades')}>
          交易記錄 {result && <span className="badge">{result.trades.length}</span>}
        </button>
      </div>

      {activeTab === 'trades' && (
        <div className="trades-section">
          {result && result.trades.length > 0 ? (
            <table className="trades-table">
              <thead>
                <tr>
                  <th>時間</th><th>類型</th><th>價格</th><th>數量</th><th>盈虧</th><th>信號</th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-trades"><p>尚無交易記錄。調整策略參數後重新回測。</p></div>
          )}
        </div>
      )}
    </main>
  );
}

function TradeRow({ trade }) {
  return (
    <tr>
      <td>{format(new Date(trade.date * 1000), 'yyyy/MM/dd HH:mm')}</td>
      <td><span className={`badge-type ${trade.type === 'BUY' ? 'buy' : 'sell'}`}>{trade.type === 'BUY' ? '▲ 買入' : '▼ 賣出'}</span></td>
      <td>${trade.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      <td>{trade.quantity.toFixed(6)}</td>
      <td className={trade.pnl !== undefined ? (trade.pnl >= 0 ? 'pos' : 'neg') : ''}>
        {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
      </td>
      <td>{trade.signal}</td>
    </tr>
  );
}

function PresetModal({ params, onLoad, onClose }) {
  const [presets, setPresets] = useState(listStrategyPresets());
  const [name, setName] = useState('');

  const handleSave = () => {
    const finalName = name.trim() || `${params.strategy}-${Date.now()}`;
    saveStrategyPreset(finalName, params);
    setPresets(listStrategyPresets());
    setName('');
  };

  const handleDelete = (n) => {
    if (window.confirm(`確定刪除「${n}」？`)) {
      deleteStrategyPreset(n);
      setPresets(listStrategyPresets());
    }
  };

  const handleLoad = (n) => {
    const p = loadStrategyPreset(n);
    if (p) {
      onLoad(p);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💾 策略預設</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-save">
          <input
            type="text"
            placeholder="預設名稱（例如：保守 MA / 激進 RSI）"
            aria-label="策略預設名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="modal-input"
          />
          <button className="action-btn action-primary" onClick={handleSave}>
            儲存目前策略
          </button>
        </div>

        <div className="modal-list">
          <h3>已儲存的預設 ({presets.length})</h3>
          {presets.length === 0 ? (
            <p className="empty-message">尚無預設。輸入名稱後點「儲存目前策略」建立第一個預設。</p>
          ) : (
            <ul className="preset-list">
              {presets.map((p) => (
                <li key={p.name} className="preset-item">
                  <div className="preset-info">
                    <strong>{p.name}</strong>
                    <small>
                      {p.params.strategy} ·
                      快線 {p.params.fastPeriod}/慢線 {p.params.slowPeriod} ·
                      資金 ${p.params.initialCapital} ·
                      {new Date(p.savedAt).toLocaleString('zh-TW')}
                    </small>
                  </div>
                  <div className="preset-actions">
                    <button className="action-btn" onClick={() => handleLoad(p.name)}>載入</button>
                    <button className="action-btn action-danger" onClick={() => handleDelete(p.name)}>刪除</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
