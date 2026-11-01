import React, { useRef, useEffect, useState } from 'react';
import { Candle, GridLine, VolumeProfileSummary } from '../types/grid';
import { calculateEMA } from '../utils/indicators';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  LineStyle,
  ColorType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CandlestickData,
  LineData,
  HistogramData,
  IPriceLine,
} from 'lightweight-charts';
import { Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TradingChartProps {
  candles: Candle[];
  gridLines: GridLine[];
  volumeProfile: VolumeProfileSummary;
  currentPrice: number;
  timeframe: '5m' | '15m' | '1h';
  onTimeframeChange: (tf: '5m' | '15m' | '1h') => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  gridLines,
  volumeProfile,
  currentPrice,
  timeframe,
  onTimeframeChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const activePriceLinesRef = useRef<IPriceLine[]>([]);

  const [showVolumeProfile, setShowVolumeProfile] = useState(true);
  const [showEmas, setShowEmas] = useState(true);
  const [hoveredData, setHoveredData] = useState<{ open: number; high: number; low: number; close: number; volume: number; timeStr: string } | null>(null);

  // Initialize TradingView Lightweight Chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 440,
      layout: {
        background: { type: ColorType.Solid, color: '#080B11' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: 'monospace',
      },
      grid: {
        vertLines: { color: '#1E293B', style: LineStyle.SparseDotted },
        horzLines: { color: '#1E293B', style: LineStyle.SparseDotted },
      },
      crosshair: {
        mode: 1, // Normal
        vertLine: { color: '#6366F1', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#4F46E5' },
        horzLine: { color: '#6366F1', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#4F46E5' },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Candlestick Series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // EMA 20 Series (Cyan)
    const ema20Series = chart.addSeries(LineSeries, {
      color: '#06B6D4',
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
    });
    ema20SeriesRef.current = ema20Series;

    // EMA 50 Series (Orange)
    const ema50Series = chart.addSeries(LineSeries, {
      color: '#F97316',
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
    });
    ema50SeriesRef.current = ema50Series;

    // Volume Histogram Series at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay over chart
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Subscribe to Crosshair Move for Inspection Tooltip
    chart.subscribeCrosshairMove(param => {
      if (param.time && param.seriesData.has(candlestickSeries)) {
        const cData = param.seriesData.get(candlestickSeries) as CandlestickData;
        const vData = param.seriesData.get(volumeSeries) as HistogramData;

        if (cData) {
          const date = new Date((param.time as number) * 1000);
          setHoveredData({
            open: cData.open,
            high: cData.high,
            low: cData.low,
            close: cData.close,
            volume: vData ? vData.value : 0,
            timeStr: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      } else {
        setHoveredData(null);
      }
    });

    // Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update Series Data when candles or indicators update
  useEffect(() => {
    if (!candlestickSeriesRef.current || !candles || candles.length === 0) return;

    // Sort & Deduplicate candles strictly in ascending time order
    const sortedCandles = [...candles]
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((c, idx, arr) => idx === 0 || c.timestamp > arr[idx - 1].timestamp);

    const candleData: CandlestickData[] = sortedCandles.map(c => ({
      time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candlestickSeriesRef.current.setData(candleData);

    // Update Volume Series
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData[] = sortedCandles.map(c => ({
        time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
      }));
      volumeSeriesRef.current.setData(volumeData);
    }

    // Update EMA Lines
    if (showEmas && sortedCandles.length >= 20) {
      const closes = sortedCandles.map(c => c.close);
      const ema20Arr = calculateEMA(closes, 20);
      const ema50Arr = calculateEMA(closes, 50);

      if (ema20SeriesRef.current) {
        const ema20Data: LineData[] = sortedCandles
          .map((c, idx) => ({
            time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
            value: ema20Arr[idx],
          }))
          .filter(d => d.value > 0);
        ema20SeriesRef.current.setData(ema20Data);
      }

      if (ema50SeriesRef.current) {
        const ema50Data: LineData[] = sortedCandles
          .map((c, idx) => ({
            time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
            value: ema50Arr[idx],
          }))
          .filter(d => d.value > 0);
        ema50SeriesRef.current.setData(ema50Data);
      }
    }
  }, [candles, showEmas]);

  // Update Price Lines for Grid Levels, Volume Profile, and Current Price
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    // Clear previous price lines
    activePriceLinesRef.current.forEach(line => series.removePriceLine(line));
    activePriceLinesRef.current = [];

    // 1. Grid Lines (BUY Limit below price, SELL TP above price, FILLED)
    const renderedPrices = new Set<number>();
    let strategyStopLossPrice = 0;

    gridLines.forEach(grid => {
      if (!renderedPrices.has(grid.price)) {
        renderedPrices.add(grid.price);
        const isFilled = grid.status === 'FILLED';
        const isSell = grid.type === 'SELL';

        let lineColor = '#10B981'; // Emerald Green
        let labelPrefix = 'LIMIT BUY';

        if (grid.botMode === 'SHORT') {
          if (grid.type === 'BUY') {
            lineColor = '#34D399'; // Mint/Emerald for Take-Profit Buy to close short
            labelPrefix = 'TP BUY (COVER)';
          } else {
            lineColor = '#F43F5E';
            labelPrefix = 'SHORT';
          }
        } else {
          if (isSell) {
            lineColor = '#F59E0B'; // Amber for TAKE-PROFIT SELL
            labelPrefix = 'TP SELL';
          } else if (isFilled) {
            lineColor = '#38BDF8'; // Sky Blue for FILLED Long
            labelPrefix = 'FILLED LONG';
          }
        }

        const pLine = series.createPriceLine({
          price: grid.price,
          color: lineColor,
          lineWidth: 1,
          lineStyle: isFilled ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title: `${labelPrefix} $${grid.price.toFixed(2)} ($5)`,
        });
        activePriceLinesRef.current.push(pLine);
      }

      if (grid.stopLossPrice > 0) {
        strategyStopLossPrice = grid.stopLossPrice;
      }
    });

    // Draw ONE Single Unified Strategy Stop-Loss Line
    if (strategyStopLossPrice > 0) {
      const isShortBot = gridLines.some(g => g.botMode === 'SHORT');
      const slLine = series.createPriceLine({
        price: strategyStopLossPrice,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `${isShortBot ? 'BEAR' : 'BULL'} STOP-LOSS $${strategyStopLossPrice.toFixed(2)}`,
      });
      activePriceLinesRef.current.push(slLine);
    }

    // 2. Volume Profile POC, VAH, VAL Lines
    if (showVolumeProfile && volumeProfile) {
      if (volumeProfile.poc > 0) {
        const pocLine = series.createPriceLine({
          price: volumeProfile.poc,
          color: '#818CF8',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `POC $${volumeProfile.poc.toFixed(2)}`,
        });
        activePriceLinesRef.current.push(pocLine);
      }

      if (volumeProfile.vah > 0) {
        const vahLine = series.createPriceLine({
          price: volumeProfile.vah,
          color: '#94A3B8',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `VAH $${volumeProfile.vah.toFixed(2)}`,
        });
        activePriceLinesRef.current.push(vahLine);
      }

      if (volumeProfile.val > 0) {
        const valLine = series.createPriceLine({
          price: volumeProfile.val,
          color: '#F87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `VAL $${volumeProfile.val.toFixed(2)}`,
        });
        activePriceLinesRef.current.push(valLine);
      }
    }
  }, [gridLines, volumeProfile, showVolumeProfile]);

  // Chart Control Helpers
  const handleZoomIn = () => {
    const ts = chartRef.current?.timeScale();
    if (ts) {
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const delta = (range.to - range.from) * 0.2;
        ts.setVisibleLogicalRange({ from: range.from + delta, to: range.to - delta });
      }
    }
  };

  const handleZoomOut = () => {
    const ts = chartRef.current?.timeScale();
    if (ts) {
      const range = ts.getVisibleLogicalRange();
      if (range) {
        const delta = (range.to - range.from) * 0.2;
        ts.setVisibleLogicalRange({ from: range.from - delta, to: range.to + delta });
      }
    }
  };

  const handleResetView = () => {
    chartRef.current?.timeScale().fitContent();
  };

  return (
    <div className="relative w-full h-[520px] bg-[#080B11] rounded-xl border border-slate-800/80 p-4 flex flex-col">
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 z-10">
        {/* Active Timeframe Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          {(['5m', '15m', '1h'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 text-xs font-bold rounded-md font-mono transition-all ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Live Hover Inspection Inspector Bar */}
        {hoveredData ? (
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px] text-slate-300 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-500">{hoveredData.timeStr}</span>
            <div>O: <span className="text-white">${hoveredData.open.toFixed(2)}</span></div>
            <div>H: <span className="text-emerald-400">${hoveredData.high.toFixed(2)}</span></div>
            <div>L: <span className="text-rose-400">${hoveredData.low.toFixed(2)}</span></div>
            <div>C: <span className="text-white">${hoveredData.close.toFixed(2)}</span></div>
            <div>Vol: <span className="text-indigo-300">{hoveredData.volume.toFixed(1)}</span></div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
              <span>EMA 20</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-orange-400 rounded-full" />
              <span>EMA 50</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-indigo-500 rounded-full" />
              <span>Volume Profile POC</span>
            </div>
          </div>
        )}

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-1 p-0.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              title="Fit Content"
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowVolumeProfile(!showVolumeProfile)}
            className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-colors font-medium ${
              showVolumeProfile
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vol Profile</span>
          </button>
        </div>
      </div>

      {/* TradingView Lightweight Charts Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden rounded-lg">
        <div ref={chartContainerRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
