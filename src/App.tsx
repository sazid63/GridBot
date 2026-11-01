import React, { useState, useEffect, useCallback } from 'react';
import { Candle, GridLine, StrategyConfig, Trend1hStatus, ConsolidationStatus, VolumeProfileSummary, BacktestResult, OrderBookData } from './types/grid';
import { evaluate1hTrend, evaluateConsolidation, evaluateVolumeStatus } from './utils/indicators';
import { calculateVolumeProfile } from './utils/volumeProfile';
import { generateDynamicGrid, calculateActiveGridPnl, calculateAdaptiveGridParams } from './utils/gridEngine';
import { HeaderNav } from './components/HeaderNav';
import { BotControlsBar } from './components/BotControlsBar';
import { TradingChart } from './components/TradingChart';
import { ActivePositionsTable } from './components/ActivePositionsTable';
import { BacktestModal } from './components/BacktestModal';
import { AiAnalysisDrawer } from './components/AiAnalysisDrawer';
import { OrderBookDepth } from './components/OrderBookDepth';

export default function App() {
  // Market Data States
  const [candles5m, setCandles5m] = useState<Candle[]>([]);
  const [candles1h, setCandles1h] = useState<Candle[]>([]);
  const [chartCandles, setChartCandles] = useState<Candle[]>([]); // Active candles displayed on chart
  const [depthData, setDepthData] = useState<OrderBookData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(2540.50);
  const [priceChange24h, setPriceChange24h] = useState<number>(1.85);
  const [high24h, setHigh24h] = useState<number>(2590.00);
  const [low24h, setLow24h] = useState<number>(2480.00);
  const [volume24h, setVolume24h] = useState<number>(485000000);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Strategy Configuration State
  const [config, setConfig] = useState<StrategyConfig>({
    botMode: 'LONG', // 'LONG' = Bull Market Bot, 'SHORT' = Bear Market Bot
    leverage: 10, // 10x locked
    maxMarginPerGrid: 5, // $5 USD max cap per order
    gridCount: 10,
    gridSpacingPercent: 0.50,
    stopLossPercent: 2.0,
    minVolumeThresholdRatio: 0.8,
    enable1hTrendFilter: true,
    enableConsolidationFilter: true,
    enableVolumeFilter: true,
    enableVolumeProfileAnchoring: true,
    makerFeePercent: 0.02,
    takerFeePercent: 0.05,
  });

  // Bot Operational States
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [gridLines, setGridLines] = useState<GridLine[]>([]);
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h'>('5m');
  const hasInitializedGridRef = React.useRef<boolean>(false);

  // Modals & Drawers
  const [isBacktestOpen, setIsBacktestOpen] = useState<boolean>(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [lastBacktestMetrics, setLastBacktestMetrics] = useState<BacktestResult | null>(null);

  // Computed Indicators
  const trend1h: Trend1hStatus = evaluate1hTrend(candles1h);
  const consolidation: ConsolidationStatus = evaluateConsolidation(candles5m);
  const volumeGuard = evaluateVolumeStatus(candles5m, config.minVolumeThresholdRatio);
  
  // Real Volume Profile computed from active dataset
  const volumeProfile: VolumeProfileSummary = calculateVolumeProfile(
    candles5m.length > 0 ? candles5m : chartCandles,
    120
  );

  // Fetch Market Data from Binance Express Proxy Route
  const fetchMarketData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res5m, res1h, resTicker, resDepth] = await Promise.all([
        fetch('/api/klines?symbol=ETHUSDT&interval=5m&limit=1500'),
        fetch('/api/klines?symbol=ETHUSDT&interval=1h&limit=500'),
        fetch('/api/ticker?symbol=ETHUSDT'),
        fetch('/api/depth?symbol=ETHUSDT&limit=10')
      ]);

      let livePrice = currentPrice;

      if (res5m.ok) {
        const raw5m = await res5m.json();
        if (Array.isArray(raw5m) && raw5m.length > 0) {
          const parsed5m: Candle[] = raw5m.map((k: any) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
          setCandles5m(parsed5m);
          if (timeframe === '5m') setChartCandles(parsed5m);

          const lastClose = parsed5m[parsed5m.length - 1].close;
          livePrice = lastClose;
          setCurrentPrice(lastClose);

          if (!hasInitializedGridRef.current && lastClose > 0) {
            hasInitializedGridRef.current = true;
            const initialVp = calculateVolumeProfile(parsed5m, 120);
            const initialGrid = generateDynamicGrid(lastClose, initialVp, config);
            setGridLines(initialGrid);
          }
        }
      }

      if (res1h.ok) {
        const raw1h = await res1h.json();
        if (Array.isArray(raw1h)) {
          const parsed1h: Candle[] = raw1h.map((k: any) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
          setCandles1h(parsed1h);
          if (timeframe === '1h') setChartCandles(parsed1h);
        }
      }

      if (resTicker.ok) {
        const rawTicker = await resTicker.json();
        setPriceChange24h(parseFloat(rawTicker.priceChangePercent || '1.85'));
        setHigh24h(parseFloat(rawTicker.highPrice || '2590'));
        setLow24h(parseFloat(rawTicker.lowPrice || '2480'));
        setVolume24h(parseFloat(rawTicker.quoteVolume || '485000000'));
      }

      if (resDepth.ok) {
        const rawDepth = await resDepth.json();
        setDepthData(rawDepth);
      }
    } catch (err) {
      console.error('Error fetching market data from Binance proxy:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, config]);

  // Dynamic Timeframe Switcher
  const handleTimeframeChange = async (tf: '5m' | '15m' | '1h') => {
    setTimeframe(tf);
    setIsLoading(true);

    if (tf === '5m' && candles5m.length > 0) {
      setChartCandles(candles5m);
      setIsLoading(false);
      return;
    }

    if (tf === '1h' && candles1h.length > 0) {
      setChartCandles(candles1h);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/klines?symbol=ETHUSDT&interval=${tf}&limit=500`);
      if (res.ok) {
        const raw = await res.json();
        if (Array.isArray(raw)) {
          const parsed: Candle[] = raw.map((k: any) => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5])
          }));
          setChartCandles(parsed);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${tf} candles:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Generate / Re-balance Grid on config parameter change
  useEffect(() => {
    if (currentPrice > 0 && (candles5m.length > 0 || chartCandles.length > 0)) {
      const newGrid = generateDynamicGrid(currentPrice, volumeProfile, config);
      setGridLines(newGrid);
    }
  }, [config.botMode, config.gridCount, config.gridSpacingPercent, config.enableVolumeProfileAnchoring]);

  // Periodic Live Market Polling & Bot Execution Engine
  useEffect(() => {
    const interval = setInterval(async () => {
      let newPrice = currentPrice;

      try {
        const [resTicker, resDepth] = await Promise.all([
          fetch('/api/ticker?symbol=ETHUSDT'),
          fetch('/api/depth?symbol=ETHUSDT&limit=10')
        ]);

        if (resTicker.ok) {
          const ticker = await resTicker.json();
          if (ticker.lastPrice) {
            newPrice = parseFloat(ticker.lastPrice);
            if (ticker.priceChangePercent) setPriceChange24h(parseFloat(ticker.priceChangePercent));
            if (ticker.highPrice) setHigh24h(parseFloat(ticker.highPrice));
            if (ticker.lowPrice) setLow24h(parseFloat(ticker.lowPrice));
          }
        } else {
          const delta = (Math.random() - 0.49) * (currentPrice * 0.0006);
          newPrice = Number((currentPrice + delta).toFixed(2));
        }

        if (resDepth.ok) {
          const depth = await resDepth.json();
          setDepthData(depth);
        }
      } catch {
        const delta = (Math.random() - 0.49) * (currentPrice * 0.0006);
        newPrice = Number((currentPrice + delta).toFixed(2));
      }

      setCurrentPrice(newPrice);

      // Update latest candle close
      setCandles5m(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const last = { ...updated[lastIdx] };
        last.close = newPrice;
        if (newPrice > last.high) last.high = newPrice;
        if (newPrice < last.low) last.low = newPrice;
        updated[lastIdx] = last;
        return updated;
      });

      setChartCandles(prev => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const last = { ...updated[lastIdx] };
        last.close = newPrice;
        if (newPrice > last.high) last.high = newPrice;
        if (newPrice < last.low) last.low = newPrice;
        updated[lastIdx] = last;
        return updated;
      });

      // Bot Order Execution Logic
      const isTrendOk = config.botMode === 'SHORT'
        ? (!trend1h.isBullish || trend1h.label === 'BEARISH')
        : trend1h.isBullish;

      if (isBotActive && isTrendOk && !consolidation.isConsolidating && volumeGuard.isVolumeOk) {
        setGridLines(prevGrid => {
          return prevGrid.map(line => {
            const isShortLine = line.botMode === 'SHORT';

            if (isShortLine) {
              // ==========================================
              // BEAR MARKET BOT: 10x SHORT EXECUTION
              // ==========================================
              // 1. Pending Limit Sell Entry: Market price reaches or exceeds limit sell price
              if (line.status === 'PENDING' && line.type === 'SELL' && newPrice >= line.price) {
                const targetTpBuyPrice = Number((line.price * (1 - config.gridSpacingPercent / 100)).toFixed(2));
                return {
                  ...line,
                  status: 'FILLED',
                  type: 'BUY', // Now holding short position, target order is BUY limit below to cover
                  price: targetTpBuyPrice,
                  filledAtPrice: line.price,
                  filledTimestamp: Date.now()
                };
              }

              // 2. Take Profit Trigger: Market dropped down to target BUY limit price
              if (line.status === 'FILLED' && newPrice <= line.price) {
                const ethAmount = line.positionSizeEth;
                const entryPrice = line.filledAtPrice || currentPrice;
                const exitPrice = line.price;
                const grossPnl = (entryPrice - exitPrice) * ethAmount; // Profit on downward movement
                const entryFee = entryPrice * ethAmount * (config.makerFeePercent / 100);
                const exitFee = exitPrice * ethAmount * (config.makerFeePercent / 100);
                const netPnl = grossPnl - entryFee - exitFee;

                return {
                  ...line,
                  status: 'PENDING',
                  type: 'SELL',
                  price: Number((exitPrice * (1 + config.gridSpacingPercent / 100)).toFixed(2)),
                  realizedPnlUsd: Number(((line.realizedPnlUsd || 0) + netPnl).toFixed(2)),
                  unrealizedPnlUsd: 0,
                  filledAtPrice: undefined
                };
              }

              // 3. Cut-Loss / Stop-Loss trigger: Market squeezed UP to stop-loss price
              if (line.status === 'FILLED' && newPrice >= line.stopLossPrice) {
                const ethAmount = line.positionSizeEth;
                const entryPrice = line.filledAtPrice || currentPrice;
                const exitPrice = line.stopLossPrice;
                const grossPnl = (entryPrice - exitPrice) * ethAmount; // Loss on upward squeeze
                const entryFee = entryPrice * ethAmount * (config.makerFeePercent / 100);
                const exitFee = exitPrice * ethAmount * (config.takerFeePercent / 100);
                const netPnl = grossPnl - entryFee - exitFee;

                return {
                  ...line,
                  status: 'PENDING',
                  type: 'SELL',
                  price: Number((newPrice * (1 + config.gridSpacingPercent / 100)).toFixed(2)),
                  realizedPnlUsd: Number(((line.realizedPnlUsd || 0) + netPnl).toFixed(2)),
                  unrealizedPnlUsd: 0,
                  filledAtPrice: undefined
                };
              }

              return line;

            } else {
              // ==========================================
              // BULL MARKET BOT: 10x LONG EXECUTION
              // ==========================================
              // 1. Pending Limit Buy Entry: Market price drops to or below limit buy price
              if (line.status === 'PENDING' && line.type === 'BUY' && newPrice <= line.price) {
                const targetTpSellPrice = Number((line.price * (1 + config.gridSpacingPercent / 100)).toFixed(2));
                return {
                  ...line,
                  status: 'FILLED',
                  type: 'SELL', // Now holding long position, target order is SELL limit above to take profit
                  price: targetTpSellPrice,
                  filledAtPrice: line.price,
                  filledTimestamp: Date.now()
                };
              }

              // 2. Take Profit trigger: Market reached or exceeded target TP SELL price
              if (line.status === 'FILLED' && newPrice >= line.price) {
                const ethAmount = line.positionSizeEth;
                const entryPrice = line.filledAtPrice || (line.price * (1 - config.gridSpacingPercent / 100));
                const exitPrice = line.price;
                const grossPnl = (exitPrice - entryPrice) * ethAmount;
                const entryFee = entryPrice * ethAmount * (config.makerFeePercent / 100);
                const exitFee = exitPrice * ethAmount * (config.makerFeePercent / 100);
                const netPnl = grossPnl - entryFee - exitFee;

                return {
                  ...line,
                  status: 'PENDING',
                  type: 'BUY',
                  price: Number((exitPrice * (1 - config.gridSpacingPercent / 100)).toFixed(2)),
                  realizedPnlUsd: Number(((line.realizedPnlUsd || 0) + netPnl).toFixed(2)),
                  unrealizedPnlUsd: 0,
                  filledAtPrice: undefined
                };
              }

              // 3. Cut-Loss / Stop-Loss trigger: Market dumped down to stop loss
              if (line.status === 'FILLED' && newPrice <= line.stopLossPrice) {
                const ethAmount = line.positionSizeEth;
                const entryPrice = line.filledAtPrice || line.price;
                const exitPrice = line.stopLossPrice;
                const grossPnl = (exitPrice - entryPrice) * ethAmount;
                const entryFee = entryPrice * ethAmount * (config.makerFeePercent / 100);
                const exitFee = exitPrice * ethAmount * (config.takerFeePercent / 100);
                const netPnl = grossPnl - entryFee - exitFee;

                return {
                  ...line,
                  status: 'PENDING',
                  type: 'BUY',
                  price: Number((newPrice * (1 - config.gridSpacingPercent / 100)).toFixed(2)),
                  realizedPnlUsd: Number(((line.realizedPnlUsd || 0) + netPnl).toFixed(2)),
                  unrealizedPnlUsd: 0,
                  filledAtPrice: undefined
                };
              }

              return line;
            }
          });
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [currentPrice, isBotActive, trend1h.isBullish, trend1h.label, consolidation.isConsolidating, volumeGuard.isVolumeOk, config]);

  // Compute Active Grid PnL Metrics
  const { totalUnrealizedPnl, totalRealizedPnl, activeMarginTotal } = calculateActiveGridPnl(
    gridLines,
    currentPrice,
    config
  );

  const handleAutoOptimizeGrid = () => {
    if (currentPrice > 0 && (candles5m.length > 0 || chartCandles.length > 0)) {
      const { recommendedGridCount, recommendedSpacingPercent } = calculateAdaptiveGridParams(
        currentPrice,
        candles5m.length > 0 ? candles5m : chartCandles,
        volumeProfile,
        config
      );
      setConfig(prev => ({
        ...prev,
        gridCount: recommendedGridCount,
        gridSpacingPercent: recommendedSpacingPercent
      }));
      if (currentPrice > 0) {
        const newGrid = generateDynamicGrid(currentPrice, volumeProfile, {
          ...config,
          gridCount: recommendedGridCount,
          gridSpacingPercent: recommendedSpacingPercent
        });
        setGridLines(newGrid);
      }
    }
  };

  const handleUpdateConfig = (newConfig: Partial<StrategyConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleToggleBotMode = (mode: 'LONG' | 'SHORT') => {
    setConfig(prev => {
      const updated = { ...prev, botMode: mode };
      if (currentPrice > 0 && (candles5m.length > 0 || chartCandles.length > 0)) {
        const newGrid = generateDynamicGrid(currentPrice, volumeProfile, updated);
        setGridLines(newGrid);
      }
      return updated;
    });
  };

  const handleRebalanceGrid = () => {
    if (currentPrice > 0) {
      const newGrid = generateDynamicGrid(currentPrice, volumeProfile, config);
      setGridLines(newGrid);
    }
  };

  const handleEmergencyCloseAll = () => {
    setGridLines(prev =>
      prev.map(line => ({
        ...line,
        status: 'PENDING',
        unrealizedPnlUsd: 0,
        filledAtPrice: undefined
      }))
    );
  };

  const handleCloseSingleLine = (id: string) => {
    setGridLines(prev =>
      prev.map(line =>
        line.id === id
          ? { ...line, status: 'PENDING', unrealizedPnlUsd: 0, filledAtPrice: undefined }
          : line
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation Bar */}
      <HeaderNav
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        high24h={high24h}
        low24h={low24h}
        volume24h={volume24h}
        isBotActive={isBotActive}
        botMode={config.botMode}
        onToggleBot={() => setIsBotActive(!isBotActive)}
        onToggleBotMode={handleToggleBotMode}
        onOpenBacktest={() => setIsBacktestOpen(true)}
        onOpenAiAnalysis={() => setIsAiDrawerOpen(true)}
        onRefreshData={fetchMarketData}
        isLoading={isLoading}
        trendLabel={trend1h.label}
        isConsolidating={consolidation.isConsolidating}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto space-y-5">
        {/* Guard Indicators & Quick Controls Bar */}
        <BotControlsBar
          config={config}
          trend1h={trend1h}
          consolidation={consolidation}
          isVolumeOk={volumeGuard.isVolumeOk}
          volumeRatio={volumeGuard.volumeRatio}
          onUpdateConfig={handleUpdateConfig}
          onRebalanceGrid={handleRebalanceGrid}
          onAutoOptimizeGrid={handleAutoOptimizeGrid}
        />

        {/* Main Grid Section: Trading Chart & Real-Time Binance Depth Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
          <div className="xl:col-span-3 min-w-0">
            <TradingChart
              candles={chartCandles.length > 0 ? chartCandles : candles5m}
              gridLines={gridLines}
              volumeProfile={volumeProfile}
              currentPrice={currentPrice}
              timeframe={timeframe}
              onTimeframeChange={handleTimeframeChange}
            />
          </div>
          <div className="xl:col-span-1 min-w-0">
            <OrderBookDepth
              depth={depthData}
              currentPrice={currentPrice}
            />
          </div>
        </div>

        {/* Active Grid Orders & Fee Audit Table */}
        <ActivePositionsTable
          gridLines={gridLines}
          config={config}
          currentPrice={currentPrice}
          totalUnrealizedPnl={totalUnrealizedPnl}
          totalRealizedPnl={totalRealizedPnl}
          activeMarginTotal={activeMarginTotal}
          onEmergencyCloseAll={handleEmergencyCloseAll}
          onCloseSingleLine={handleCloseSingleLine}
        />
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 bg-[#0D111A] text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          ETH/USDT 10x {config.botMode === 'SHORT' ? 'Bear Market Short' : 'Bull Market Long'} Grid Bot · Binance Futures API Integration
        </div>
        <div>
          Strict $5 USD Margin Cap per Order · Volume Profile & Cut-Loss Guard Active
        </div>
      </footer>

      {/* Backtest & Auto-Tuner Modal */}
      <BacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        candles5m={candles5m}
        candles1h={candles1h}
        config={config}
        onApplyConfig={newCfg => {
          setConfig(newCfg);
          handleRebalanceGrid();
        }}
      />

      {/* Gemini AI Strategic Rationale Drawer */}
      <AiAnalysisDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        currentPrice={currentPrice}
        trend1h={trend1h}
        consolidation={consolidation}
        isVolumeOk={volumeGuard.isVolumeOk}
        volumeProfile={volumeProfile}
        botConfig={config}
        backtestMetrics={lastBacktestMetrics}
        totalRealizedPnl={totalRealizedPnl}
      />
    </div>
  );
}
