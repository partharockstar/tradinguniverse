import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface HeroProps {
  onOpenJournal: () => void;
  onOpenCalc: () => void;
  onOpenDashboard?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenJournal, onOpenCalc, onOpenDashboard }) => {
  const [activeTab, setActiveTab] = useState<'return' | 'monthly' | 'drawdown' | 'risk'>('return');
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');

  const handleStartJournal = () => {
    if (onOpenDashboard) onOpenDashboard();
    else onOpenJournal();
  };

  const curveData = {
    '1M': [120, 125, 122, 131, 138, 142, 145],
    '3M': [100, 112, 118, 125, 134, 140, 158],
    '6M': [95, 108, 122, 119, 138, 155, 178],
    '1Y': [80, 95, 110, 128, 145, 170, 212, 284.6],
    'ALL': [50, 75, 95, 120, 160, 210, 260, 342.0],
  };

  const currentPoints = curveData[timeframe];
  const minVal = Math.min(...currentPoints);
  const maxVal = Math.max(...currentPoints);

  const width = 480;
  const height = 150;
  const padding = 20;
  const pointsSvg = currentPoints.map((val, idx) => {
    const x = padding + (idx / (currentPoints.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${pointsSvg.join(' L ')}`;
  const areaD = `M ${padding},${height} L ${pointsSvg.join(' L ')} L ${width - padding},${height} Z`;

  return (
    <section className="relative bg-white pt-12 pb-20 border-b border-zinc-100 overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#191919 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-800 text-xs font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-blue-500 -ml-4"></span>
              <span>TRADING UNIVERSE • GLOBAL ANALYTICS & JOURNAL</span>
              <span className="bg-[#191919] text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                BETA v4.8
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#191919] tracking-tight leading-[1.12]">
              Track, Audit & Master <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900">
                Your Trading Edge
              </span>
            </h1>

            <p className="text-lg text-zinc-600 max-w-2xl leading-relaxed">
              <strong>Trading Universe</strong> empowers retail and prop firm traders with <strong>verified track records</strong>, 
              automated MT4/MT5 trade analytics, clean interactive calendar matrices, and institutional risk calculators.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>100% Verified Statements</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Sub-millisecond Ticker</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Live Retail Sentiment</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                onClick={handleStartJournal}
                className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 group cursor-pointer"
              >
                <span>Start Your Journal</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-200" />
              </button>
              <button
                onClick={onOpenCalc}
                className="px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-sm transition-all border border-zinc-200 shadow-sm hover:border-zinc-300 flex items-center gap-2 cursor-pointer"
              >
                <span>Calculate Lot Size</span>
                <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                  Free Tool
                </span>
              </button>
              <a
                href="#markets"
                className="px-4 py-3.5 text-zinc-600 hover:text-zinc-950 font-semibold text-sm transition flex items-center gap-1.5"
              >
                <span>Explore Live Pairs</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-400" />
              </a>
            </div>

            <div className="pt-6 border-t border-zinc-100 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-extrabold text-[#191919] font-mono">$4.8 Billion+</div>
                <div className="text-xs text-zinc-500 font-medium">Monthly Tracked Volume</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono">148,000+</div>
                <div className="text-xs text-zinc-500 font-medium">Verified Accounts</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#191919] font-mono">0.0 Pips</div>
                <div className="text-xs text-zinc-500 font-medium">True Raw Spreads</div>
              </div>
            </div>
          </div>

          {/* Right Hero Column */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-200/60 overflow-hidden">
              <div className="bg-[#191919] text-white p-4 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Titanium Trend EA #1</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        AUDITED
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">Tickmill Prime ECN • Real (USD)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Verified Gain</div>
                  <div className="text-lg font-mono font-bold text-emerald-400">+284.6%</div>
                </div>
              </div>

              <div className="flex items-center justify-between px-4 pt-3 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('return')}
                    className={`pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                      activeTab === 'return'
                        ? 'border-[#191919] text-[#191919]'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Equity Curve
                  </button>
                  <button
                    onClick={() => setActiveTab('monthly')}
                    className={`pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                      activeTab === 'monthly'
                        ? 'border-[#191919] text-[#191919]'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Monthly Matrix
                  </button>
                  <button
                    onClick={() => setActiveTab('drawdown')}
                    className={`pb-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                      activeTab === 'drawdown'
                        ? 'border-[#191919] text-[#191919]'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    Risk & Drawdown
                  </button>
                </div>

                <div className="flex items-center gap-1 pb-2">
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded cursor-pointer transition ${
                        timeframe === tf
                          ? 'bg-[#191919] text-white'
                          : 'bg-zinc-200/70 text-zinc-600 hover:bg-zinc-300'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {activeTab === 'return' && (
                  <div>
                    <div className="relative h-40 w-full mb-3 bg-gradient-to-b from-emerald-50/40 to-transparent rounded-lg p-2">
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={areaD} fill="url(#curveGradient)" />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {currentPoints.map((val, idx) => {
                          const x = padding + (idx / (currentPoints.length - 1)) * (width - 2 * padding);
                          const y = height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding);
                          return (
                            <circle
                              key={idx}
                              cx={x}
                              cy={y}
                              r={idx === currentPoints.length - 1 ? 5 : 3}
                              className={idx === currentPoints.length - 1 ? 'fill-emerald-600 stroke-white stroke-2 animate-pulse' : 'fill-emerald-500'}
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute top-2 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded shadow-xs border border-zinc-200 text-right">
                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">Latest ROI</div>
                        <div className="text-xs font-mono font-bold text-emerald-600">
                          +{currentPoints[currentPoints.length - 1]}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-medium">Profit Factor</div>
                        <div className="font-mono font-bold text-zinc-900 text-sm">2.68</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-medium">Win Rate</div>
                        <div className="font-mono font-bold text-emerald-600 text-sm">71.4%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-medium">Max DD</div>
                        <div className="font-mono font-bold text-rose-600 text-sm">4.2%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-medium">Total Trades</div>
                        <div className="font-mono font-bold text-zinc-900 text-sm">1,420</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'monthly' && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-zinc-700 flex items-center justify-between mb-2">
                      <span>2026 Monthly Breakdown</span>
                      <span className="text-emerald-600 font-mono">+68.4% YTD</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Jan</div>
                        <div className="font-bold text-emerald-700">+8.4%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Feb</div>
                        <div className="font-bold text-emerald-700">+6.1%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Mar</div>
                        <div className="font-bold text-emerald-700">+11.2%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Apr</div>
                        <div className="font-bold text-emerald-700">+7.5%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">May</div>
                        <div className="font-bold text-emerald-700">+9.8%</div>
                      </div>
                      <div className="p-2 rounded bg-rose-50 border border-rose-100 text-center">
                        <div className="text-[10px] text-zinc-500">Jun</div>
                        <div className="font-bold text-rose-600">-1.4%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Jul</div>
                        <div className="font-bold text-emerald-700">+12.6%</div>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 text-center">
                        <div className="text-[10px] text-zinc-500">Aug</div>
                        <div className="font-bold text-emerald-700">+8.9%</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'drawdown' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600 font-medium">Maximum Equity Drawdown</span>
                      <span className="font-mono font-bold text-rose-600">4.20% (Low Risk)</span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-rose-500 h-3 rounded-full" style={{ width: '18%' }}></div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-600 font-medium">Sharpe Ratio</span>
                      <span className="font-mono font-bold text-emerald-600">2.45 (Institutional Tier)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-600 font-medium">Average Trade Duration</span>
                      <span className="font-mono font-bold text-zinc-800">4h 18m</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real Investor Password Verified</span>
                  </span>
                  <button
                    onClick={onOpenJournal}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Statement</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
