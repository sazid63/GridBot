import React from 'react';
import { StrategyConfig, Trend1hStatus, ConsolidationStatus } from '../types/grid';
import { ShieldCheck, AlertTriangle, Activity, Sliders, Zap, CheckCircle2, Lock } from 'lucide-react';

interface BotControlsBarProps {
  config: StrategyConfig;
  trend1h: Trend1hStatus;
  consolidation: ConsolidationStatus;
  isVolumeOk: boolean;
  volumeRatio: number;
  onUpdateConfig: (newConfig: Partial<StrategyConfig>) => void;
  onRebalanceGrid: () => void;
  onAutoOptimizeGrid: () => void;
}

export const BotControlsBar: React.FC<BotControlsBarProps> = ({
  config,
  trend1h,
  consolidation,
  isVolumeOk,
  volumeRatio,
  onUpdateConfig,
  onRebalanceGrid,
  onAutoOptimizeGrid,
}) => {
  const isShort = config.botMode === 'SHORT';
  const isTrendAllowed = isShort
    ? (!trend1h.isBullish || trend1h.label === 'BEARISH')
    : trend1h.isBullish;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 w-full">
      {/* Guard Status 1: 1H Trend Filter */}
      <div className={`p-3.5 rounded-xl border transition-all ${
        isTrendAllowed
          ? 'bg-slate-900/90 border-emerald-500/30 shadow-sm'
          : 'bg-rose-950/20 border-rose-500/30'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isShort ? '1H Bearish Trend Filter' : '1H Bullish Trend Filter'}
          </span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
            isTrendAllowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {trend1h.label}
          </span>
        </div>
        <div className="text-sm font-semibold text-white flex items-center gap-1.5 font-mono truncate">
          {isTrendAllowed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="truncate">
            {isShort
              ? (isTrendAllowed ? '1H Bearish (Short Trading ON)' : '1H Bullish (Short Grid Paused)')
              : (isTrendAllowed ? '1H Bullish (Long Trading ON)' : '1H Neutral/Bear (Long Paused)')}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 font-mono">
          EMA20: ${trend1h.ema20.toFixed(1)} · RSI: {trend1h.rsi.toFixed(1)}
        </div>
      </div>

      {/* Guard Status 2: Consolidation / Squeeze Filter */}
      <div className={`p-3.5 rounded-xl border transition-all ${
        !consolidation.isConsolidating
          ? 'bg-slate-900/90 border-slate-800'
          : 'bg-amber-950/20 border-amber-500/30'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">5M Consolidation Guard</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
            !consolidation.isConsolidating ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {!consolidation.isConsolidating ? 'ACTIVE TREND' : 'HOVERING SQUEEZE'}
          </span>
        </div>
        <div className="text-sm font-semibold text-white flex items-center gap-1.5 font-mono truncate">
          {!consolidation.isConsolidating ? (
            <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="truncate">{!consolidation.isConsolidating ? 'Normal Volatility' : 'Tight Range (Grid Paused)'}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 font-mono">
          20-Candle Bandwidth: {consolidation.bandwidth.toFixed(2)}%
        </div>
      </div>

      {/* Guard Status 3: $60 Wallet Capital & $5 Margin Cap */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Wallet Capital</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
            $60.00 USD
          </span>
        </div>
        <div className="text-sm font-semibold text-white flex items-center justify-between font-mono">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>$5 Margin / Grid</span>
          </div>
          <span className={`text-xs font-bold ${isShort ? 'text-rose-400' : 'text-emerald-400'}`}>
            10x ({isShort ? 'Short' : 'Long'})
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 font-mono">
          Max 10 Grid Lines = $50 Margin + $10 Buffer
        </div>
      </div>

      {/* Quick Interactive Grid Parameters */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Dynamic Grid Tuning
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onAutoOptimizeGrid}
              className="text-[10px] font-bold font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-all"
              title="Auto-calculate optimal grid line count & spacing from ATR & Volume Profile"
            >
              <Zap className="w-3 h-3 text-emerald-400" /> Auto-Tune
            </button>
            <button
              onClick={onRebalanceGrid}
              className="text-[10px] font-bold font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-all"
            >
              Re-anchor
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
              <span>Grid Lines</span>
              <span className="text-indigo-400 font-bold">{config.gridCount} lines</span>
            </div>
            <input
              type="range"
              min="4"
              max="30"
              step="1"
              value={config.gridCount}
              onChange={e => onUpdateConfig({ gridCount: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
              <span>Grid Spacing</span>
              <span className="text-emerald-400 font-bold">{config.gridSpacingPercent.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="3.00"
              step="0.01"
              value={config.gridSpacingPercent}
              onChange={e => onUpdateConfig({ gridSpacingPercent: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
