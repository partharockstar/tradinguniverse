import React, { useState } from 'react';
import {
  Images,
  Camera,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Upload,
  X,
  Maximize2,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  FileImage,
  Folder,
  Trash2,
  Download,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

export interface GalleryTrade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  closePrice?: number;
  pnl: number;
  pips: number;
  status: 'OPEN' | 'CLOSED';
  time: string;
  strategy: string;
  dateDay: number;
  dateMonth?: number;
  dateYear?: number;
  result?: 'PROFIT' | 'LOSS' | 'BREAKEVEN';
  openScreenshot?: string;
  closeScreenshot?: string;
  notes?: string;
}

interface TradingScreenshotsGalleryProps {
  trades: GalleryTrade[];
  onUpdateTrade: (tradeId: string, updates: Partial<GalleryTrade>) => void;
  currencyLabel: string;
  isDarkMode?: boolean;
  onOpenNotepad: (trade: GalleryTrade) => void;
  onBackToDashboard?: () => void;
}

export const TradingScreenshotsGallery: React.FC<TradingScreenshotsGalleryProps> = ({
  trades,
  onUpdateTrade,
  currencyLabel,
  isDarkMode = true,
  onOpenNotepad,
  onBackToDashboard,
}) => {
  const [filterOutcome, setFilterOutcome] = useState<'all' | 'wins' | 'losses' | 'has_ss' | 'breakeven'>('all');
  const [filterPair, setFilterPair] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ tradeId: string; type: 'open' | 'close' } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const pairsList = Array.from(new Set(trades.map((t) => t.pair)));

  const filteredTrades = trades.filter((trade) => {
    if (filterPair !== 'all' && trade.pair !== filterPair) return false;
    if (filterOutcome === 'wins' && trade.pnl <= 0) return false;
    if (filterOutcome === 'losses' && trade.pnl >= 0) return false;
    if (filterOutcome === 'breakeven' && trade.result !== 'BREAKEVEN' && trade.pnl !== 0) return false;
    if (filterOutcome === 'has_ss' && !trade.openScreenshot && !trade.closeScreenshot) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPair = trade.pair.toLowerCase().includes(q);
      const matchReason = (trade.notes || trade.strategy || '').toLowerCase().includes(q);
      if (!matchPair && !matchReason) return false;
    }
    return true;
  });

  const totalWithScreenshots = trades.filter((t) => t.openScreenshot || t.closeScreenshot).length;
  const totalOpenScreenshots = trades.filter((t) => t.openScreenshot).length;
  const totalCloseScreenshots = trades.filter((t) => t.closeScreenshot).length;

  const handleTriggerUpload = (tradeId: string, type: 'open' | 'close') => {
    setUploadTarget({ tradeId, type });
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    try {
      const compressed = await compressImage(file);
      if (uploadTarget.type === 'open') {
        onUpdateTrade(uploadTarget.tradeId, { openScreenshot: compressed });
      } else {
        onUpdateTrade(uploadTarget.tradeId, { closeScreenshot: compressed });
      }
    } catch {
      alert('Failed to process image file');
    } finally {
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveScreenshot = (e: React.MouseEvent, tradeId: string, type: 'open' | 'close') => {
    e.stopPropagation();
    if (confirm(`Remove this ${type} chart screenshot?`)) {
      if (type === 'open') {
        onUpdateTrade(tradeId, { openScreenshot: undefined });
      } else {
        onUpdateTrade(tradeId, { closeScreenshot: undefined });
      }
    }
  };

  const bgCard = 'apple-liquid-card';
  const textHeading = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSubtle = isDarkMode ? 'text-zinc-400' : 'text-slate-500';
  const borderSubtle = isDarkMode ? 'border-white/10' : 'border-slate-200/60';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header & Overview Bar */}
      <div className={`p-6 rounded-3xl border ${bgCard}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/50">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-sm">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${textHeading}`}>
                  <span>Trading Screenshot Folder</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {totalWithScreenshots} Setups
                  </span>
                </h2>
                <p className={`text-xs mt-0.5 ${textSubtle}`}>
                  Visual Trade Execution Gallery. All your Open & Close position charts arranged cleanly in large format.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill Counters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? 'bg-[#1a1a20] border-[#292932]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] font-medium ${textSubtle}`}>Open Setups:</span>
              <span className="font-mono font-bold text-xs text-blue-400">{totalOpenScreenshots}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? 'bg-[#1a1a20] border-[#292932]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] font-medium ${textSubtle}`}>Close Setups:</span>
              <span className="font-mono font-bold text-xs text-purple-400">{totalCloseScreenshots}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? 'bg-[#1a1a20] border-[#292932]' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[11px] font-medium ${textSubtle}`}>Total Trades:</span>
              <span className={`font-mono font-bold text-xs ${textHeading}`}>{trades.length}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${textSubtle}`} />
            <input
              type="text"
              placeholder="Search pair or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-[#1a1a20] border-[#292932] text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Pair Selector */}
            <select
              value={filterPair}
              onChange={(e) => setFilterPair(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                isDarkMode ? 'bg-[#1a1a20] border-[#292932] text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">All Pairs ({trades.length})</option>
              {pairsList.map((p) => (
                <option key={p} value={p}>
                  {p} ({trades.filter((t) => t.pair === p).length})
                </option>
              ))}
            </select>

            {/* Filter Mode Tabs */}
            <div className={`flex p-0.5 rounded-xl border ${isDarkMode ? 'bg-[#18181d] border-[#292930]' : 'bg-slate-100 border-slate-200'}`}>
              {[
                { id: 'all', label: 'All' },
                { id: 'has_ss', label: 'With Screenshots' },
                { id: 'wins', label: 'Wins' },
                { id: 'losses', label: 'Losses' },
                { id: 'breakeven', label: 'Breakeven' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterOutcome(tab.id as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    filterOutcome === tab.id
                      ? tab.id === 'breakeven'
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Visual Trade Cards */}
      {filteredTrades.length === 0 ? (
        <div className={`p-14 text-center rounded-3xl border ${bgCard}`}>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-3">
            <FileImage className="w-8 h-8" />
          </div>
          <h3 className={`text-base font-bold ${textHeading}`}>No screenshots found</h3>
          <p className={`text-xs max-w-md mx-auto mt-1 ${textSubtle}`}>
            Upload trade screenshots directly using the "+ Add Open Chart" or "+ Add Close Chart" boxes, or attach them in the Trade History table.
          </p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              Go to Trade History Table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTrades.map((trade) => {
            const isProfit = trade.pnl >= 0;
            return (
              <div
                key={trade.id}
                className={`rounded-3xl border p-5 flex flex-col justify-between theme-transition hover:border-blue-500/40 transition-colors shadow-sm ${bgCard}`}
              >
                <div>
                  {/* Card Header: Symbol, Type, Lots, Time, PnL */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-lg font-black tracking-tight ${textHeading}`}>
                        {trade.pair}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] ${
                          trade.type === 'BUY'
                            ? isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100 text-emerald-800'
                            : isDarkMode ? 'bg-rose-950 text-rose-400 border border-rose-800/40' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {trade.type} • {trade.lots} Lots
                      </span>
                      <span className={`text-[11px] font-mono ${textSubtle}`}>
                        {trade.time}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className={`text-lg font-mono font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isProfit ? `+${trade.pnl.toFixed(2)}` : trade.pnl.toFixed(2)} {currencyLabel}
                      </div>
                    </div>
                  </div>

                  {/* Screenshots Side-by-Side: Open Position Chart & Close Position Chart */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                    {/* 1. Open Position Screenshot */}
                    <div className={`rounded-2xl border p-2.5 flex flex-col justify-between ${
                      isDarkMode ? 'bg-[#101013] border-[#222227]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${textSubtle}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>Open @ {trade.openPrice.toFixed(4)}</span>
                        </span>
                        {trade.openScreenshot && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setLightboxImage({
                                url: trade.openScreenshot!,
                                title: `${trade.pair} ${trade.type} - Open Position Setup`,
                                subtitle: `Entry Price: ${trade.openPrice.toFixed(4)} • Lots: ${trade.lots} • Time: ${trade.time}`,
                              })}
                              className="text-blue-500 hover:text-blue-400 p-1 cursor-pointer"
                              title="Zoom Chart"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleRemoveScreenshot(e, trade.id, 'open')}
                              className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="Delete screenshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {trade.openScreenshot ? (
                        <div
                          onClick={() => setLightboxImage({
                            url: trade.openScreenshot!,
                            title: `${trade.pair} ${trade.type} - Open Setup`,
                            subtitle: `Entry: ${trade.openPrice.toFixed(4)} • Lots: ${trade.lots}`,
                          })}
                          className="relative h-48 rounded-xl overflow-hidden cursor-pointer group bg-black/40 border border-slate-700/50"
                        >
                          <img
                            src={trade.openScreenshot}
                            alt="Open Position Screenshot"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-bold">
                            <Maximize2 className="w-5 h-5 text-blue-400" />
                            <span>Click to Zoom Large</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(trade.id, 'open')}
                          className={`h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition ${
                            isDarkMode ? 'border-[#2a2a30] hover:border-blue-500 bg-[#141418]' : 'border-slate-300 hover:border-blue-500 bg-white'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span className={`text-xs font-bold ${textHeading}`}>+ Add Open Chart</span>
                          <span className={`text-[10px] mt-0.5 ${textSubtle}`}>Click to upload screenshot</span>
                        </button>
                      )}
                    </div>

                    {/* 2. Close Position Screenshot */}
                    <div className={`rounded-2xl border p-2.5 flex flex-col justify-between ${
                      isDarkMode ? 'bg-[#101013] border-[#222227]' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${textSubtle}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          <span>Close @ {trade.closePrice ? trade.closePrice.toFixed(4) : '—'}</span>
                        </span>
                        {trade.closeScreenshot && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setLightboxImage({
                                url: trade.closeScreenshot!,
                                title: `${trade.pair} ${trade.type} - Close Position Exit`,
                                subtitle: `Exit Price: ${trade.closePrice ? trade.closePrice.toFixed(4) : '—'} • P&L: ${trade.pnl.toFixed(2)} ${currencyLabel}`,
                              })}
                              className="text-blue-500 hover:text-blue-400 p-1 cursor-pointer"
                              title="Zoom Chart"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleRemoveScreenshot(e, trade.id, 'close')}
                              className="text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="Delete screenshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {trade.closeScreenshot ? (
                        <div
                          onClick={() => setLightboxImage({
                            url: trade.closeScreenshot!,
                            title: `${trade.pair} ${trade.type} - Close Exit`,
                            subtitle: `Exit: ${trade.closePrice ? trade.closePrice.toFixed(4) : '—'} • P&L: ${trade.pnl.toFixed(2)} ${currencyLabel}`,
                          })}
                          className="relative h-48 rounded-xl overflow-hidden cursor-pointer group bg-black/40 border border-slate-700/50"
                        >
                          <img
                            src={trade.closeScreenshot}
                            alt="Close Position Screenshot"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-bold">
                            <Maximize2 className="w-5 h-5 text-purple-400" />
                            <span>Click to Zoom Large</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleTriggerUpload(trade.id, 'close')}
                          className={`h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition ${
                            isDarkMode ? 'border-[#2a2a30] hover:border-purple-500 bg-[#141418]' : 'border-slate-300 hover:border-purple-500 bg-white'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5">
                            <Camera className="w-5 h-5" />
                          </div>
                          <span className={`text-xs font-bold ${textHeading}`}>+ Add Close Chart</span>
                          <span className={`text-[10px] mt-0.5 ${textSubtle}`}>Click to upload screenshot</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Trade Reason & Strategy Section (Mini Notepad Trigger) */}
                  <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isDarkMode ? 'bg-[#18181d] border-[#25252b]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Execution Reason & Notes</span>
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${trade.notes ? textHeading : textSubtle}`}>
                        {trade.notes || trade.strategy || 'No reason written yet. Click "Reason" button to write in notepad...'}
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenNotepad(trade)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-300" />
                      <span>Reason</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Large Crisp View */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="max-w-6xl w-full flex items-center justify-between pb-3 text-white border-b border-white/10 mb-3">
            <div>
              <span className="font-extrabold text-base tracking-tight">{lightboxImage.title}</span>
              {lightboxImage.subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">{lightboxImage.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download="trading-chart.jpg"
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 apple-liquid-button text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 apple-liquid-button text-white transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="max-w-6xl max-h-[82vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black">
            <img
              src={lightboxImage.url}
              alt="Zoomed Chart"
              className="w-full h-full object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
