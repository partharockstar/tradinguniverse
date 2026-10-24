import React, { useState } from 'react';
import {
  Calculator,
  RotateCcw,
  Check,
  Target,
  Sparkles,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';

interface PositionCalculatorProps {
  pairs: CurrencyPair[];
  selectedPairSymbol?: string;
  onOpenJournalWithTrade?: (tradeInfo: { pair: string; lots: number; risk: number }) => void;
}

export const PositionCalculator: React.FC<PositionCalculatorProps> = ({
  pairs,
  selectedPairSymbol = 'EUR/USD',
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [stopLossPips, setStopLossPips] = useState<number>(25);
  const [currentPairSymbol, setCurrentPairSymbol] = useState<string>(selectedPairSymbol);
  const [accountCurrency, setAccountCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (selectedPairSymbol) {
      setCurrentPairSymbol(selectedPairSymbol);
    }
  }, [selectedPairSymbol]);

  const currentPair = pairs.find((p) => p.symbol === currentPairSymbol) || pairs[0];
  const riskAmount = (accountBalance * riskPercent) / 100;

  let pipValuePerStandardLot = 10;
  if (currentPair.quote === 'JPY') {
    pipValuePerStandardLot = 6.48;
  } else if (currentPair.symbol === 'XAU/USD') {
    pipValuePerStandardLot = 10.0;
  } else if (currentPair.quote === 'CAD') {
    pipValuePerStandardLot = 7.25;
  } else if (currentPair.quote === 'CHF') {
    pipValuePerStandardLot = 11.55;
  }

  const calculatedLots = stopLossPips > 0 && pipValuePerStandardLot > 0
    ? riskAmount / (stopLossPips * pipValuePerStandardLot)
    : 0;
  const standardLots = Math.max(0.01, Number(calculatedLots.toFixed(2)));
  const miniLots = Number((standardLots * 10).toFixed(1));
  const microLots = Number((standardLots * 100).toFixed(0));
  const units = Math.round(standardLots * 100000);

  const r1Pips = stopLossPips;
  const r2Pips = stopLossPips * 2;
  const r3Pips = stopLossPips * 3;

  const handleCopyParams = () => {
    const text = `FX Book Position Size: Pair: ${currentPair.symbol} Lot Size: ${standardLots} Lots Risk: $${riskAmount.toFixed(2)} (${riskPercent}%) Stop Loss: ${stopLossPips} pips Target 1:2: +${r2Pips} pips (+$${(riskAmount * 2).toFixed(2)})`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="calculator" className="py-14 bg-zinc-50 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>INSTITUTIONAL RISK MANAGEMENT TOOL</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191919] tracking-tight">
            Forex Position Size & Pip Calculator
          </h2>
          <p className="text-zinc-600 text-sm mt-2">
            Never risk more than planned. Calculate the exact lot size required for your account balance, 
            desired risk percentage, and stop loss distance.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="font-bold text-lg text-[#191919] flex items-center gap-2">
                <span>Account & Trade Parameters</span>
              </h3>
              <button
                onClick={() => {
                  setAccountBalance(10000);
                  setRiskPercent(1.5);
                  setStopLossPips(25);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Currency Pair
                </label>
                <select
                  value={currentPairSymbol}
                  onChange={(e) => setCurrentPairSymbol(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#191919]"
                >
                  {pairs.map((p) => (
                    <option key={p.id} value={p.symbol}>
                      {p.symbol} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wide mb-1.5">
                  Account Currency
                </label>
                <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-xl">
                  {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setAccountCurrency(curr)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        accountCurrency === curr
                          ? 'bg-[#191919] text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                  Account Balance
                </label>
                <span className="text-xs font-mono font-bold text-zinc-900">
                  ${accountBalance.toLocaleString()} {accountCurrency}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                <input
                  type="number"
                  min="100"
                  max="10000000"
                  step="500"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(10, Number(e.target.value)))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#191919]"
                />
              </div>

              <div className="flex gap-1.5 mt-2">
                {[1000, 5000, 10000, 25000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAccountBalance(preset)}
                    className={`px-2 py-0.5 text-[11px] rounded font-mono font-medium transition cursor-pointer ${
                      accountBalance === preset
                        ? 'bg-zinc-800 text-white'
                        : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
                    }`}
                  >
                    ${preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                    Risk Percentage (%)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {riskPercent}% = ${riskAmount.toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(Math.max(0.1, Number(e.target.value)))}
                    className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#191919]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">%</span>
                </div>

                <div className="flex gap-1.5 mt-2">
                  {[0.5, 1.0, 1.5, 2.0, 3.0].map((rp) => (
                    <button
                      key={rp}
                      onClick={() => setRiskPercent(rp)}
                      className={`px-2 py-0.5 text-[11px] rounded font-mono font-medium transition cursor-pointer ${
                        riskPercent === rp
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
                      }`}
                    >
                      {rp}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                    Stop Loss (Pips)
                  </label>
                  <span className="text-xs text-zinc-500">Distance</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    value={stopLossPips}
                    onChange={(e) => setStopLossPips(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#191919]"
                  />
                </div>

                <div className="flex gap-1.5 mt-2">
                  {[10, 15, 20, 25, 30, 50].map((pips) => (
                    <button
                      key={pips}
                      onClick={() => setStopLossPips(pips)}
                      className={`px-2 py-0.5 text-[11px] rounded font-mono font-medium transition cursor-pointer ${
                        stopLossPips === pips
                          ? 'bg-zinc-800 text-white'
                          : 'bg-zinc-200/70 text-zinc-700 hover:bg-zinc-300'
                      }`}
                    >
                      {pips}p
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gradient-to-br from-[#191919] to-zinc-900 text-white p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  CALCULATED POSITION
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  {currentPair.symbol}
                </span>
              </div>

              <div className="py-6 text-center border-b border-zinc-800/80">
                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1 font-medium">
                  Recommended Lot Size
                </div>
                <div className="text-5xl font-mono font-extrabold text-white tracking-tight">
                  {standardLots} <span className="text-2xl font-sans text-emerald-400 font-semibold">Lots</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono mt-1">
                  {units.toLocaleString()} Units of {currentPair.base}
                </div>
              </div>

              <div className="py-4 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs">Total Capital at Risk:</span>
                  <span className="font-mono font-bold text-rose-400 text-base">
                    ${riskAmount.toFixed(2)} ({riskPercent}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs">Pip Value (at {standardLots} lots):</span>
                  <span className="font-mono font-bold text-zinc-200 text-xs">
                    ${(pipValuePerStandardLot * standardLots).toFixed(2)} per pip
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-xs">Mini / Micro Equivalent:</span>
                  <span className="font-mono text-zinc-300 text-xs">
                    {miniLots} Mini / {microLots} Micro
                  </span>
                </div>
              </div>

              <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/60 space-y-2 mt-2">
                <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Take-Profit Projections</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-zinc-900/60 p-1.5 rounded">
                    <div className="text-[10px] text-zinc-400">1:1 Target</div>
                    <div className="font-bold text-zinc-200">+{r1Pips}p</div>
                    <div className="text-emerald-400 text-[11px]">+${riskAmount.toFixed(0)}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-300 font-bold">1:2 Target</div>
                    <div className="font-bold text-emerald-400">+{r2Pips}p</div>
                    <div className="text-emerald-400 text-[11px]">+${(riskAmount * 2).toFixed(0)}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-1.5 rounded">
                    <div className="text-[10px] text-zinc-400">1:3 Target</div>
                    <div className="font-bold text-zinc-200">+{r3Pips}p</div>
                    <div className="text-emerald-400 text-[11px]">+${(riskAmount * 3).toFixed(0)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <button
                onClick={handleCopyParams}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Parameters Copied!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Copy Trade Parameters</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center text-zinc-400">
                Formula complies with MT4/MT5 contract specification standards.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
