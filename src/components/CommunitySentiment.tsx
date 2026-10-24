import React, { useState } from 'react';
import {
  Users,
  Compass,
  ArrowUp,
  ArrowDown,
  Info,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';

interface CommunitySentimentProps {
  pairs: CurrencyPair[];
  onSelectPair: (pair: CurrencyPair) => void;
}

export const CommunitySentiment: React.FC<CommunitySentimentProps> = ({
  pairs,
  onSelectPair,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EUR/USD');

  const sentimentPairs = pairs.filter((p) =>
    ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'AUD/USD', 'USD/CAD'].includes(p.symbol)
  );

  const activePair = pairs.find((p) => p.symbol === selectedSymbol) || sentimentPairs[0];
  const longPct = activePair?.sentimentLong || 60;
  const shortPct = 100 - longPct;

  const contrarianBias = longPct >= 65 ? 'BEARISH BIAS' : longPct <= 35 ? 'BULLISH BIAS' : 'NEUTRAL RANGE';
  const contrarianColor = longPct >= 65 ? 'text-rose-600 bg-rose-50 border-rose-200' : longPct <= 35 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';

  return (
    <section id="sentiment" className="py-14 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5">
              <Users className="w-4 h-4" />
              <span>FOREX BOOK CROWD SENTIMENT</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#191919] tracking-tight">
              Community Positioning & Order Flow
            </h2>
            <p className="text-zinc-600 text-sm mt-1 max-w-2xl">
              Live ratio of open Long vs Short positions from over 140,000 real verified trading accounts. 
              Use crowd extremes as contrarian liquidity indicators.
            </p>
          </div>
          <div className="text-xs bg-zinc-100 px-3 py-2 rounded-xl text-zinc-600 border border-zinc-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Updated live from connected MT4/MT5 brokers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 bg-zinc-50 rounded-2xl border border-zinc-200 p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div>
                <span className="text-xs text-zinc-500 font-semibold uppercase">Featured Pair</span>
                <div className="text-2xl font-extrabold text-[#191919]">{activePair.symbol}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500 font-semibold uppercase">Current Bid</span>
                <div className="text-lg font-mono font-bold text-zinc-900">{activePair.bid.toFixed(activePair.digits)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-emerald-700 flex items-center gap-1 font-mono">
                  <ArrowUp className="w-4 h-4" /> LONG {longPct}%
                </span>
                <span className="text-rose-700 flex items-center gap-1 font-mono">
                  SHORT {shortPct}% <ArrowDown className="w-4 h-4" />
                </span>
              </div>
              <div className="h-5 w-full bg-zinc-200 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold font-mono"
                  style={{ width: `${longPct}%` }}
                >
                  {longPct > 20 ? `${longPct}%` : ''}
                </div>
                <div
                  className="bg-rose-500 transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold font-mono"
                  style={{ width: `${shortPct}%` }}
                >
                  {shortPct > 20 ? `${shortPct}%` : ''}
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                <span>{(longPct * 142).toFixed(0)} Lots Long</span>
                <span>{(shortPct * 142).toFixed(0)} Lots Short</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${contrarianColor} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  <span>Contrarian Indicator</span>
                </span>
                <span className="text-xs font-bold font-mono uppercase px-2 py-0.5 rounded bg-white/70 shadow-xs">
                  {contrarianBias}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                {longPct >= 65
                  ? `Retail traders are heavily net-long (${longPct}%). In retail forex, extreme long positioning frequently precedes institutional sell-side sweeps.`
                  : longPct <= 35
                  ? `Retail traders are predominantly short (${shortPct}%). Institutional market makers often hunt short stop-losses above key resistance.`
                  : `Positioning is relatively balanced between bulls and bears. Trade according to technical market structure.`}
              </p>
            </div>

            <button
              onClick={() => onSelectPair(activePair)}
              className="w-full py-2.5 rounded-xl bg-[#191919] hover:bg-zinc-800 text-white font-bold text-xs transition text-center cursor-pointer"
            >
              Inspect {activePair.symbol} Order Book
            </button>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Select Pair to Analyze
            </div>
            {sentimentPairs.map((pair) => {
              const isSelected = pair.symbol === selectedSymbol;
              const pLong = pair.sentimentLong;
              const pShort = 100 - pLong;

              return (
                <div
                  key={pair.id}
                  onClick={() => setSelectedSymbol(pair.symbol)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-50 border-[#191919] shadow-sm'
                      : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-[#191919]">{pair.symbol}</span>
                      <span className="text-xs font-mono text-zinc-500">{pair.bid.toFixed(pair.digits)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                      <span className="text-emerald-600">{pLong}% Long</span>
                      <span className="text-zinc-400">vs</span>
                      <span className="text-rose-600">{pShort}% Short</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${pLong}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${pShort}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
