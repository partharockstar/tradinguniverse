import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Users,
  Menu,
  X,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';

interface HeaderProps {
  pairs: CurrencyPair[];
  onSelectPair?: (pair: CurrencyPair) => void;
  onOpenCalc?: () => void;
  onOpenJournal?: () => void;
  onOpenDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pairs,
  onSelectPair,
  onOpenJournal,
  onOpenDashboard,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tickerPairs = pairs.slice(0, 6);

  const handleDashboardClick = () => {
    if (onOpenDashboard) onOpenDashboard();
    else if (onOpenJournal) onOpenJournal();
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md">
      {/* Top Micro-Ticker Bar */}
      <div className="bg-[#141414] text-xs border-b border-[#2a2a2a] text-zinc-300 py-1.5 px-4 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between min-w-max gap-6">
          <div className="flex items-center gap-2 text-zinc-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[11px] font-semibold tracking-wider text-blue-400">TRADING UNIVERSE LIVE</span>
          </div>

          <div className="flex items-center gap-6">
            {tickerPairs.map((pair) => {
              const isPositive = pair.change24h >= 0;
              return (
                <button
                  key={pair.id}
                  onClick={() => onSelectPair && onSelectPair(pair)}
                  className="flex items-center gap-2 hover:bg-zinc-800/60 px-2 py-0.5 rounded transition cursor-pointer group"
                >
                  <span className="font-semibold text-white group-hover:text-blue-400 text-xs">
                    {pair.symbol}
                  </span>
                  <span className="font-mono text-zinc-200 text-xs">
                    {pair.bid.toFixed(pair.digits)}
                  </span>
                  <span
                    className={`flex items-center text-[11px] font-mono font-medium ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {pair.change24h > 0 ? `+${pair.change24h}%` : `${pair.change24h}%`}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {pair.spread}p
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-4 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-400" />
              <span>Spread: <strong className="text-zinc-200">Raw ECN 0.0+</strong></span>
            </span>
            <span className="text-zinc-600">|</span>
            <span>Server: <strong className="text-blue-400">London LD4 (0.8ms)</strong></span>
          </div>
        </div>
      </div>

      {/* Main Header Container with background #191919 */}
      <div className="bg-[#191919] text-white border-b border-[#282828]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            <div className="flex items-center gap-8">
              <a href="#" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center shadow-lg shadow-blue-950/40 border border-blue-400/30 group-hover:scale-105 transition-transform">
                  <span className="font-black text-white text-base tracking-tighter">TU</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                      TRADING <span className="text-blue-400">UNIVERSE</span>
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                      BETA
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-medium">
                    Global Trading Analytics & Journal
                  </span>
                </div>
              </a>

              <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
                <button
                  onClick={handleDashboardClick}
                  className="px-3.5 py-2 rounded-lg text-white bg-white/10 transition flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={handleDashboardClick}
                  className="px-3.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-zinc-400" />
                  <span>Performance</span>
                </button>
                <button
                  onClick={handleDashboardClick}
                  className="px-3.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <span>Monthly Calendar</span>
                </button>
                <button
                  onClick={handleDashboardClick}
                  className="px-3.5 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Community Lounge</span>
                </button>
              </nav>
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={handleDashboardClick}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Start Your Journal</span>
              </button>
            </div>

            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={handleDashboardClick}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg shadow-sm"
              >
                Journal
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#1e1e1e] border-t border-zinc-800 px-4 pt-3 pb-6 space-y-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleDashboardClick();
              }}
              className="w-full flex items-center gap-2.5 py-2 text-blue-400 font-bold"
            >
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span className="text-sm">Start Your Journal (Dashboard)</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleDashboardClick();
              }}
              className="w-full flex items-center gap-2.5 py-2 text-zinc-200 hover:text-blue-400"
            >
              <TrendingUp className="w-5 h-5 text-zinc-400" />
              <span className="font-medium text-sm">Performance Analysis</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleDashboardClick();
              }}
              className="w-full flex items-center gap-2.5 py-2 text-zinc-200 hover:text-blue-400"
            >
              <Calendar className="w-5 h-5 text-zinc-400" />
              <span className="font-medium text-sm">Monthly P&L Calendar</span>
            </button>
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDashboardClick();
                }}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm text-center cursor-pointer shadow-md"
              >
                Launch Journal Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
