import React, { useState } from 'react';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  ChevronRight,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';

interface LiveMarketTickerProps {
  pairs: CurrencyPair[];
  onSelectPair: (pair: CurrencyPair) => void;
  onOpenCalcWithPair: (pair: CurrencyPair) => void;
}

export const LiveMarketTicker: React.FC<LiveMarketTickerProps> = ({
  pairs,
  onSelectPair,
  onOpenCalcWithPair,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'major' | 'minor' | 'commodity' | 'crypto'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPairs = pairs.filter((pair) => {
    const matchesCategory = activeCategory === 'all' || pair.category === activeCategory;
    const matchesSearch =
      pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pair.base.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="markets" className="py-14 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>LIVE INTERBANK FOREX RATES</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#191919] tracking-tight">
              Real-Time Quotes & Spreads
            </h2>
            <p className="text-zinc-600 text-sm mt-1">
              Low-latency institutional pricing from London & New York liquidity providers with transparent pip spreads.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pair (e.g. EUR, XAU, JPY)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#191919] focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Pairs', count: pairs.length },
              { id: 'major', label: 'Majors', count: pairs.filter(p => p.category === 'major').length },
              { id: 'minor', label: 'Minors & Crosses', count: pairs.filter(p => p.category === 'minor').length },
              { id: 'commodity', label: 'Gold & Metals', count: pairs.filter(p => p.category === 'commodity').length },
              { id: 'crypto', label: 'Crypto & Indices', count: pairs.filter(p => p.category === 'crypto').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-[#191919] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat.id ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Quotes update automatically every 2s</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Bid Price</th>
                  <th className="py-3 px-4">Ask Price</th>
                  <th className="py-3 px-4">Spread</th>
                  <th className="py-3 px-4">24h Change</th>
                  <th className="py-3 px-4 hidden md:table-cell">24h Range (Low - High)</th>
                  <th className="py-3 px-4 text-center">Trend (24h)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredPairs.map((pair) => {
                  const isPositive = pair.change24h >= 0;
                  const rangeSpan = pair.high24h - pair.low24h;
                  const progressPct = rangeSpan > 0 
                    ? Math.min(100, Math.max(0, ((pair.bid - pair.low24h) / rangeSpan) * 100))
                    : 50;

                  return (
                    <tr
                      key={pair.id}
                      onClick={() => onSelectPair(pair)}
                      className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-800">
                            {pair.symbol.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-[#191919] group-hover:text-emerald-700 transition">
                              {pair.symbol}
                            </div>
                            <div className="text-xs text-zinc-500 hidden sm:block">
                              {pair.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        {pair.bid.toFixed(pair.digits)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-700">
                        {pair.ask.toFixed(pair.digits)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {pair.spread} pips
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>{isPositive ? `+${pair.change24h}%` : `${pair.change24h}%`}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                            <span>{pair.low24h.toFixed(pair.digits)}</span>
                            <span>{pair.high24h.toFixed(pair.digits)}</span>
                          </div>
                          <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-block w-24 h-6">
                          <svg viewBox="0 0 100 25" className="w-full h-full overflow-visible">
                            <polyline
                              fill="none"
                              stroke={isPositive ? '#10b981' : '#f43f5e'}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={pair.sparkline
                                .map((val, idx) => {
                                  const min = Math.min(...pair.sparkline);
                                  const max = Math.max(...pair.sparkline);
                                  const x = (idx / (pair.sparkline.length - 1)) * 100;
                                  const y = 22 - ((val - min) / (max - min || 1)) * 18;
                                  return `${x},${y}`;
                                })
                                .join(' ')}
                            />
                          </svg>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCalcWithPair(pair);
                            }}
                            title="Calculate lot size for this pair"
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-[#191919] hover:text-white text-zinc-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Calc</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPair(pair);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
