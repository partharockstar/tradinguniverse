import React from 'react';
import {
  X,
  Calculator,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';

interface PairDetailModalProps {
  pair: CurrencyPair | null;
  onClose: () => void;
  onOpenCalcWithPair: (pair: CurrencyPair) => void;
}

export const PairDetailModal: React.FC<PairDetailModalProps> = ({
  pair,
  onClose,
  onOpenCalcWithPair,
}) => {
  if (!pair) return null;
  const isPositive = pair.change24h >= 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#191919] text-white flex items-center justify-center font-bold text-sm">
            {pair.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-[#191919]">{pair.symbol}</h3>
              <span className="text-xs uppercase px-2 py-0.5 rounded font-bold bg-zinc-100 text-zinc-700">
                {pair.category}
              </span>
            </div>
            <div className="text-xs text-zinc-500 font-medium">{pair.name}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Bid Price</div>
            <div className="text-2xl font-mono font-bold text-zinc-900 mt-1">
              {pair.bid.toFixed(pair.digits)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Sell execution rate</div>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ask Price</div>
            <div className="text-2xl font-mono font-bold text-zinc-900 mt-1">
              {pair.ask.toFixed(pair.digits)}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Buy execution rate</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 mb-6 text-center text-xs">
          <div>
            <div className="text-zinc-500 font-medium">Spread</div>
            <div className="font-mono font-bold text-zinc-900 mt-0.5">{pair.spread} pips</div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium">24h Change</div>
            <div className={`font-mono font-bold mt-0.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? `+${pair.change24h}%` : `${pair.change24h}%`}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 font-medium">Community</div>
            <div className="font-mono font-bold text-emerald-600 mt-0.5">
              {pair.sentimentLong}% Long
            </div>
          </div>
        </div>

        <div className="space-y-1.5 mb-6">
          <div className="flex justify-between text-xs font-mono text-zinc-600">
            <span>24h Low: <strong>{pair.low24h.toFixed(pair.digits)}</strong></span>
            <span>24h High: <strong>{pair.high24h.toFixed(pair.digits)}</strong></span>
          </div>
          <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    ((pair.bid - pair.low24h) / ((pair.high24h - pair.low24h) || 1)) * 100
                  )
                )}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              onOpenCalcWithPair(pair);
              onClose();
            }}
            className="py-3 rounded-xl bg-[#191919] hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Calculate Lot Size</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold text-xs transition cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
