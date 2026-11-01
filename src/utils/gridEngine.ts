import { Candle, GridLine, StrategyConfig, VolumeProfileSummary } from '../types/grid';
import { calculateATR } from './indicators';

/**
 * Calculates fee-adjusted minimum viable grid spacing %
 * Binance Futures Round-Trip Fee = 0.02% Maker + 0.02% Maker = 0.04%
 * Target minimum net profit per grid hit = 0.15% to 0.50%
 */
export function calculateMinFeeAdjustedSpacing(config: StrategyConfig): number {
  const roundTripFeePercent = config.makerFeePercent + config.makerFeePercent;
  const targetNetProfitPercent = 0.01; // Allows scalping down to 0.05% spacing
  return Math.max(0.05, roundTripFeePercent + targetNetProfitPercent);
}

/**
 * Adaptive Volatility & Volume Profile Grid Optimizer
 * Automatically calculates optimal grid line count and spacing based on ATR, 20-period Volatility, and HVN Density.
 */
export function calculateAdaptiveGridParams(
  currentPrice: number,
  candles5m: Candle[],
  volumeProfile: VolumeProfileSummary,
  config: StrategyConfig
): { recommendedGridCount: number; recommendedSpacingPercent: number; regimeLabel: string } {
  if (!candles5m || candles5m.length < 20 || currentPrice <= 0) {
    return { recommendedGridCount: config.gridCount, recommendedSpacingPercent: config.gridSpacingPercent, regimeLabel: 'Standard' };
  }

  // Calculate 14-period ATR
  const atrs = calculateATR(candles5m, 14);
  const currentAtr = atrs[atrs.length - 1] || currentPrice * 0.005;
  const atrPercent = (currentAtr / currentPrice) * 100;

  // Calculate High Volume Node (HVN) cluster density within 3% range
  const isShort = config.botMode === 'SHORT';
  const hvnClusterCount = isShort
    ? volumeProfile.hvnLevels.filter(hvn => hvn > currentPrice && hvn <= currentPrice * 1.03).length
    : volumeProfile.hvnLevels.filter(hvn => hvn < currentPrice && hvn >= currentPrice * 0.97).length;

  let recommendedGridCount = 10;
  let recommendedSpacingPercent = 0.50;
  let regimeLabel = isShort ? 'Moderate Volatility Bear Grid' : 'Moderate Volatility Bull Grid';

  if (atrPercent < 0.30) {
    recommendedGridCount = hvnClusterCount >= 3 ? 12 : 10;
    recommendedSpacingPercent = 0.35;
    regimeLabel = isShort ? 'Low Volatility (Tight Bear Grid)' : 'Low Volatility (Tight Bull Grid)';
  } else if (atrPercent >= 0.30 && atrPercent <= 0.65) {
    recommendedGridCount = 10;
    recommendedSpacingPercent = Math.max(0.45, Number((atrPercent * 0.95).toFixed(2)));
    regimeLabel = isShort ? 'Normal Volatility (Standard Bear Grid)' : 'Normal Volatility (Standard Bull Grid)';
  } else {
    recommendedGridCount = 7;
    recommendedSpacingPercent = Math.min(1.20, Number((atrPercent * 1.1).toFixed(2)));
    regimeLabel = isShort ? 'High Volatility (Bear Distribution Guard)' : 'High Volatility (Wide Capital Shield)';
  }

  const minSpacing = calculateMinFeeAdjustedSpacing(config);
  recommendedSpacingPercent = Math.max(minSpacing, recommendedSpacingPercent);

  return {
    recommendedGridCount,
    recommendedSpacingPercent,
    regimeLabel
  };
}

/**
 * Calculates a non-linear grid spacing multiplier based on proximity to the Volume Profile Point of Control (POC).
 * - Grids cluster tighter (multiplier ~0.60-0.65) around the Point of Control where trading liquidity is highest.
 * - Spacing expands non-linearly (multiplier up to 1.50-1.85) towards and beyond the Value Area High (VAH) / Value Area Low (VAL).
 */
export function calculateNonLinearSpacingMultiplier(
  candidatePrice: number,
  volumeProfile?: VolumeProfileSummary
): number {
  if (!volumeProfile || !volumeProfile.poc || volumeProfile.poc <= 0 || isNaN(volumeProfile.poc)) {
    return 1.0;
  }

  const { poc, vah, val } = volumeProfile;

  // Fallback to standard linear distribution if Value Area is degenerate or invalid
  if (isNaN(vah) || isNaN(val) || vah <= val || (vah <= poc && poc <= val)) {
    return 1.0;
  }

  let distRatio = 0;
  if (candidatePrice >= poc) {
    // Upper region towards Value Area High (VAH)
    const upperSpan = Math.max(vah - poc, poc * 0.008);
    distRatio = (candidatePrice - poc) / upperSpan;
  } else {
    // Lower region towards Value Area Low (VAL)
    const lowerSpan = Math.max(poc - val, poc * 0.008);
    distRatio = (poc - candidatePrice) / lowerSpan;
  }

  // Non-linear power distribution:
  // - At POC (distRatio = 0): multiplier = 0.65 (clusters 35% tighter)
  // - At VAH / VAL (distRatio = 1.0): multiplier = 1.50 (50% wider spacing)
  // - Beyond VAH / VAL (distRatio > 1.0): expands smoothly up to 1.85 cap
  const clampedRatio = Math.max(0, Math.min(2.5, distRatio));
  const nonLinearMultiplier = 0.65 + 0.85 * Math.pow(clampedRatio, 1.35);

  return Math.min(1.85, Math.max(0.60, nonLinearMultiplier));
}

/**
 * Generates dynamic 10x Futures Grid levels:
 * - In LONG mode (Bull Market Bot):
 *     * Take Profit SELL orders sit strictly ABOVE current price.
 *     * One unified stop-loss sits BELOW current price, anchored beneath VAL.
 *     * Grids cluster around POC and expand towards VAH.
 * - In SHORT mode (Bear Market Bot):
 *     * Take Profit BUY orders sit strictly BELOW current price (to buy back short positions cheaper).
 *     * One unified stop-loss sits ABOVE current price, anchored above VAH.
 *     * Grids cluster around POC and expand towards VAL.
 */
export function generateDynamicGrid(
  currentPrice: number,
  volumeProfile: VolumeProfileSummary,
  config: StrategyConfig
): GridLine[] {
  if (!currentPrice || currentPrice <= 0 || isNaN(currentPrice)) {
    return [];
  }

  const gridLines: GridLine[] = [];
  const minSpacing = calculateMinFeeAdjustedSpacing(config);
  const baseSpacingPercent = Math.max(minSpacing, config.gridSpacingPercent);

  // Strict $5 USD Margin cap per trade, 10x leverage
  const marginUsd = Math.min(5, config.maxMarginPerGrid);
  const leverage = 10;
  const isShort = config.botMode === 'SHORT';

  const gridLineCount = Math.max(4, config.gridCount);
  const assignedPrices: number[] = [];
  const snappedHvns = new Set<number>();

  if (isShort) {
    // ==========================================
    // BEAR MARKET BOT: 10x SHORT FUTURES GRID
    // Take-Profit BUY Limit Orders sit strictly BELOW current price
    // ==========================================
    let prevBuyPrice = currentPrice;
    for (let j = 0; j < gridLineCount; j++) {
      // Non-linear spacing step: tightest near POC, expanding towards VAL
      const spacingMultiplier = calculateNonLinearSpacingMultiplier(prevBuyPrice, volumeProfile);
      const stepPercent = Math.max(minSpacing, baseSpacingPercent * spacingMultiplier);
      const stepDecimal = stepPercent / 100;

      let targetPrice = prevBuyPrice * (1 - stepDecimal);

      if (config.enableVolumeProfileAnchoring && volumeProfile.hvnLevels.length > 0) {
        const maxSnapTolerance = Math.min(0.0010, stepDecimal * 0.25);
        const candidateHvn = volumeProfile.hvnLevels.find(
          hvn =>
            !snappedHvns.has(hvn) &&
            hvn < prevBuyPrice &&
            Math.abs(hvn - targetPrice) / targetPrice <= maxSnapTolerance &&
            (prevBuyPrice - hvn) / prevBuyPrice >= stepDecimal * 0.85
        );

        if (candidateHvn) {
          targetPrice = candidateHvn;
          snappedHvns.add(candidateHvn);
        }
      }

      const minGap = prevBuyPrice * Math.max(0.0002, stepDecimal * 0.5);
      if (prevBuyPrice - targetPrice < minGap) {
        targetPrice = prevBuyPrice - minGap;
      }

      const price = Number(targetPrice.toFixed(2));
      assignedPrices.push(price);
      prevBuyPrice = price;
    }

    // Unified Stop-Loss for Short Bot sits strictly ABOVE current market price
    let unifiedStopLossPrice = Number((currentPrice * (1 + config.stopLossPercent / 100)).toFixed(2));
    if (volumeProfile.vah > 0 && volumeProfile.vah > currentPrice && volumeProfile.vah < currentPrice * 1.10) {
      unifiedStopLossPrice = Number((volumeProfile.vah * 1.005).toFixed(2));
    }

    // Short positions liquidation: +9.2% price increase at 10x leverage
    const shortLiquidationPrice = Number((currentPrice * 1.092).toFixed(2));

    assignedPrices.forEach((price, idx) => {
      const positionSizeEth = Number(((marginUsd * leverage) / currentPrice).toFixed(4));

      gridLines.push({
        id: `grid-short-tp-${idx + 1}-${price}`,
        price,
        type: 'BUY', // Take Profit BUY order to close Short
        status: 'FILLED', // Active Short Base position initialized at market price with TP target below
        filledAtPrice: currentPrice,
        filledTimestamp: Date.now() - (idx + 1) * 120000,
        marginUsd,
        positionSizeEth,
        liquidationPrice: shortLiquidationPrice,
        stopLossPrice: unifiedStopLossPrice,
        botMode: 'SHORT',
        unrealizedPnlUsd: 0,
        realizedPnlUsd: 0
      });
    });

  } else {
    // ==========================================
    // BULL MARKET BOT: 10x LONG FUTURES GRID
    // Take-Profit SELL Orders sit strictly ABOVE current price
    // ==========================================
    let prevSellPrice = currentPrice;
    for (let j = 0; j < gridLineCount; j++) {
      // Non-linear spacing step: tightest near POC, expanding towards VAH
      const spacingMultiplier = calculateNonLinearSpacingMultiplier(prevSellPrice, volumeProfile);
      const stepPercent = Math.max(minSpacing, baseSpacingPercent * spacingMultiplier);
      const stepDecimal = stepPercent / 100;

      let targetPrice = prevSellPrice * (1 + stepDecimal);

      if (config.enableVolumeProfileAnchoring && volumeProfile.hvnLevels.length > 0) {
        const maxSnapTolerance = Math.min(0.0010, stepDecimal * 0.25);
        const candidateHvn = volumeProfile.hvnLevels.find(
          hvn =>
            !snappedHvns.has(hvn) &&
            hvn > prevSellPrice &&
            Math.abs(hvn - targetPrice) / targetPrice <= maxSnapTolerance &&
            (hvn - prevSellPrice) / prevSellPrice >= stepDecimal * 0.85
        );

        if (candidateHvn) {
          targetPrice = candidateHvn;
          snappedHvns.add(candidateHvn);
        }
      }

      const minGap = prevSellPrice * Math.max(0.0002, stepDecimal * 0.5);
      if (targetPrice - prevSellPrice < minGap) {
        targetPrice = prevSellPrice + minGap;
      }

      const price = Number(targetPrice.toFixed(2));
      assignedPrices.push(price);
      prevSellPrice = price;
    }

    // Unified Stop-Loss for Long Bot sits strictly BELOW current market price
    let unifiedStopLossPrice = Number((currentPrice * (1 - config.stopLossPercent / 100)).toFixed(2));
    if (volumeProfile.val > 0 && volumeProfile.val < currentPrice && volumeProfile.val > currentPrice * 0.90) {
      unifiedStopLossPrice = Number((volumeProfile.val * 0.995).toFixed(2));
    }

    assignedPrices.forEach((price, idx) => {
      const positionSizeEth = Number(((marginUsd * leverage) / price).toFixed(4));
      const liquidationPrice = Number((price * 0.908).toFixed(2));

      gridLines.push({
        id: `grid-sell-tp-${idx + 1}-${price}`,
        price,
        type: 'SELL',
        status: 'FILLED', // Active Long Base position initialized at market price with TP target above
        filledAtPrice: currentPrice,
        filledTimestamp: Date.now() - (idx + 1) * 120000,
        marginUsd,
        positionSizeEth,
        liquidationPrice,
        stopLossPrice: unifiedStopLossPrice,
        botMode: 'LONG',
        unrealizedPnlUsd: 0,
        realizedPnlUsd: 0
      });
    });
  }

  // Sort grid lines by price descending
  return gridLines.sort((a, b) => b.price - a.price);
}

/**
 * Calculates PnL for active filled grid lines given current ETH price
 */
export function calculateActiveGridPnl(
  gridLines: GridLine[],
  currentPrice: number,
  config: StrategyConfig
): { totalUnrealizedPnl: number; totalRealizedPnl: number; activeMarginTotal: number; liquidationRiskCount: number } {
  let totalUnrealizedPnl = 0;
  let totalRealizedPnl = 0;
  let activeMarginTotal = 0;
  let liquidationRiskCount = 0;

  const isShortMode = config.botMode === 'SHORT';

  gridLines.forEach(line => {
    totalRealizedPnl += line.realizedPnlUsd || 0;

    if (line.status === 'FILLED' && line.filledAtPrice && line.positionSizeEth > 0) {
      activeMarginTotal += line.marginUsd;
      const ethAmount = line.positionSizeEth;
      const isShortLine = line.botMode === 'SHORT' || isShortMode;

      // PnL calculation:
      // Long: profit when currentPrice > filledAtPrice
      // Short: profit when currentPrice < filledAtPrice
      const priceDiff = isShortLine
        ? line.filledAtPrice - currentPrice
        : currentPrice - line.filledAtPrice;

      const rawPnl = priceDiff * ethAmount;

      const entryFee = line.filledAtPrice * ethAmount * (config.makerFeePercent / 100);
      const exitFeeEstimate = currentPrice * ethAmount * (config.takerFeePercent / 100);
      const netPnl = rawPnl - entryFee - exitFeeEstimate;

      line.unrealizedPnlUsd = Number(netPnl.toFixed(2));
      totalUnrealizedPnl += netPnl;

      // Liquidation warning check:
      // Long: warning if price drops to within 1.5% of liquidation
      // Short: warning if price rises to within 1.5% of liquidation
      if (isShortLine) {
        if (currentPrice >= line.liquidationPrice * 0.985) {
          liquidationRiskCount++;
        }
      } else {
        if (currentPrice <= line.liquidationPrice * 1.015) {
          liquidationRiskCount++;
        }
      }
    }
  });

  return {
    totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
    totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
    activeMarginTotal: Number(activeMarginTotal.toFixed(2)),
    liquidationRiskCount
  };
}
