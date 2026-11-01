import { Candle, StrategyConfig, BacktestResult, BacktestTradeLog } from '../types/grid';
import { evaluate1hTrend, evaluateConsolidation, evaluateVolumeStatus } from './indicators';
import { calculateVolumeProfile } from './volumeProfile';

/**
 * Runs a realistic historical backtest simulation on 5m ETH/USDT klines
 */
export function runBacktest(
  candles5m: Candle[],
  candles1h: Candle[],
  config: StrategyConfig
): BacktestResult {
  if (!candles5m || candles5m.length < 50) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      grossProfitUsd: 0,
      totalFeesUsd: 0,
      netProfitUsd: 0,
      returnOnEquityPercent: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      avgTradeDurationMinutes: 0,
      tradesLog: [],
      equityCurve: []
    };
  }

  const tradesLog: BacktestTradeLog[] = [];
  const equityCurve: { timestamp: number; equity: number }[] = [];

  // Starting capital allocation
  const startingWalletCapital = 60; // $60 USD total wallet balance
  let currentBalance = 60;
  let peakBalance = currentBalance;
  let maxDrawdownUsd = 0;

  // Active open long positions: price -> { entryPrice, entryTime, positionEth, marginUsd }
  let openPositions: { entryPrice: number; entryTime: number; positionEth: number; marginUsd: number }[] = [];

  const makerFeeRate = config.makerFeePercent / 100; // 0.0002
  const takerFeeRate = config.takerFeePercent / 100; // 0.0005

  // Process candles chronologically
  const startIndex = Math.max(50, candles5m.length - 1500); // Process last ~1500 candles (~5 days)
  
  for (let i = startIndex; i < candles5m.length; i++) {
    const candle = candles5m[i];
    const historical5mWindow = candles5m.slice(Math.max(0, i - 100), i + 1);
    
    // Slice corresponding 1h candles
    const currentTimestamp = candle.timestamp;
    const historical1hWindow = candles1h.filter(c => c.timestamp <= currentTimestamp);

    // Evaluate Filter Conditions
    const trend1h = config.enable1hTrendFilter ? evaluate1hTrend(historical1hWindow) : { isBullish: true, label: 'BULLISH' };
    const consolidation = config.enableConsolidationFilter ? evaluateConsolidation(historical5mWindow) : { isConsolidating: false };
    const volumeGuard = config.enableVolumeFilter ? evaluateVolumeStatus(historical5mWindow, config.minVolumeThresholdRatio) : { isVolumeOk: true };

    const vp = config.enableVolumeProfileAnchoring
      ? calculateVolumeProfile(historical5mWindow, 30)
      : { poc: candle.close, val: candle.close * 0.98, vah: candle.close * 1.02 };

    const currentPrice = candle.close;
    const gridSpacing = config.gridSpacingPercent / 100;
    const isShort = config.botMode === 'SHORT';

    const remainingPositions: typeof openPositions = [];

    if (isShort) {
      // ==========================================
      // BEAR MARKET BOT SIMULATION (10x Short)
      // ==========================================
      const cutLossPrice = vp.vah > 0 && vp.vah > currentPrice
        ? vp.vah * 1.005
        : currentPrice * (1 + config.stopLossPercent / 100);

      for (const pos of openPositions) {
        // 10x Short liquidation: +9.2% adverse rise
        const liquidationPrice = pos.entryPrice * 1.092;
        const stopPrice = Math.min(liquidationPrice, pos.entryPrice * (1 + config.stopLossPercent / 100));
        const effectiveCutLoss = Math.min(stopPrice, cutLossPrice);

        if (candle.high >= effectiveCutLoss) {
          // STOP-LOSS / CUT-LOSS EXECUTED FOR SHORT
          const exitPrice = effectiveCutLoss;
          const grossPnl = (pos.entryPrice - exitPrice) * pos.positionEth;
          const entryFee = pos.entryPrice * pos.positionEth * makerFeeRate;
          const exitFee = exitPrice * pos.positionEth * takerFeeRate;
          const netPnl = grossPnl - entryFee - exitFee;

          currentBalance += netPnl;

          tradesLog.push({
            id: `trade-sl-short-${tradesLog.length + 1}`,
            entryTime: pos.entryTime,
            exitTime: candle.timestamp,
            type: 'SHORT_GRID_CYCLE',
            entryPrice: pos.entryPrice,
            exitPrice,
            marginUsd: pos.marginUsd,
            positionEth: pos.positionEth,
            grossPnlUsd: grossPnl,
            feeUsd: entryFee + exitFee,
            netPnlUsd: netPnl,
            returnPercent: (netPnl / pos.marginUsd) * 100,
            exitReason: candle.high >= liquidationPrice ? 'LIQUIDATION_BUFFER' : 'CUT_LOSS_STOP'
          });
        } else if (candle.low <= pos.entryPrice * (1 - gridSpacing)) {
          // TAKE-PROFIT HIT: BOUGHT BACK LOWER TO CLOSE SHORT
          const exitPrice = pos.entryPrice * (1 - gridSpacing);
          const grossPnl = (pos.entryPrice - exitPrice) * pos.positionEth;
          const entryFee = pos.entryPrice * pos.positionEth * makerFeeRate;
          const exitFee = exitPrice * pos.positionEth * makerFeeRate;
          const netPnl = grossPnl - entryFee - exitFee;

          currentBalance += netPnl;

          tradesLog.push({
            id: `trade-tp-short-${tradesLog.length + 1}`,
            entryTime: pos.entryTime,
            exitTime: candle.timestamp,
            type: 'SHORT_GRID_CYCLE',
            entryPrice: pos.entryPrice,
            exitPrice,
            marginUsd: pos.marginUsd,
            positionEth: pos.positionEth,
            grossPnlUsd: grossPnl,
            feeUsd: entryFee + exitFee,
            netPnlUsd: netPnl,
            returnPercent: (netPnl / pos.marginUsd) * 100,
            exitReason: 'TAKE_PROFIT_GRID'
          });
        } else {
          remainingPositions.push(pos);
        }
      }

      openPositions = remainingPositions;

      // Check Short Entry Conditions (Bearish 1h, Not Consolidating, Volume Ok)
      const isBearishTrend = !trend1h.isBullish || trend1h.label === 'BEARISH';
      if (isBearishTrend && !consolidation.isConsolidating && volumeGuard.isVolumeOk && openPositions.length < config.gridCount) {
        const targetShortPrice = currentPrice * (1 + gridSpacing);
        if (candle.high >= targetShortPrice && openPositions.length < config.gridCount) {
          const marginUsd = Math.min(5, config.maxMarginPerGrid);
          const positionEth = (marginUsd * 10) / targetShortPrice;

          openPositions.push({
            entryPrice: targetShortPrice,
            entryTime: candle.timestamp,
            positionEth,
            marginUsd
          });
        }
      }

    } else {
      // ==========================================
      // BULL MARKET BOT SIMULATION (10x Long)
      // ==========================================
      const cutLossPrice = vp.val > 0 && vp.val < currentPrice
        ? vp.val * 0.995
        : currentPrice * (1 - config.stopLossPercent / 100);

      for (const pos of openPositions) {
        // 10x Liquidation threshold: ~9.2% adverse drop
        const liquidationPrice = pos.entryPrice * 0.908;
        const stopPrice = Math.max(liquidationPrice, pos.entryPrice * (1 - config.stopLossPercent / 100));
        const effectiveCutLoss = Math.max(stopPrice, cutLossPrice);

        if (candle.low <= effectiveCutLoss) {
          // CUT-LOSS / STOP-LOSS EXECUTED!
          const exitPrice = effectiveCutLoss;
          const grossPnl = (exitPrice - pos.entryPrice) * pos.positionEth;
          const entryFee = pos.entryPrice * pos.positionEth * makerFeeRate;
          const exitFee = exitPrice * pos.positionEth * takerFeeRate; // Taker market order cut-loss
          const netPnl = grossPnl - entryFee - exitFee;

          currentBalance += netPnl;

          tradesLog.push({
            id: `trade-sl-${tradesLog.length + 1}`,
            entryTime: pos.entryTime,
            exitTime: candle.timestamp,
            type: 'LONG_GRID_CYCLE',
            entryPrice: pos.entryPrice,
            exitPrice,
            marginUsd: pos.marginUsd,
            positionEth: pos.positionEth,
            grossPnlUsd: grossPnl,
            feeUsd: entryFee + exitFee,
            netPnlUsd: netPnl,
            returnPercent: (netPnl / pos.marginUsd) * 100,
            exitReason: candle.low <= liquidationPrice ? 'LIQUIDATION_BUFFER' : 'CUT_LOSS_STOP'
          });
        } else if (candle.high >= pos.entryPrice * (1 + gridSpacing)) {
          // TAKE-PROFIT GRID HIT EXECUTED!
          const exitPrice = pos.entryPrice * (1 + gridSpacing);
          const grossPnl = (exitPrice - pos.entryPrice) * pos.positionEth;
          const entryFee = pos.entryPrice * pos.positionEth * makerFeeRate;
          const exitFee = exitPrice * pos.positionEth * makerFeeRate; // Limit order maker take profit
          const netPnl = grossPnl - entryFee - exitFee;

          currentBalance += netPnl;

          tradesLog.push({
            id: `trade-tp-${tradesLog.length + 1}`,
            entryTime: pos.entryTime,
            exitTime: candle.timestamp,
            type: 'LONG_GRID_CYCLE',
            entryPrice: pos.entryPrice,
            exitPrice,
            marginUsd: pos.marginUsd,
            positionEth: pos.positionEth,
            grossPnlUsd: grossPnl,
            feeUsd: entryFee + exitFee,
            netPnlUsd: netPnl,
            returnPercent: (netPnl / pos.marginUsd) * 100,
            exitReason: 'TAKE_PROFIT_GRID'
          });
        } else {
          remainingPositions.push(pos);
        }
      }

      openPositions = remainingPositions;

      // Check Buy Entry Conditions
      if (trend1h.isBullish && !consolidation.isConsolidating && volumeGuard.isVolumeOk && openPositions.length < config.gridCount) {
        const targetBuyPrice = currentPrice * (1 - gridSpacing);
        if (candle.low <= targetBuyPrice && openPositions.length < config.gridCount) {
          const marginUsd = Math.min(5, config.maxMarginPerGrid);
          const positionEth = (marginUsd * 10) / targetBuyPrice; // 10x leverage

          openPositions.push({
            entryPrice: targetBuyPrice,
            entryTime: candle.timestamp,
            positionEth,
            marginUsd
          });
        }
      }
    }

    // Equity tracking
    let floatingPnl = 0;
    openPositions.forEach(p => {
      floatingPnl += isShort
        ? (p.entryPrice - currentPrice) * p.positionEth
        : (currentPrice - p.entryPrice) * p.positionEth;
    });

    const currentEquity = currentBalance + floatingPnl;
    if (currentEquity > peakBalance) peakBalance = currentEquity;
    const drawdown = peakBalance - currentEquity;
    if (drawdown > maxDrawdownUsd) maxDrawdownUsd = drawdown;

    if (i % 12 === 0) { // Record every ~1 hour
      equityCurve.push({ timestamp: candle.timestamp, equity: Number(currentEquity.toFixed(2)) });
    }
  }

  // Calculate Summary Statistics
  const winningTrades = tradesLog.filter(t => t.netPnlUsd > 0).length;
  const losingTrades = tradesLog.filter(t => t.netPnlUsd <= 0).length;
  const totalTrades = tradesLog.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const grossProfitUsd = tradesLog.reduce((acc, t) => acc + (t.grossPnlUsd > 0 ? t.grossPnlUsd : 0), 0);
  const totalFeesUsd = tradesLog.reduce((acc, t) => acc + t.feeUsd, 0);
  const netProfitUsd = currentBalance - startingWalletCapital;
  const returnOnEquityPercent = (netProfitUsd / startingWalletCapital) * 100;
  const maxDrawdownPercent = peakBalance > 0 ? (maxDrawdownUsd / peakBalance) * 100 : 0;

  // Average trade duration
  let totalDurationMs = 0;
  tradesLog.forEach(t => {
    totalDurationMs += t.exitTime - t.entryTime;
  });
  const avgTradeDurationMinutes = totalTrades > 0 ? Math.round(totalDurationMs / totalTrades / 60000) : 0;

  // Simple Sharpe approximation
  const returns = tradesLog.map(t => t.netPnlUsd);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / (returns.length - 1))
    : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(1)),
    grossProfitUsd: Number(grossProfitUsd.toFixed(2)),
    totalFeesUsd: Number(totalFeesUsd.toFixed(2)),
    netProfitUsd: Number(netProfitUsd.toFixed(2)),
    returnOnEquityPercent: Number(returnOnEquityPercent.toFixed(1)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(1)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    avgTradeDurationMinutes,
    tradesLog: tradesLog.reverse(),
    equityCurve
  };
}

/**
 * Hyperparameter Auto-Tuner for ETH/USDT 10x Grid
 * Iterates through grid spacing, grid count, and stop-loss options to auto-tune parameters
 */
export function autoTuneGridStrategy(
  candles5m: Candle[],
  candles1h: Candle[],
  baseConfig: StrategyConfig
): { bestConfig: StrategyConfig; bestResult: BacktestResult; testedCombinations: number } {
  const gridSpacingOptions = [0.35, 0.50, 0.70, 0.90];
  const gridCountOptions = [8, 12, 16];
  const stopLossOptions = [1.5, 2.0, 2.5];

  let bestResult: BacktestResult | null = null;
  let bestConfig: StrategyConfig = { ...baseConfig };
  let testedCount = 0;

  for (const spacing of gridSpacingOptions) {
    for (const count of gridCountOptions) {
      for (const sl of stopLossOptions) {
        testedCount++;
        const testConfig: StrategyConfig = {
          ...baseConfig,
          gridSpacingPercent: spacing,
          gridCount: count,
          stopLossPercent: sl
        };

        const result = runBacktest(candles5m, candles1h, testConfig);

        if (!bestResult || result.netProfitUsd > bestResult.netProfitUsd) {
          bestResult = result;
          bestConfig = testConfig;
        }
      }
    }
  }

  return {
    bestConfig,
    bestResult: bestResult || runBacktest(candles5m, candles1h, baseConfig),
    testedCombinations: testedCount
  };
}
