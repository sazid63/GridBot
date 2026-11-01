import React, { useState } from 'react';
import { GridLine, StrategyConfig } from '../types/grid';
import { ShieldAlert, ShieldCheck, DollarSign, XCircle, Clock, Zap, Percent, Shield } from 'lucide-react';

interface ActivePositionsTableProps {
  gridLines: GridLine[];
  config: StrategyConfig;
  currentPrice: number;
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  activeMarginTotal: number;
  onEmergencyCloseAll: () => void;
  onCloseSingleLine: (id: string) => void;
}

export const ActivePositionsTable: React.FC<ActivePositionsTableProps> = ({
  gridLines,
  config,
  currentPrice,
  totalUnrealizedPnl,
  totalRealizedPnl,
  activeMarginTotal,
  onEmergencyCloseAll,
  onCloseSingleLine,
}) => {
  const [activeTab, setActiveTab] = useState<'GRID_LINES' | 'FILLED_POSITIONS' | 'FEE_AUDIT'>('GRID_LINES');

  const filledLines = gridLines.filter(g => g.status === 'FILLED');
  const pendingLines = gridLines.filter(g => g.status === 'PENDING');

  return (
    <div className="w-full bg-[#0D111A] rounded-xl border border-slate-800/80 p-4 flex flex-col gap-4">
      {/* Header & Metrics Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('GRID_LINES')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'GRID_LINES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Grid Levels ({gridLines.length})
          </button>
          <button
            onClick={() => setActiveTab('FILLED_POSITIONS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'FILLED_POSITIONS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {config.botMode === 'SHORT' ? 'Open Shorts' : 'Open Longs'} ({filledLines.length})
          </button>
          <button
            onClick={() => setActiveTab('FEE_AUDIT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'FEE_AUDIT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fees & 10x Risk Audit
          </button>
        </div>

        {/* Live Metrics & Cut-Loss Action */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 mr-1.5">Active Collateral:</span>
            <span className="text-white font-bold">${activeMarginTotal.toFixed(2)} / $60.00</span>
            <span className="text-emerald-400 text-[10px] ml-1">(Free: ${(60 - activeMarginTotal).toFixed(2)})</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div>
            <span className="text-slate-400 mr-1.5">Unrealized PnL:</span>
            <span className={`font-bold ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
            </span>
          </div>

          <button
            onClick={onEmergencyCloseAll}
            disabled={filledLines.length === 0}
            className="px-3 py-1.5 text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-2"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cut-Loss / Close All
          </button>
        </div>
      </div>

      {/* Tab 1: Grid Lines Table */}
      {activeTab === 'GRID_LINES' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Level Price</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Order Margin</th>
                <th className="py-2.5 px-3">Position (10x)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Liquidation Price</th>
                <th className="py-2.5 px-3">Stop-Loss Cut</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {gridLines.map((line) => {
                const isShortLine = line.botMode === 'SHORT';
                return (
                  <tr key={line.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      ${line.price.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        line.type === 'SELL'
                          ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                          : isShortLine
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                      }`}>
                        {line.type === 'SELL'
                          ? 'TAKE-PROFIT SELL'
                          : isShortLine
                            ? 'TAKE-PROFIT BUY (CLOSE SHORT)'
                            : 'LIMIT BUY'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      ${line.marginUsd.toFixed(2)} <span className="text-[10px] text-slate-500">(Max $5)</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {line.positionSizeEth} ETH <span className="text-[10px] text-slate-500">(${(line.positionSizeEth * line.price).toFixed(1)})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        line.status === 'FILLED'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {line.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      ${line.liquidationPrice.toFixed(2)} <span className="text-[10px] text-slate-500">({isShortLine ? '+9.2%' : '-9.2%'})</span>
                    </td>
                    <td className="py-2.5 px-3 text-rose-400 font-semibold">
                      ${line.stopLossPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onCloseSingleLine(line.id)}
                        className="text-slate-400 hover:text-rose-400 text-[11px] underline transition-colors"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Filled Positions Table */}
      {activeTab === 'FILLED_POSITIONS' && (
        <div className="overflow-x-auto">
          {filledLines.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-mono">
              No active filled {config.botMode.toLowerCase()} grid orders. Waiting for entry condition.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Fill Price</th>
                  <th className="py-2.5 px-3">Current Price</th>
                  <th className="py-2.5 px-3">Margin Used</th>
                  <th className="py-2.5 px-3">ETH Size</th>
                  <th className="py-2.5 px-3">Unrealized PnL</th>
                  <th className="py-2.5 px-3">Liquidation Buffer</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filledLines.map(line => {
                  const isShortLine = line.botMode === 'SHORT';
                  const liqDistance = currentPrice > 0
                    ? isShortLine
                      ? ((line.liquidationPrice - currentPrice) / currentPrice) * 100
                      : ((currentPrice - line.liquidationPrice) / currentPrice) * 100
                    : 0;

                  return (
                    <tr key={line.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        ${line.filledAtPrice?.toFixed(2) || line.price.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">
                        ${currentPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">
                        ${line.marginUsd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">
                        {line.positionSizeEth} ETH
                      </td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={line.unrealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {line.unrealizedPnlUsd >= 0 ? '+' : ''}${line.unrealizedPnlUsd.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          liqDistance > 5 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {liqDistance.toFixed(1)}% Distance
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onCloseSingleLine(line.id)}
                          className="px-2 py-1 text-[11px] font-bold bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 transition-colors"
                        >
                          Close Position
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Binance Fees & 10x Risk Audit */}
      {activeTab === 'FEE_AUDIT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono pt-1">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
              <Percent className="w-4 h-4" />
              Binance Futures Fees
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Maker Fee (Limit Order):</span>
                <span className="text-white font-bold">{config.makerFeePercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Taker Fee (Stop Loss):</span>
                <span className="text-white font-bold">{config.takerFeePercent}%</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">Min Viable Spacing:</span>
                <span className="text-emerald-400 font-bold">0.25%+</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
              <Shield className="w-4 h-4" />
              Margin Cap Discipline
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Max Margin per Trade:</span>
                <span className="text-emerald-400 font-bold">${config.maxMarginPerGrid} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Notional Size @ 10x:</span>
                <span className="text-white font-bold">${config.maxMarginPerGrid * 10} USD</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">Over-exposure Guard:</span>
                <span className="text-emerald-400 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-2">
              <ShieldAlert className="w-4 h-4" />
              10x {config.botMode === 'SHORT' ? 'Short' : 'Long'} Liquidation Safety
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {config.botMode === 'SHORT' ? 'Max Adverse Rise:' : 'Max Adverse Drop:'}
                </span>
                <span className="text-rose-400 font-bold">
                  {config.botMode === 'SHORT' ? '~+9.2%' : '~-9.2%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dynamic Stop-Loss Cut:</span>
                <span className="text-amber-400 font-bold">
                  {config.botMode === 'SHORT' ? `+${config.stopLossPercent}%` : `-${config.stopLossPercent}%`}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">Cut-Loss Priority:</span>
                <span className="text-emerald-400 font-bold">PRE-LIQUIDATION</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
