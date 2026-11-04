<div align="center">

# GridBot

**Bull and bear grid-strategy research dashboard for ETH/USDT**

A dark, chart-first workspace for inspecting market data, adjusting a simulated grid strategy, and reviewing historical backtest results.

<img src="https://img.shields.io/badge/APP-GridBot-0B1220?style=for-the-badge&labelColor=111827" alt="GridBot" />
<img src="https://img.shields.io/badge/STRATEGIES-LONG%20%2F%20SHORT-10B981?style=for-the-badge&labelColor=111827" alt="Long and short strategies" />
<img src="https://img.shields.io/badge/STACK-REACT%20%2F%20TYPESCRIPT-38BDF8?style=for-the-badge&labelColor=111827" alt="React and TypeScript" />
<img src="https://img.shields.io/badge/MARKET-ETH%2FUSDT-F43F5E?style=for-the-badge&labelColor=111827" alt="ETH/USDT market" />

</div>

---

## Overview

GridBot is a browser-based dashboard for exploring a configurable grid strategy in both long (bull-market) and short (bear-market) modes. It brings market charts, volume-profile levels, strategy filters, simulated positions, and historical backtesting into one interface.

**Important:** This repository currently implements a strategy simulator and market-data dashboard, not an exchange execution client. It does not place real orders or manage a live account. Backtest and simulated results are for experimentation only and are not financial advice or a guarantee of future performance.

## Dashboard

- **Market chart:** ETH/USDT candlesticks on 5-minute, 15-minute, and 1-hour intervals, with EMA overlays, volume, and grid price levels.
- **Volume profile:** Point of Control (POC), Value Area High (VAH), Value Area Low (VAL), and high-volume-node anchoring inform grid placement.
- **Long and short modes:** Explore separate simulated grid-cycle logic for rising and falling market conditions.
- **Strategy controls:** Adjust grid count and spacing, re-anchor levels, or use volatility-aware auto-tuning.
- **Market guards:** Review trend, consolidation, and volume conditions used by the strategy.
- **Positions and risk context:** Inspect simulated grid positions, estimated P&L, margin, stop-loss, and liquidation reference levels.
- **Backtesting:** Run the built-in historical simulation and review trade statistics and the equity curve.
- **Optional AI analysis:** Request a market summary and strategy rationale using a Gemini API key.

## How data works

The Express server provides local proxy endpoints for market klines, ticker data, and order-book depth. It requests public Binance market data and serves generated fallback data if the upstream request is unavailable or rate-limited. Fallback data is synthetic; it should not be mistaken for live market data.

The strategy state and simulated grid cycles are handled by the application. This project does not submit orders to Binance or another exchange.

## Run locally

### Requirements

- Node.js compatible with the dependencies in `package.json`
- npm

### Install and start

```bash
npm install
npm run dev
```

Open the local address printed by the server (the default is `http://localhost:3000`).

To create a production frontend build:

```bash
npm run build
npm start
```

The server serves the Vite development app outside production and the `dist` build when `NODE_ENV=production`.

## Optional Gemini analysis

AI analysis is optional. To enable Gemini-backed responses, provide `GEMINI_API_KEY` through your local environment or the hosting platform's secret manager. Do not commit credentials or paste them into source files. Without a configured key, the server returns a rule-based summary.

## Strategy and backtest notes

The interface and backtester use ETH/USDT market data. The strategy code includes volatility-based grid spacing, volume-profile-aware levels, trend and consolidation checks, fee estimates, and stop-loss/liquidation reference logic.

Backtest outputs depend on the implementation's assumptions and the available candle history. They do not model all exchange conditions, including every fee tier, funding payment, slippage, queue priority, partial fill, outage, or liquidation detail. Review the code and validate assumptions independently before relying on any result.

## Technology

- React and TypeScript
- Vite with an Express development/server layer
- TradingView Lightweight Charts
- Recharts and Lucide icons
- Optional Google Gemini API integration

## Responsible use

This is an experimental software project, not investment advice, a recommendation to trade, or a promise of performance. Leveraged derivatives can result in rapid losses, including loss of collateral. Use only simulated or test data unless you have independently evaluated the risks and implementation. Never expose API secrets in the repository.

---

<div align="center">

<sub>Market data, strategy assumptions, and simulation outputs should always be independently verified.</sub>

</div>
