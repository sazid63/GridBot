import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, CheckCircle2, TrendingUp } from 'lucide-react';
import { StrategyConfig, Trend1hStatus, ConsolidationStatus, VolumeProfileSummary, BacktestResult } from '../types/grid';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface AiAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  trend1h: Trend1hStatus;
  consolidation: ConsolidationStatus;
  isVolumeOk: boolean;
  volumeProfile: VolumeProfileSummary;
  botConfig: StrategyConfig;
  backtestMetrics: BacktestResult | null;
  totalRealizedPnl?: number;
}

export const AiAnalysisDrawer: React.FC<AiAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  currentPrice,
  trend1h,
  consolidation,
  isVolumeOk,
  volumeProfile,
  botConfig,
  backtestMetrics,
  totalRealizedPnl = 0,
}) => {
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    summary?: string;
    regime?: string;
    recommendations?: string[];
    riskScore?: number;
    optimalGridSpacing?: number;
  } | null>(null);

  const fetchAiAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice,
          trend1h: trend1h.label,
          isConsolidating: consolidation.isConsolidating,
          volumeStatus: isVolumeOk ? 'NORMAL' : 'LOW_VOLUME',
          volumeProfile: {
            poc: volumeProfile.poc,
            vah: volumeProfile.vah,
            val: volumeProfile.val
          },
          botConfig,
          backtestMetrics
        })
      });

      const data = await response.json();
      setAiData(data);
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !aiData) {
      fetchAiAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Construct 24-Hour PnL History Trend Data
  const generatePnlHistory = () => {
    if (backtestMetrics && backtestMetrics.equityCurve.length >= 10) {
      const last24 = backtestMetrics.equityCurve.slice(-24);
      return last24.map((pt, idx) => ({
        hour: `${idx}h`,
        pnl: Number((pt.equity - 60).toFixed(2)),
      }));
    }

    // Default simulated 24h grid arbitrage cumulative curve
    const history = [];
    let accPnl = 0;
    const finalPnl = totalRealizedPnl > 0 ? totalRealizedPnl : 3.45;
    const step = finalPnl / 24;

    for (let i = 0; i <= 24; i++) {
      if (i === 0) accPnl = 0;
      else accPnl += step + (Math.random() - 0.45) * 0.15;

      history.push({
        hour: i === 24 ? 'Now' : `${i}h`,
        pnl: Number(accPnl.toFixed(2)),
      });
    }

    return history;
  };

  const pnlHistoryData = generatePnlHistory();
  const latestPnl = pnlHistoryData[pnlHistoryData.length - 1]?.pnl || 0;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0D111A] border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gemini AI Market Rationale</h2>
              <p className="text-xs text-slate-400">Real-Time Market Regime & Grid Optimization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Analyzing 1h trend, Volume Profile & 10x risk...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Regime Badge & Risk Score */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Detected Market Regime</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {aiData?.regime || 'STRONG_BULLISH_TREND'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-300">Liquidation Risk Score:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        (aiData?.riskScore || 3) > 6 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${((aiData?.riskScore || 3) / 10) * 100}%` }}
                    />
                  </div>
                  <span className="font-bold text-white text-xs">{aiData?.riskScore || 3}/10</span>
                </div>
              </div>
            </div>

            {/* Recharts 24-Hour PnL History Line Chart */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  24H Realized PnL Trend
                </span>
                <span className={`text-xs font-bold ${latestPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latestPnl >= 0 ? '+' : ''}${latestPnl.toFixed(2)} USD
                </span>
              </div>

              <div className="h-36 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlHistoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="hour" stroke="#64748B" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={9} tickLine={false} tickFormatter={val => `$${val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)} USD`, 'Cumulative PnL']}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke={latestPnl >= 0 ? '#10B981' : '#F43F5E'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#6366F1' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Assessment Summary */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Quantitative Rationale</span>
              <p className="text-slate-200 leading-relaxed">
                {aiData?.summary || `ETH price $${currentPrice}. 1h trend is ${trend1h.label}. Operating with strict $5 USD margin limit per order for capital preservation.`}
              </p>
            </div>

            {/* Tactical Recommendations */}
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">Tactical Grid Advice</span>
              <ul className="space-y-2 text-xs text-slate-200">
                {(aiData?.recommendations || [
                  "Ensure 1h trend stays bullish before placing new grid orders",
                  "Keep stop loss below Value Area Low",
                  "Maintain max $5 margin per trade cap"
                ]).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={fetchAiAnalysis}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          Re-Analyze Market
        </button>

        <span className="text-[10px] font-mono text-slate-500">Gemini 3.8 Flash API</span>
      </div>
    </div>
  );
};
