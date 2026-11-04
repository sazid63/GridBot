<div align="center">

<img src="https://capsule-render.vercel.app/api?type=rect&color=0:0A0F16,30:172432,70:1D2B3D,100:0B1320&height=180&section=header&text=GRIDBOT&font=Orbitron&fontSize=32&fontColor=C7D7FF&animation=fadeIn&fontAlignY=38&desc=BULL%20%2F%20BEAR%20GRID%20STRATEGY%20SIMULATOR&descAlignY=63&descSize=12" width="100%" alt="GridBot banner" />

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ETH/USDT](https://img.shields.io/badge/Market-ETH%2FUSDT-F6495D?style=flat-square)](#)

</div>

# GridBot

**Bull and bear grid-strategy research dashboard for ETH/USDT**

A dark, chart-first workspace for inspecting market data, adjusting a simulated grid strategy, and reviewing historical backtest results.

GridBot is a browser-based dashboard for exploring a configurable grid strategy in both long (bull-market) and short (bear-market) modes. It brings market charts, volume-profile levels, strategy controls, and backtest analytics together in one focused workspace.

**Important:** This repository currently implements a strategy simulator and market-data dashboard, not an exchange execution client. It does not place real orders or manage a live account. Backtest outputs are estimates based on the current implementation and available market data.

---

## Dashboard

- **Market chart:** ETH/USDT candlesticks on 5-minute, 15-minute, and 1-hour intervals, with EMA overlays, volume, and grid price levels.
- **Volume profile:** Point of Control (POC), Value Area High (VAH), Value Area Low (VAL), and high-volume-node anchoring inform grid placement.
- **Long and short modes:** Explore separate simulated grid-cycle logic for rising and falling market conditions.
- **Strategy controls:** Adjust grid count and spacing, re-anchor levels, or use volatility-aware auto-tuning.
- **Market guards:** Review trend, consolidation, and volume conditions used by the strategy.
- **Positions and risk context:** Inspect simulated grid positions, estimated P&L, margin, stop-loss, and liquidation reference levels.
- **Backtesting:** Run the built-in historical simulation and review trade statistics and the equity curve.
- **Optional AI analysis:** Request a market summary and strategy rationale using a Gemini API key.

---

## How data works

The Express server provides local proxy endpoints for market klines, ticker data, and order-book depth. It requests public Binance market data and serves generated fallback data if the upstream source is unavailable.

The strategy state and simulated grid cycles are handled by the application. This project does not submit orders to Binance or another exchange.

---

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

---

## Optional Gemini analysis

AI analysis is optional. To enable Gemini-backed responses, provide `GEMINI_API_KEY` through your local environment or the hosting platform's secret manager. Do not commit credentials or paste them into the repository.

---

## Strategy and backtest notes

The interface and backtester use ETH/USDT market data. The strategy code includes volatility-based grid spacing, volume-profile-aware levels, trend and consolidation checks, fee estimates, and stop-loss logic.

Backtest outputs depend on the implementation's assumptions and the available candle history. They do not model all exchange conditions, including every fee tier, funding payment, slippage, queue delay, and execution edge case.

---

## Technology

- React and TypeScript
- Vite with an Express development/server layer
- TradingView Lightweight Charts
- Recharts and Lucide icons
- Optional Google Gemini API integration

---

## Responsible use

This is an experimental software project, not investment advice, a recommendation to trade, or a promise of performance. Leveraged derivatives can result in rapid losses, including loss of collateral. Market data, strategy assumptions, and simulation outputs should always be independently verified.
