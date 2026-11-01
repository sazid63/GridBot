import { Candle, Trend1hStatus, ConsolidationStatus } from '../types/grid';

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return Array(closes.length).fill(0);
  const k = 2 / (period + 1);
  const ema: number[] = [];

  // Initial SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  let prevEma = sum / period;
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      ema.push(0);
    } else if (i === period - 1) {
      ema.push(prevEma);
    } else {
      const currentEma = closes[i] * k + prevEma * (1 - k);
      ema.push(currentEma);
      prevEma = currentEma;
    }
  }

  return ema;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return Array(closes.length).fill(50);
  const rsi: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(50);
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    } else {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  if (candles.length < period) return Array(candles.length).fill(0);
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const tr1 = candles[i].high - candles[i].low;
      const tr2 = Math.abs(candles[i].high - candles[i - 1].close);
      const tr3 = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(tr1, tr2, tr3));
    }
  }

  const atr: number[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  let prevAtr = sum / period;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      atr.push(0);
    } else if (i === period - 1) {
      atr.push(prevAtr);
    } else {
      const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
      atr.push(currentAtr);
      prevAtr = currentAtr;
    }
  }

  return atr;
}

/**
 * Evaluates 1-Hour Trend Filter
 * Rules: 1h EMA20 > EMA50 and RSI >= 45 => BULLISH (Long Market Allowed)
 */
export function evaluate1hTrend(candles1h: Candle[]): Trend1hStatus {
  if (candles1h.length < 50) {
    return { isBullish: true, ema20: 0, ema50: 0, rsi: 50, label: 'BULLISH' };
  }

  const closes = candles1h.map(c => c.close);
  const ema20Array = calculateEMA(closes, 20);
  const ema50Array = calculateEMA(closes, 50);
  const rsiArray = calculateRSI(closes, 14);

  const lastIdx = closes.length - 1;
  const ema20 = ema20Array[lastIdx];
  const ema50 = ema50Array[lastIdx];
  const rsi = rsiArray[lastIdx];

  const isEmaBullish = ema20 > ema50;
  const isRsiBullish = rsi >= 45;
  const isBullish = isEmaBullish && isRsiBullish;

  let label: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
  if (isEmaBullish && rsi >= 50) label = 'BULLISH';
  else if (!isEmaBullish && rsi < 45) label = 'BEARISH';

  return { isBullish, ema20, ema50, rsi, label };
}

/**
 * Evaluates Consolidation / Hovering Range Guard on 5m Candles
 * If price range over last 20 candles is < 0.8% or ATR/price ratio < 0.15%, price is consolidating in a narrow band.
 */
export function evaluateConsolidation(candles5m: Candle[]): ConsolidationStatus {
  if (candles5m.length < 20) {
    return { isConsolidating: false, bandwidth: 1.0, atr5m: 0, message: 'Normal' };
  }

  const recent20 = candles5m.slice(-20);
  const currentPrice = candles5m[candles5m.length - 1].close;

  let highest = -Infinity;
  let lowest = Infinity;
  recent20.forEach(c => {
    if (c.high > highest) highest = c.high;
    if (c.low < lowest) lowest = c.low;
  });

  const rangePercent = ((highest - lowest) / lowest) * 100;
  const atrs = calculateATR(candles5m, 14);
  const currentAtr = atrs[atrs.length - 1];
  const atrPercent = (currentAtr / currentPrice) * 100;

  // Squeeze threshold: Range < 0.75% OR ATR < 0.12%
  const isConsolidating = rangePercent < 0.75 || atrPercent < 0.12;

  let message = 'Active Market Volatility';
  if (isConsolidating) {
    message = `Consolidating in ${rangePercent.toFixed(2)}% tight range (ATR: ${atrPercent.toFixed(2)}%). Trading paused.`;
  }

  return {
    isConsolidating,
    bandwidth: rangePercent,
    atr5m: currentAtr,
    message
  };
}

/**
 * Evaluates Volume Guard on 5m Candles
 */
export function evaluateVolumeStatus(candles5m: Candle[], thresholdRatio: number = 0.8): { isVolumeOk: boolean; volumeRatio: number; currentVolume: number; avgVolume: number } {
  if (candles5m.length < 20) {
    return { isVolumeOk: true, volumeRatio: 1.0, currentVolume: 0, avgVolume: 0 };
  }

  const recent20 = candles5m.slice(-20);
  const sumVol = recent20.reduce((acc, c) => acc + c.volume, 0);
  const avgVol = sumVol / 20;
  const lastVol = candles5m[candles5m.length - 1].volume;
  const ratio = avgVol > 0 ? lastVol / avgVol : 1;

  return {
    isVolumeOk: ratio >= thresholdRatio,
    volumeRatio: ratio,
    currentVolume: lastVol,
    avgVolume: avgVol
  };
}
