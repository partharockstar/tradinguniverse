import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Tag,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { TradeLog } from '../types/forex';

interface JournalPreviewProps {
  initialTrades: TradeLog[];
}

export const JournalPreview: React.FC<JournalPreviewProps> = ({ initialTrades }) => {
  const [trades, setTrades] = useState<TradeLog[]>(initialTrades);
  const [filterType, setFilterType] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newPair, setNewPair] = useState('EUR/USD');
  const [newType, setNewType] = useState<'BUY' | 'SELL'>('BUY');
  const [newLots, setNewLots] = useState(1.0);
  const [newPnl, setNewPnl] = useState(250.0);
  const [newPips, setNewPips] = useState(25);
  const [newStrategy, setNewStrategy] = useState('FVG Imbalance Entry');

  const filteredTrades = trades.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const winTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? ((winTrades / trades.length) * 100).toFixed(1) : '0';
  const totalPips = trades.reduce((acc, t) => acc + t.pips, 0);

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrade: TradeLog = {
      id: `tr-${Date.now()}`,
      pair: newPair,
      type: newType,
      lots: Number(newLots),
      openPrice: 1.08500,
      closePrice: newType === 'BUY' ? 1.08750 : 1.08250,
      pips: Number(newPips),
      pnl: Number(newPnl),
      strategy: newStrategy,
      date: 'Just now',
      status: 'CLOSED',
    };
    setTrades([newTrade, ...trades]);
    setShowAddModal(false);
  };

  const handleDeleteTrade = (id: string) => {
    setTrades(trades.filter((t) => t.id !== id));
  };

  return (
    <section id="journal" className="py-14 bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1.5">
              <BookOpen className="w-4 h-4" />
              <span>FX BOOK AUTOMATED JOURNAL</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#191919] tracking-tight">
              Trade Journal & Performance Audit
            </h2>
            <p className="text-zinc-600 text-sm mt-1">
              Sync directly with MetaTrader 4 / MetaTrader 5 or cTrader to eliminate manual spreadsheets and uncover your true psychological edge.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#191919] hover:bg-zinc-800 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Log Quick Trade</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <span className="text-xs text-zinc-500 font-medium">Net Realized P&L</span>
            <div className={`text-2xl font-extrabold font-mono mt-1 ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Verified Account Balance</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <span className="text-xs text-zinc-500 font-medium">Win Rate</span>
            <div className="text-2xl font-extrabold font-mono text-zinc-900 mt-1">
              {winRate}%
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">{winTrades} Won of {trades.length} Trades</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <span className="text-xs text-zinc-500 font-medium">Net Pips Captured</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
              +{totalPips.toFixed(1)} pips
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Average +{(totalPips / (trades.length || 1)).toFixed(1)} pips / trade</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <span className="text-xs text-zinc-500 font-medium">Cloud Broker Sync</span>
            <div className="text-2xl font-extrabold font-mono text-[#191919] mt-1 flex items-center gap-1.5">
              <span>MT4 / MT5</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[11px] text-zinc-400 font-medium">Read-Only Investor Security</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Filtered View:</span>
              <div className="flex gap-1">
                {(['all', 'BUY', 'SELL'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition ${
                      filterType === t
                        ? 'bg-[#191919] text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {t === 'all' ? 'All Trades' : t}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              Showing {filteredTrades.length} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/70 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Volume</th>
                  <th className="py-3 px-4">Pips</th>
                  <th className="py-3 px-4">Net PnL ($)</th>
                  <th className="py-3 px-4">Strategy Tag</th>
                  <th className="py-3 px-4">Execution Time</th>
                  <th className="py-3 px-4 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredTrades.map((trade) => {
                  const isProfit = trade.pnl >= 0;
                  return (
                    <tr key={trade.id} className="hover:bg-zinc-50/60 transition">
                      <td className="py-3.5 px-4 font-bold text-zinc-900">
                        {trade.pair}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            trade.type === 'BUY'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-700">
                        {trade.lots} Lot{trade.lots > 1 ? 's' : ''}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-zinc-800">
                        {trade.pips > 0 ? `+${trade.pips}` : trade.pips} p
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className={isProfit ? 'text-emerald-600' : 'text-rose-600'}>
                          {isProfit ? `+$${trade.pnl.toFixed(2)}` : `-$${Math.abs(trade.pnl).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
                          <Tag className="w-3 h-3 text-zinc-400" />
                          <span>{trade.strategy}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-500 font-mono">
                        {trade.date}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteTrade(trade.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="Remove trade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-xl font-bold text-[#191919] mb-1">Log a New Trade</h3>
            <p className="text-xs text-zinc-500 mb-5">
              Add a trade manually to preview how FX Book auto-computes your statistics.
            </p>
            <form onSubmit={handleAddTrade} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Currency Pair</label>
                  <select
                    value={newPair}
                    onChange={(e) => setNewPair(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-semibold"
                  >
                    <option value="EUR/USD">EUR/USD</option>
                    <option value="GBP/USD">GBP/USD</option>
                    <option value="USD/JPY">USD/JPY</option>
                    <option value="XAU/USD">XAU/USD (Gold)</option>
                    <option value="BTC/USD">BTC/USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setNewType('BUY')}
                      className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                        newType === 'BUY' ? 'bg-emerald-600 text-white' : 'text-zinc-600'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('SELL')}
                      className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                        newType === 'SELL' ? 'bg-rose-600 text-white' : 'text-zinc-600'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newLots}
                    onChange={(e) => setNewLots(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Pips Won / Lost</label>
                  <input
                    type="number"
                    value={newPips}
                    onChange={(e) => setNewPips(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Net P&L ($)</label>
                <input
                  type="number"
                  step="1"
                  value={newPnl}
                  onChange={(e) => setNewPnl(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-sm font-mono font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Strategy / Setup Tag</label>
                <input
                  type="text"
                  value={newStrategy}
                  onChange={(e) => setNewStrategy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 text-sm"
                  placeholder="e.g. Trend Continuation, ICT Silver Bullet"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 font-bold text-xs hover:bg-zinc-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-[#191919] text-white font-bold text-xs hover:bg-zinc-800 cursor-pointer shadow-md"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
