import React from 'react';
import {
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#191919] text-white pt-16 pb-12 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-zinc-800">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center border border-blue-400/30">
                <span className="font-black text-white text-sm">TU</span>
              </div>
              <div className="font-extrabold text-xl tracking-tight text-white">
                TRADING <span className="text-blue-400">UNIVERSE</span>
              </div>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              Trading Universe is the premier global trading analytics and journal platform. 
              Connecting retail and prop firm traders with verified performance calendars, 
              live interbank quotes, institutional sentiment, and precision risk management.
            </p>
            <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit SSL Encryption</span>
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Read-Only Investor Sync</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Trading Tools
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a href="#calculator" className="hover:text-emerald-400 transition">
                  Position Size Calculator
                </a>
              </li>
              <li>
                <a href="#calculator" className="hover:text-emerald-400 transition">
                  Pip Value & Risk Matrix
                </a>
              </li>
              <li>
                <a href="#sentiment" className="hover:text-emerald-400 transition">
                  Community Sentiment
                </a>
              </li>
              <li>
                <a href="#calendar" className="hover:text-emerald-400 transition">
                  Economic Calendar
                </a>
              </li>
              <li>
                <a href="#markets" className="hover:text-emerald-400 transition">
                  Interbank Spread Monitor
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Platform
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li>
                <a href="#journal" className="hover:text-emerald-400 transition">
                  Automated Trading Journal
                </a>
              </li>
              <li>
                <a href="#systems" className="hover:text-emerald-400 transition">
                  Verified Trader Systems
                </a>
              </li>
              <li>
                <a href="#systems" className="hover:text-emerald-400 transition">
                  MT4 / MT5 Cloud Bridge
                </a>
              </li>
              <li>
                <a href="#journal" className="hover:text-emerald-400 transition">
                  Drawdown & Sharpe Audit
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Compatibility
            </div>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>MetaTrader 4 (MT4)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>MetaTrader 5 (MT5)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Exness Terminal</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>TradingView Webhooks</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 text-[11px] text-zinc-400 space-y-3 leading-relaxed">
          <p>
            <strong>High Risk Investment Warning:</strong> Trading foreign exchange (Forex), contracts for differences (CFDs), 
            precious metals, and commodities on margin carries a high level of risk and may not be suitable for all investors. 
            The high degree of leverage can work against you as well as for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between text-zinc-400 text-xs pt-4 border-t border-zinc-800/80 gap-3">
            <div>
              © 2026 Trading Universe Inc. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-zinc-400">
              <a href="#" className="hover:text-zinc-300">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-zinc-300">Terms of Service</a>
              <span>•</span>
              <a href="#" className="hover:text-zinc-300">Security Disclosure</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
