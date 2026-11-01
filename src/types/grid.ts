export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeProfileBucket {
  priceLevel: number;
  volume: number;
  isPOC: boolean; // Point of Control
  isHVN: boolean; // High Volume Node
  inValueArea: boolean; // Between VAL and VAH
}

export interface VolumeProfileSummary {
  poc: number; // Point of Control price
  vah: number; // Value Area High price
  val: number; // Value Area Low price
  totalVolume: number;
  buckets: VolumeProfileBucket[];
  hvnLevels: number[]; // High Volume Nodes prices
  lvnLevels: number[]; // Low Volume Nodes prices
}

export interface GridLine {
  id: string;
  price: number;
  type: 'BUY' | 'SELL';
  status: 'PENDING' | 'FILLED' | 'CLOSED';
  marginUsd: number; // Max $5
  positionSizeEth: number;
  liquidationPrice: number;
  stopLossPrice: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  filledAtPrice?: number;
  filledTimestamp?: number;
  botMode?: 'LONG' | 'SHORT';
}

export interface StrategyConfig {
  botMode: 'LONG' | 'SHORT'; // 'LONG' = Bull Market Bot, 'SHORT' = Bear Market Bot
  leverage: number; // Locked at 10x
  maxMarginPerGrid: number; // Locked at $5 USD
  gridCount: number; // 5 to 25 grid lines
  gridSpacingPercent: number; // Spacing % between lines
  stopLossPercent: number; // Cut-loss threshold below VAL (Long) or above VAH (Short)
  minVolumeThresholdRatio: number; // e.g. 0.8x of 20-period volume SMA
  enable1hTrendFilter: boolean; // Long: 1h EMA20 > EMA50; Short: 1h EMA20 < EMA50
  enableConsolidationFilter: boolean; // Squeeze guard
  enableVolumeFilter: boolean;
  enableVolumeProfileAnchoring: boolean;
  makerFeePercent: number; // Binance Futures Maker Fee: 0.02%
  takerFeePercent: number; // Binance Futures Taker Fee: 0.05%
}

export interface Trend1hStatus {
  isBullish: boolean;
  ema20: number;
  ema50: number;
  rsi: number;
  label: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
}

export interface ConsolidationStatus {
  isConsolidating: boolean; // Hovering inside small range
  bandwidth: number;
  atr5m: number;
  message: string;
}

export interface BacktestTradeLog {
  id: string;
  entryTime: number;
  exitTime: number;
  type: 'LONG_GRID_CYCLE' | 'SHORT_GRID_CYCLE';
  entryPrice: number;
  exitPrice: number;
  marginUsd: number;
  positionEth: number;
  grossPnlUsd: number;
  feeUsd: number;
  netPnlUsd: number;
  returnPercent: number;
  exitReason: 'TAKE_PROFIT_GRID' | 'CUT_LOSS_STOP' | 'TREND_EXIT' | 'LIQUIDATION_BUFFER';
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  grossProfitUsd: number;
  totalFeesUsd: number;
  netProfitUsd: number;
  returnOnEquityPercent: number; // % based on max grid collateral
  maxDrawdownPercent: number;
  sharpeRatio: number;
  avgTradeDurationMinutes: number;
  tradesLog: BacktestTradeLog[];
  equityCurve: { timestamp: number; equity: number }[];
  optimalConfig?: Partial<StrategyConfig>;
}

export interface OrderBookData {
  bids: [string, string][]; // [price, qty]
  asks: [string, string][]; // [price, qty]
  lastUpdateId?: number;
}

