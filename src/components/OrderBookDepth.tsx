import React, { useMemo } from 'react';
import { Layers, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export interface DepthLevel {
  price: number;
  qty: number;
  total: number;
}

export interface OrderBookData {
  bids: [string, string][]; // [price, qty]
  asks: [string, string][]; // [price, qty]
  lastUpdateId?: number;
}

interface OrderBookDepthProps {
  depth: OrderBookData | null;
  currentPrice: number;
}

export const OrderBookDepth: React.FC<OrderBookDepthProps> = ({ depth, currentPrice }) => {
  const parsedDepth = useMemo(() => {
    if (!depth || !depth.bids || !depth.asks) {
      return { bids: [], asks: [], spread: 0, spreadPct: 0, maxVolume: 1, buyVolume: 0, sellVolume: 0 };
    }

    let runningBidTotal = 0;
    const bids: DepthLevel[] = depth.bids.slice(0, 10).map(([p, q]) => {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      runningBidTotal += qty;
      return { price, qty, total: runningBidTotal };
    });

    let runningAskTotal = 0;
    const asks: DepthLevel[] = depth.asks.slice(0, 10).map(([p, q]) => {
      const price = parseFloat(p);
      const qty = parseFloat(q);
      runningAskTotal += qty;
      return { price, qty, total: runningAskTotal };
    });

    const topBid = bids[0]?.price || currentPrice;
    const topAsk = asks[0]?.price || currentPrice;
    const spread = Math.max(0, topAsk - topBid);
    const spreadPct = topBid > 0 ? (spread / topBid) * 100 : 0;

    const maxBidVol = bids.length > 0 ? Math.max(...bids.map(b => b.qty)) : 1;
    const maxAskVol = asks.length > 0 ? Math.max(...asks.map(a => a.qty)) : 1;
    const maxVolume = Math.max(maxBidVol, maxAskVol, 0.1);

    const buyVolume = bids.reduce((acc, b) => acc + b.qty, 0);
    const sellVolume = asks.reduce((acc, a) => acc + a.qty, 0);

    return { bids, asks, spread, spreadPct, maxVolume, buyVolume, sellVolume };
  }, [depth, currentPrice]);

  const totalVol = parsedDepth.buyVolume + parsedDepth.sellVolume;
  const buyRatio = totalVol > 0 ? (parsedDepth.buyVolume / totalVol) * 100 : 50;
  const sellRatio = 100 - buyRatio;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Binance Order Book (Top 10)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>LIVE DEPTH</span>
        </div>
      </div>

      {/* Buy / Sell Pressure Gauge */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-emerald-400 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> BID {buyRatio.toFixed(1)}% ({parsedDepth.buyVolume.toFixed(2)} ETH)
          </span>
          <span className="text-rose-400 flex items-center gap-0.5">
            ASK {sellRatio.toFixed(1)}% ({parsedDepth.sellVolume.toFixed(2)} ETH) <ArrowDownRight className="w-3 h-3" />
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${buyRatio}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-300"
            style={{ width: `${sellRatio}%` }}
          />
        </div>
      </div>

      {/* Order Book Table Header */}
      <div className="grid grid-cols-3 text-[10px] font-semibold text-slate-400 border-b border-slate-800/80 pb-1 pt-1">
        <span>Price (USDT)</span>
        <span className="text-right">Size (ETH)</span>
        <span className="text-right">Sum (ETH)</span>
      </div>

      {/* Asks (Sells) - Sorted High to Low (Ask 10 down to Ask 1) */}
      <div className="flex flex-col gap-0.5">
        {parsedDepth.asks.slice().reverse().map((ask, idx) => {
          const depthPercent = Math.min(100, (ask.qty / parsedDepth.maxVolume) * 100);
          return (
            <div
              key={`ask-${idx}-${ask.price}`}
              className="relative grid grid-cols-3 text-xs py-0.5 px-1 rounded hover:bg-slate-800/50 transition-colors group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 transition-all pointer-events-none rounded-r"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="relative z-10 text-rose-400 font-semibold">${ask.price.toFixed(2)}</span>
              <span className="relative z-10 text-right text-slate-300">{ask.qty.toFixed(3)}</span>
              <span className="relative z-10 text-right text-slate-400 text-[11px]">{ask.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>

      {/* Mid Price & Spread Bar */}
      <div className="my-1 py-1.5 px-2 bg-slate-950/80 border border-slate-800 rounded flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-slate-400 text-[11px]">Mid Price:</span>
          <span className="font-bold text-white">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Spread: <span className="text-amber-400 font-semibold">${parsedDepth.spread.toFixed(2)} ({parsedDepth.spreadPct.toFixed(3)}%)</span>
        </div>
      </div>

      {/* Bids (Buys) - Sorted High to Low (Bid 1 down to Bid 10) */}
      <div className="flex flex-col gap-0.5">
        {parsedDepth.bids.map((bid, idx) => {
          const depthPercent = Math.min(100, (bid.qty / parsedDepth.maxVolume) * 100);
          return (
            <div
              key={`bid-${idx}-${bid.price}`}
              className="relative grid grid-cols-3 text-xs py-0.5 px-1 rounded hover:bg-slate-800/50 transition-colors group"
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 transition-all pointer-events-none rounded-r"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="relative z-10 text-emerald-400 font-semibold">${bid.price.toFixed(2)}</span>
              <span className="relative z-10 text-right text-slate-300">{bid.qty.toFixed(3)}</span>
              <span className="relative z-10 text-right text-slate-400 text-[11px]">{bid.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
