import React, { useState } from 'react';
import { Candle, StrategyConfig, BacktestResult } from '../types/grid';
import { runBacktest, autoTuneGridStrategy } from '../utils/backtester';
import { Sliders, X, Play, Zap, CheckCircle, TrendingUp, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candles5m: Candle[];
  candles1h: Candle[];
  config: StrategyConfig;
  onApplyConfig: (newConfig: StrategyConfig) => void;
}

export const BacktestModal: React.FC<BacktestModalProps> = ({
  isOpen,
  onClose,
  candles5m,
  candles1h,
  config,
  onApplyConfig,
}) => {
  const [testPeriod, setTestPeriod] = useState<number>(1500); // ~5 days of 5m klines
  const [isTuning, setIsTuning] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [tunedConfig, setTunedConfig] = useState<StrategyConfig | null>(null);
  const [filterReason, setFilterReason] = useState<'ALL' | 'TAKE_PROFIT' | 'CUT_LOSS'>('ALL');

  if (!isOpen) return null;

  const handleRunBacktest = () => {
    setIsTuning(true);
    setTimeout(() => {
      const sliced5m = candles5m.slice(-testPeriod);
      const res = runBacktest(sliced5m, candles1h, config);
      setBacktestResult(res);
      setTunedConfig(config);
      setIsTuning(false);
    }, 200);
  };

  const handleRunAutoTuner = () => {
    setIsTuning(true);
    setTimeout(() => {
      const sliced5m = candles5m.slice(-testPeriod);
      const { bestConfig, bestResult } = autoTuneGridStrategy(sliced5m, candles1h, config);
      setBacktestResult(bestResult);
      setTunedConfig(bestConfig);
      setIsTuning(false);
    }, 300);
  };

  const handleApplyTunedSettings = () => {
    if (tunedConfig) {
      onApplyConfig(tunedConfig);
      onClose();
    }
  };

  const filteredLogs = backtestResult?.tradesLog.filter(t => {
    if (filterReason === 'TAKE_PROFIT') return t.exitReason === 'TAKE_PROFIT_GRID';
    if (filterReason === 'CUT_LOSS') return t.exitReason.includes('CUT_LOSS') || t.exitReason.includes('LIQUIDATION');
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0D111A] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ETH/USDT Historical Backtest & Strategy Auto-Tuner</h2>
              <p className="text-xs text-slate-400">
                Simulates 10x {config.botMode === 'SHORT' ? 'Short (Bear)' : 'Long (Bull)'} Grid on 5m candles with fees, 1h trend & cut-loss rules
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Historical Scope:</span>
              <select
                value={testPeriod}
                onChange={e => setTestPeriod(parseInt(e.target.value))}
                className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-xs"
              >
                <option value={1000}>Last ~3.5 Days (1,000 candles)</option>
                <option value={1500}>Last ~5.0 Days (1,500 candles)</option>
                <option value={2500}>Last ~8.5 Days (2,500 candles)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunBacktest}
                disabled={isTuning}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                Run Backtest
              </button>

              <button
                onClick={handleRunAutoTuner}
                disabled={isTuning}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                Auto-Tune Parameters
              </button>
            </div>
          </div>

          {/* Results Summary Cards */}
          {backtestResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Net Grid Profit</div>
                  <div className={`text-xl font-bold ${backtestResult.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {backtestResult.netProfitUsd >= 0 ? '+' : ''}${backtestResult.netProfitUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    ROE: <span className="text-white font-semibold">+{backtestResult.returnOnEquityPercent}%</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Win Rate</div>
                  <div className="text-xl font-bold text-white">
                    {backtestResult.winRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {backtestResult.winningTrades} W / {backtestResult.losingTrades} L ({backtestResult.totalTrades} Total)
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Binance Fees Paid</div>
                  <div className="text-xl font-bold text-amber-400">
                    -${backtestResult.totalFeesUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    0.02% Maker / 0.05% Taker
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Max Drawdown</div>
                  <div className="text-xl font-bold text-rose-400">
                    -{backtestResult.maxDrawdownPercent}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Sharpe: <span className="text-white font-semibold">{backtestResult.sharpeRatio}</span>
                  </div>
                </div>
              </div>

              {/* Tuned Parameter Banner */}
              {tunedConfig && (
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-indigo-200">Optimal ETH/USDT Parameters Found:</div>
                      <div className="text-slate-300 text-[11px] mt-0.5">
                        Grid Lines: <span className="text-white font-bold">{tunedConfig.gridCount}</span> ·
                        Spacing: <span className="text-white font-bold">{tunedConfig.gridSpacingPercent}%</span> ·
                        Stop-Loss Cut: <span className="text-rose-400 font-bold">-{tunedConfig.stopLossPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyTunedSettings}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-md transition-all whitespace-nowrap"
                  >
                    Apply Strategy Settings
                  </button>
                </div>
              )}

              {/* Trades Log Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-slate-300 uppercase tracking-wider">Historical Trades Log ({filteredLogs.length})</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      onClick={() => setFilterReason('ALL')}
                      className={`px-2 py-0.5 rounded ${filterReason === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterReason('TAKE_PROFIT')}
                      className={`px-2 py-0.5 rounded ${filterReason === 'TAKE_PROFIT' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                    >
                      Take Profit
                    </button>
                    <button
                      onClick={() => setFilterReason('CUT_LOSS')}
                      className={`px-2 py-0.5 rounded ${filterReason === 'CUT_LOSS' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
                    >
                      Cut Loss
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[220px] rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Entry Price</th>
                        <th className="py-2 px-3">Exit Price</th>
                        <th className="py-2 px-3">Margin</th>
                        <th className="py-2 px-3">Gross PnL</th>
                        <th className="py-2 px-3">Fee</th>
                        <th className="py-2 px-3">Net PnL</th>
                        <th className="py-2 px-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 bg-[#080B11]">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-semibold text-white">${log.entryPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-200">${log.exitPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-400">${log.marginUsd.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-300">${log.grossPnlUsd.toFixed(2)}</td>
                          <td className="py-2 px-3 text-amber-400">-${log.feeUsd.toFixed(3)}</td>
                          <td className={`py-2 px-3 font-bold ${log.netPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {log.netPnlUsd >= 0 ? '+' : ''}${log.netPnlUsd.toFixed(2)}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.exitReason === 'TAKE_PROFIT_GRID'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {log.exitReason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
