import React, { useState } from 'react';
import {
  ShieldCheck,
  ChevronRight,
  Eye,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import { VerifiedSystem } from '../types/forex';

interface VerifiedSystemsProps {
  systems: VerifiedSystem[];
}

export const VerifiedSystems: React.FC<VerifiedSystemsProps> = ({ systems }) => {
  const [selectedSystem, setSelectedSystem] = useState<VerifiedSystem | null>(null);

  return (
    <section id="systems" className="py-14 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>CRYPTOGRAPHICALLY AUDITED TRACK RECORDS</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#191919] tracking-tight">
              Verified Forex Systems Leaderboard
            </h2>
            <p className="text-zinc-600 text-sm mt-1">
              Browse top-performing live accounts with verified investor passwords, authentic broker execution, and zero simulated curve-fitting.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dual Verification (Trading Privileges + Broker History)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {systems.map((sys) => {
            return (
              <div
                key={sys.id}
                onClick={() => setSelectedSystem(sys)}
                className="bg-zinc-50/70 hover:bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 p-5 transition-all shadow-xs hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-700" />
                      <span>{sys.style}</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      +{sys.gain}%
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-[#191919] group-hover:text-emerald-700 transition">
                    {sys.name}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-0.5">{sys.broker}</div>

                  <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-zinc-200/60">
                    <img
                      src={sys.authorAvatar}
                      alt={sys.author}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-300"
                    />
                    <span className="text-xs font-semibold text-zinc-700">{sys.author}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center mt-4 bg-white p-2 rounded-xl border border-zinc-200/80">
                    <div>
                      <div className="text-[10px] text-zinc-400 font-medium">Monthly</div>
                      <div className="text-xs font-mono font-bold text-emerald-600">+{sys.monthlyGain}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 font-medium">Drawdown</div>
                      <div className="text-xs font-mono font-bold text-rose-600">{sys.drawdown}%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 font-medium">Win Rate</div>
                      <div className="text-xs font-mono font-bold text-zinc-800">{sys.winRate}%</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-200/60 flex items-center justify-between text-xs text-zinc-500 font-semibold group-hover:text-zinc-900">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Track Record</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedSystem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedSystem(null)}
              className="absolute top-5 right-5 p-2 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#191919]">{selectedSystem.name}</h3>
                <div className="text-xs text-zinc-500">
                  {selectedSystem.author} • {selectedSystem.broker}
                </div>
              </div>
            </div>
            <div className="my-5 p-4 rounded-xl bg-zinc-50 border border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xs text-zinc-500">Total Absolute Gain</div>
                <div className="text-xl font-mono font-bold text-emerald-600">+{selectedSystem.gain}%</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Profit Factor</div>
                <div className="text-xl font-mono font-bold text-zinc-900">{selectedSystem.profitFactor}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Max Peak Drawdown</div>
                <div className="text-xl font-mono font-bold text-rose-600">{selectedSystem.drawdown}%</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total Trades Closed</div>
                <div className="text-xl font-mono font-bold text-zinc-900">{selectedSystem.trades}</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                Verified Badges
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Trading Privileges Verified (Investor Pass)</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Broker Statement & Orders Reconciled</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Encrypted API Stream</span>
              </span>
              <button
                onClick={() => setSelectedSystem(null)}
                className="px-5 py-2.5 rounded-xl bg-[#191919] text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
