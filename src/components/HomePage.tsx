import React from 'react';
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Moon,
  Sun,
  DollarSign,
  Coins,
} from 'lucide-react';
import { GoogleAccount } from '../App';
import { ShootingStars } from './ShootingStars';
import { TradingUniverseLogo } from './TradingUniverseLogo';

interface HomePageProps {
  onStartJournal: (currency?: 'USD' | 'USC') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onGoogleLogin?: (account: GoogleAccount) => void;
  googleUser?: GoogleAccount | null;
}

export const HomePage: React.FC<HomePageProps> = ({
  onStartJournal,
  isDarkMode = true,
  onToggleDarkMode,
}) => {
  const bgContainer = 'bg-black text-zinc-100';
  const textSubtle = 'text-zinc-400';

  return (
    <div className={`min-h-screen w-full flex-1 flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden theme-transition ${bgContainer}`}>
      {/* Background Shooting Star Animation */}
      <ShootingStars isDarkMode={isDarkMode} />

      {/* Top Header Controls */}
      <div className="w-full max-w-6xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <TradingUniverseLogo size="md" />
          <span className="font-extrabold text-base tracking-tight text-white">
            Trading<span className="text-zinc-300">Universe</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Permanent aesthetic dark theme */}
        </div>
      </div>

      {/* Main Hero Center Content */}
      <div className="max-w-3xl w-full mx-auto text-center space-y-6 my-auto z-10 py-6 relative">
        <div className="apple-liquid-glass inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-wide uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>TRADING UNIVERSE • VERIFIED JOURNAL PLATFORM</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none drop-shadow-2xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              Trading Universe
            </span>
          </h1>
          <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${textSubtle}`}>
            Drop your Exness or MT4/MT5 trade statements to instantly extract all trade rows, audit real P&L calendars, and sync your data safely across any PC.
          </p>
        </div>

        {/* Dual Account Launchers: USD & USC */}
        <div className="pt-2 max-w-2xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* 1. USD Account Card */}
          <div
            onClick={() => onStartJournal('USD')}
            className="apple-liquid-card group p-5 sm:p-6 border-white/10 hover:border-white/25 cursor-pointer flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-2xl relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md bg-zinc-900 border border-zinc-700/60 text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  STANDARD USD ($)
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  USD Account
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${textSubtle}`}>
                  Standard / ECN Dollar Journal with separated USD balance, trades, and real-dollar P&L.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-4">
              <span className="text-[11px] font-bold text-zinc-300">Launch USD Dashboard</span>
              <div className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Enter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* 2. USC Account Card */}
          <div
            onClick={() => onStartJournal('USC')}
            className="apple-liquid-card group p-5 sm:p-6 border-amber-500/30 hover:border-amber-400/60 cursor-pointer flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-2xl relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-[#ffdf00] text-black flex items-center justify-center font-black text-xl shadow-md border border-amber-300">
                  <Coins className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  CENT ¢ EXNESS
                </span>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  USC Account
                </h3>
                <p className={`text-xs mt-1 leading-relaxed ${textSubtle}`}>
                  Cent Platform Journal with dedicated USC balance, trades, and micro cent P&L.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/10 mt-4">
              <span className="text-[11px] font-bold text-amber-400">Launch USC Dashboard</span>
              <div className="px-3 py-1.5 rounded-xl bg-[#ffdf00] text-black font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Enter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-xs font-semibold">
          {[
            '1-Screen Layout',
            'Statement OCR Auto-Scan',
            'Google Cloud Sync',
            'Persistent Memory',
          ].map((text, idx) => (
            <div
              key={idx}
              className="apple-liquid-glass flex items-center gap-1.5 px-3.5 py-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className={`text-xs text-center pb-2 ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
        Trading Universe © 2026 • Persistent Cloud Memory Enabled
      </div>
    </div>
  );
};

