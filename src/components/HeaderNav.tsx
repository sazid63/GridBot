import React from 'react';
import { Activity, Bot, Sliders, Sparkles, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';

interface HeaderNavProps {
  currentPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  isBotActive: boolean;
  botMode: 'LONG' | 'SHORT';
  onToggleBot: () => void;
  onToggleBotMode: (mode: 'LONG' | 'SHORT') => void;
  onOpenBacktest: () => void;
  onOpenAiAnalysis: () => void;
  onRefreshData: () => void;
  isLoading: boolean;
  trendLabel: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  isConsolidating: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentPrice,
  priceChange24h,
  high24h,
  low24h,
  volume24h,
  isBotActive,
  botMode,
  onToggleBot,
  onToggleBotMode,
  onOpenBacktest,
  onOpenAiAnalysis,
  onRefreshData,
  isLoading,
  trendLabel,
  isConsolidating,
}) => {
  const isPositive = priceChange24h >= 0;

  return (
    <header className="flex flex-col lg:flex-row items-center justify-between gap-4 px-6 py-3.5 bg-[#0D111A] border-b border-slate-800/80">
      {/* Zone 1: Brand & Wordmark with Bull / Bear Bot Switcher */}
      <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
            botMode === 'SHORT'
              ? 'bg-rose-600/20 border border-rose-500/30 text-rose-400'
              : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
          }`}>
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                ETH/USDT
              </h1>
              {/* Bot Mode Selector Pill */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  onClick={() => onToggleBotMode('LONG')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded flex items-center gap-1 transition-all ${
                    botMode === 'LONG'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Bull Market: 10x Long Futures Grid"
                >
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>BULL (Long)</span>
                </button>
                <button
                  onClick={() => onToggleBotMode('SHORT')}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded flex items-center gap-1 transition-all ${
                    botMode === 'SHORT'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Bear Market: 10x Short Futures Grid"
                >
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                  <span>BEAR (Short)</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Binance Futures</span>
              <span>·</span>
              <span className="text-emerald-400 font-mono font-semibold">Wallet: $60.00 USD</span>
            </div>
          </div>
        </div>

        {/* Mobile Bot Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={onToggleBot}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              isBotActive
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            {isBotActive ? 'BOT ACTIVE' : 'BOT PAUSED'}
          </button>
        </div>
      </div>

      {/* Zone 2: Live Market Ticker */}
      <div className="flex items-center gap-6 text-xs text-slate-300 overflow-x-auto w-full lg:w-auto py-1 border-y lg:border-none border-slate-800/60 scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-slate-400 font-medium">ETH Price</span>
          <span className="text-base font-extrabold font-mono text-white tabular-nums">
            ${currentPrice > 0 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '2,540.50'}
          </span>
          <span className={`font-mono font-semibold px-1.5 py-0.5 rounded text-[11px] ${
            isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
          }`}>
            {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 shrink-0 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-4 text-slate-400 shrink-0 font-mono text-[11px] tabular-nums">
          <div>24h High <span className="text-slate-200">${high24h.toFixed(2)}</span></div>
          <div>24h Low <span className="text-slate-200">${low24h.toFixed(2)}</span></div>
          <div>24h Vol <span className="text-slate-200">${(volume24h / 1e6).toFixed(1)}M</span></div>
        </div>

        <div className="h-4 w-[1px] bg-slate-800 shrink-0 hidden md:block" />

        {/* Trend & Guard Status Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide font-mono ${
            trendLabel === 'BULLISH'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            1H TREND: {trendLabel}
          </span>

          {isConsolidating && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              SQUEEZE RANGE
            </span>
          )}
        </div>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
        <button
          onClick={onRefreshData}
          disabled={isLoading}
          title="Refresh Binance Klines"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          onClick={onOpenBacktest}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 flex items-center gap-2 transition-all whitespace-nowrap"
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          Auto-Tune & Backtest
        </button>

        <button
          onClick={onOpenAiAnalysis}
          className="px-3.5 py-2 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          AI Rationale
        </button>

        <div className="hidden lg:block h-5 w-[1px] bg-slate-800" />

        <button
          onClick={onToggleBot}
          className={`hidden lg:flex px-4 py-2 text-xs font-bold rounded-lg items-center gap-2 transition-all shadow-sm ${
            isBotActive
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          {isBotActive ? 'BOT ACTIVE' : 'BOT PAUSED'}
        </button>
      </div>
    </header>
  );
};
