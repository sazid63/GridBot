# ETH/USDT 10x Long Futures Grid Trading Bot with Volume Profile & Backtesting Engine

An intelligent, professional futures grid trading dashboard and simulation engine optimized for the ETH/USDT Binance Futures market. The bot operates with strict **10x leverage** strictly in **Long-only mode**, featuring a **1-hour trend filter**, **5-minute candle execution**, **consolidation & volume filters**, **Volume Profile anchor zones (HVN & VAH/VAL)**, **strict $5 margin caps per trade**, and an **automated backtesting & hyperparameter optimizer**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed by the user in Phase 1 and expanded with strict risk management rules:

- **Confirmed Market Data Source**: Real-time Binance Public API (`fapi.binance.com` / `api.binance.com`) fetching live 1h and 5m ETH/USDT futures klines, with an integrated historical backtesting engine.
- **Confirmed Grid Anchoring**: Dynamic grid lines calculated around Volume Profile High Volume Nodes (HVNs) and Value Area High/Low (VAH/VAL) bounds, adjusted for Binance Futures fees (0.02% Maker / 0.05% Taker) and 10x liquidation thresholds.
- **Confirmed Risk Management & Stop-Loss**: Hard stop-loss and immediate grid pause/cut-loss whenever price drops below Value Area Low (VAL) or the 10x liquidation buffer, strictly preventing holding onto losing trades.
- **Confirmed Position Sizing Cap**: Hard upper limit of **$5 USD margin per grid level** ($5 margin x 10x leverage = $50 max position value per grid line).
- **Confirmed Backtest & Auto-Tuning**: Built-in historical backtester that automatically scans multi-day 5m ETH/USDT data to auto-tune grid spacing, volume thresholds, and stop-loss levels for maximum net profit after fees.

---

## 1. Overview & Core Concept

### What It Does
The app is a full-featured, professional trading workstation and automated grid bot engine for ETH/USDT 10x Long Futures:
1. **1-Hour Trend Filtering**: Computes 1h EMAs (e.g. 20 EMA > 50 EMA + RSI > 50) to confirm a bullish environment before placing any long orders.
2. **Consolidation & Volatility Guard**: Calculates ATR and Bollinger Band Bandwidth on 5m charts. If price is hovering inside a narrow squeeze (low ATR/consolidation), the bot pauses trading to avoid whipsaws.
3. **Volume & Volume Profile Engine**: Computes Volume Profile over 24h rolling windows to pinpoint Point of Control (POC), High Volume Nodes (HVN), and Value Area High/Low (VAH/VAL). Also enforces a 20-period Volume SMA filter to halt trading when volume drops too low.
4. **Dynamic Grid Math with Fee & 10x Leverage Aware Spacing**: Calculates minimum required grid line distance to cover Binance Futures Maker (0.02%) & Taker (0.05%) fees with positive net yield per grid hit.
5. **Strict $5 Margin Limit**: Enforces max $5 margin ($50 position) per order with real-time liquidation distance display (~10% adverse drop at 10x).
6. **Losing Trade Protection (Cut-Loss)**: Immediate stop-loss execution when price breaks below Value Area Low or critical support, closing open long positions rather than bag-holding into liquidation.
7. **Backtesting & Strategy Auto-Tuner**: Runs historical backtests over 1,000+ 5m candles, iterating across grid count, spacing, and ATR thresholds to display win rate, total yield, max drawdown, and fee costs, allowing 1-click strategy parameter application.

### Target Persona
Cryptocurrency futures traders, grid bot developers, and quantitative traders looking for an algorithmic grid system tailored specifically for ETH/USDT 10x long setups on Binance.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Live Workstation View**:
   - Header with current ETH/USDT live price, 24h change, 1h trend status badge (BULLISH / NEUTRAL / BEARISH), and Bot Power switch (ACTIVE / PAUSED).
   - Interactive Main Chart: Candle chart (5m) overlaid with 1h EMAs, Volume Profile histogram on the side, active dynamic Grid Buy/Sell levels, and trade execution markers.
   - Live Orderbook & Active Grid Positions table displaying entry price, size ($5 max margin), PnL, liquidation price, and active stop-loss levels.
2. **Backtesting & Auto-Tuning Panel**:
   - Backtest date selector (last 7 days, 14 days, 30 days of 5m klines).
   - "Auto-Tune ETH/USDT Grid" button that simulates hundreds of parameter combinations (grid lines 5-20, spacing 0.2%-1.5%, volume cutoffs) and highlights the highest Sharpe/PnL setup.
   - Comprehensive performance metrics: Total PnL ($ and %), Win Rate, Total Trades, Net Grid Profit after Binance Fees, Max Drawdown, and Liquidation Risk Score.
3. **Bot Configuration Drawer / Modal**:
   - Toggles for 1h Trend Filter, Consolidation Filter, Volume Filter, and Stop-Loss Rules.
   - Leverage multiplier locked at 10x with $5 max margin per trade override.
   - AI Assistant panel (powered by server-side Gemini API) offering real-time market rationale and strategy suggestions based on current market regime.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density dark crypto trading terminal aesthetic (slate `#0F172A` / `#020617` canvas with hairline `#1E293B` borders).
- **Color Palette**:
  - Dominant Neutral Canvas: `#090D16` (Deep Charcoal Black)
  - Structural Cards & Panels: `#111827` with 1px `#1F2937` borders
  - Bullish / Grid Buy Accents: `#10B981` (Emerald Green)
  - Bearish / Stop-Loss Accents: `#EF4444` (Crimson Red)
  - Volume Profile & HVN Highlights: `#6366F1` (Indigo / Electric Blue)
  - Text & Numbers: Crisp `#F9FAFB` with tabular monospace numerals (`font-mono tabular-nums`).
- **Typography**: `Plus Jakarta Sans` for clean, sharp headers; `JetBrains Mono` / monospace for tabular prices, PnL, volumes, and fees.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Binance Public API Proxy in Server**:
  - *Chosen Approach*: Route Binance Futures public Klines (`/fapi/v1/klines`) through lightweight Express server proxy routes (`/api/klines`, `/api/ticker`) to avoid CORS issues and rate limits.
  - *Why*: Ensures seamless real-time candlestick streaming and instant historical candle fetching for both 1h and 5m charts.
- **Decision 2: Client-side Volume Profile & Dynamic Grid Math Engine**:
  - *Chosen Approach*: Compute Volume Profile (POC, HVN, VAH/VAL), 1h EMA trend state, ATR volatility squeeze, and dynamic grid spacing directly in JavaScript/TypeScript for instant UI responsiveness.
  - *Why*: Allows instantaneous backtesting and auto-tuning in the browser without server latency.
- **Decision 3: Strict $5 Margin Cap with Hard Stop-Loss Guard**:
  - *Chosen Approach*: Set $5 USD margin limit per grid order. If ETH price dips below the dynamic Value Area Low or 10x liquidation buffer, all open positions are immediately market-closed to cut losses.
  - *Why*: Guarantees user capital protection and satisfies the rule to never hold onto losing trades in 10x leverage.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ETH/USDT 10x Grid Bot Architecture                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
  ┌────────────────────────┐                     ┌────────────────────────┐
  │ Live Trading Dashboard │                     │ Backtest & Auto-Tuner  │
  │  - 5m Candlestick Chart│                     │  - Multi-Day Backtest  │
  │  - Volume Profile Side │                     │  - Fee & Drawdown Calc │
  │  - Active Grid Lines   │                     │  - Grid Hyper-Optimizer │
  └───────────┬────────────┘                     └───────────┬────────────┘
              │                                               │
              └───────────────────────┬───────────────────────┘
                                      ▼
             ┌─────────────────────────────────────────────────┐
             │       Bot Logic & Strategy Engine (TS)          │
             │  - 1h Trend Filter (20/50 EMA, RSI)            │
             │  - 5m Consolidation Filter (ATR / Squeeze)     │
             │  - Volume Profile (POC, VAH, VAL, HVN)          │
             │  - Dynamic Grid Calculator ($5 Margin, 10x)    │
             │  - Cut-Loss / Liquidation Guard                 │
             └────────────────────────┬────────────────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
  ┌────────────────────────┐                     ┌────────────────────────┐
  │ Express Proxy API      │                     │ Gemini AI Market       │
  │  - /api/klines (5m/1h) │                     │  - Regime Rationale    │
  │  - /api/ticker (ETH)   │                     │  - Optimization Tips   │
  └───────────┬────────────┘                     └────────────────────────┘
              │
              ▼
  ┌────────────────────────┐
  │ Binance Futures API    │
  │ (fapi.binance.com)     │
  └────────────────────────┘
```

### Key Data Interfaces

```typescript
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
  isPOC: boolean;
  isHVN: boolean;
  inValueArea: boolean;
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
  pnlUsd: number;
}

export interface StrategyConfig {
  leverage: number; // 10
  maxMarginPerGrid: number; // $5 USD
  gridCount: number; // e.g. 10
  gridSpacingPercent: number; // Dynamic or fixed %
  stopLossPercent: number; // Cut-loss threshold %
  minVolumeThreshold: number; // 20-period volume SMA multiplier
  enable1hTrendFilter: boolean;
  enableConsolidationFilter: boolean;
  enableVolumeFilter: boolean;
  makerFeePercent: number; // 0.02%
  takerFeePercent: number; // 0.05%
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  grossProfitUsd: number;
  netProfitUsd: number;
  totalFeesUsd: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  tradesLog: Array<{
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    pnlUsd: number;
    reason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'GRID_REBALANCED';
  }>;
}
```

---

## Plan Verification & Execution Plan
1. **Server Setup**: Implement Express proxy for Binance Futures public API endpoints (`/api/klines` for 5m/1h and `/api/ticker`) and Gemini server route (`/api/ai-analysis`).
2. **Strategy Core**: Build technical analysis functions (EMA20/50, RSI, ATR, Volume Profile POC/HVN/VAH/VAL calculation, Dynamic Fee-aware Grid calculator).
3. **Backtesting & Auto-Tuner Engine**: Implement backtester that simulates execution on historical ETH/USDT 5m klines, enforces $5 margin limit, cuts losses on support breakdown, and auto-tunes grid params.
4. **Trading Workstation UI**: Create interactive candlestick chart using HTML5 Canvas or SVG with overlays for 1h trend, volume profile sidebar, grid lines, $5 margin order manager, live market status indicators, and Gemini AI strategy rationale drawer.
5. **Compilation & Verification**: Verify applet build using `compile_applet`.
