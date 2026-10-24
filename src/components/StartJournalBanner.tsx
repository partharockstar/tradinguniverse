import React from 'react';
import {
  BookOpen,
  PlusCircle,
} from 'lucide-react';

interface StartJournalBannerProps {
  onStartJournal: () => void;
}

export const StartJournalBanner: React.FC<StartJournalBannerProps> = ({ onStartJournal }) => {
  return (
    <div className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#191919] via-zinc-900 to-slate-900 text-white shadow-lg border border-zinc-800">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                START YOUR JOURNAL
              </h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Log daily trades, track real-time P&L, analyze win rates, and view your monthly calendar.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onStartJournal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/30 hover:scale-105 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Log New Trade</span>
          </button>
        </div>
      </div>
    </div>
  );
};
