import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  ListPlus,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';

function formatErrorMessage(raw: any): string {
  if (!raw) return 'Error processing screenshot. Please try again.';
  if (typeof raw !== 'string') return String(raw);
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.error?.message) return parsed.error.message;
      if (parsed.message) return parsed.message;
    } catch {}
  }
  return trimmed;
}

export interface ExtractedTrade {
  pair: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  closePrice?: number;
  pnl: number;
  pips: number;
  strategy: string;
  time: string;
  dateDay?: number;
}

interface ScreenshotDropZoneProps {
  onTradesExtracted: (trades: ExtractedTrade[]) => void;
  currencyLabel: string;
  isDarkMode?: boolean;
}

export const ScreenshotDropZone: React.FC<ScreenshotDropZoneProps> = ({
  onTradesExtracted,
  currencyLabel,
  isDarkMode = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedTrades, setExtractedTrades] = useState<ExtractedTrade[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side image compression (max 1024px, JPEG 0.7) to speed up transmission & OCR
  const compressImage = (
    file: File,
    maxWidth = 1024,
    quality = 0.7
  ): Promise<{ base64Url: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => {
        resolve({ base64Url: '', mimeType: file.type || 'image/jpeg' });
      };
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        const img = new Image();
        img.onerror = () => {
          resolve({ base64Url: rawUrl, mimeType: file.type || 'image/jpeg' });
        };
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve({ base64Url: rawUrl, mimeType: file.type || 'image/jpeg' });
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve({ base64Url: compressed, mimeType: 'image/jpeg' });
          } catch {
            resolve({ base64Url: rawUrl, mimeType: file.type || 'image/jpeg' });
          }
        };
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (file: File) => {
    setErrorMsg(null);
    setExtractedTrades([]);
    setSelectedIndices(new Set());
    setIsScanning(true);
    setScanStep('Optimizing & compressing screenshot...');

    try {
      // 1. Fast client-side image compression
      const { base64Url, mimeType } = await compressImage(file, 1024, 0.7);

      if (!base64Url) {
        setIsScanning(false);
        setErrorMsg('Failed to process image file. Please try another image.');
        return;
      }

      const MAX_CLIENT_ATTEMPTS = 3;
      let lastErrorMsg = '';

      for (let attempt = 1; attempt <= MAX_CLIENT_ATTEMPTS; attempt++) {
        if (attempt === 1) {
          setScanStep('Extracting trade data...');
        } else {
          setScanStep(`High demand detected. Retrying (attempt ${attempt}/${MAX_CLIENT_ATTEMPTS})...`);
        }

        try {
          const res = await fetch('/api/parse-trade-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Url,
              mimeType,
            }),
          });

          const data = await res.json().catch(() => ({ error: 'Invalid response from server' }));

          if (!res.ok) {
            const errMsg = data?.error || `Server responded with status ${res.status}`;
            lastErrorMsg = errMsg;

            const isHighDemandOrRateLimit =
              res.status === 503 ||
              res.status === 429 ||
              res.status === 500 ||
              data?.isHighDemand ||
              errMsg.toLowerCase().includes('demand') ||
              errMsg.toLowerCase().includes('rate limit') ||
              errMsg.toLowerCase().includes('spikes');

            if (isHighDemandOrRateLimit && attempt < MAX_CLIENT_ATTEMPTS) {
              const backoffDelay = Math.pow(2, attempt - 1) * 1500; // 1500ms, 3000ms
              setScanStep(
                `Server experiencing high demand. Auto-retrying in ${Math.round(
                  backoffDelay / 1000
                )}s (attempt ${attempt + 1}/${MAX_CLIENT_ATTEMPTS})...`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffDelay));
              continue; // Retry next attempt
            }

            throw new Error(errMsg);
          }

          // Successfully received response
          let parsedList: ExtractedTrade[] = [];

          if (data.trades && Array.isArray(data.trades) && data.trades.length > 0) {
            parsedList = data.trades
              .filter((item: any) => item && (item.pair || item.pnl !== undefined))
              .map((item: any) => ({
                pair: (item.pair || 'CUSTOM').toUpperCase(),
                type: (item.type || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
                lots: Number(item.lots) || 0.01,
                openPrice: Number(item.openPrice) || 0,
                closePrice: item.closePrice ? Number(item.closePrice) : undefined,
                pnl: Number(item.pnl) || 0,
                pips: Number(item.pips) || 0,
                strategy: item.strategy || '',
                time: item.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateDay: Number(item.dateDay) || new Date().getDate(),
              }));
          } else if (data.pair && data.pnl !== undefined) {
            parsedList = [
              {
                pair: String(data.pair).toUpperCase(),
                type: (data.type || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
                lots: Number(data.lots) || 0.01,
                openPrice: Number(data.openPrice) || 0,
                closePrice: data.closePrice ? Number(data.closePrice) : undefined,
                pnl: Number(data.pnl) || 0,
                pips: Number(data.pips) || 0,
                strategy: data.strategy || '',
                time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateDay: Number(data.dateDay) || new Date().getDate(),
              },
            ];
          }

          if (parsedList.length > 0) {
            setExtractedTrades(parsedList);
            setSelectedIndices(new Set(parsedList.map((_, idx) => idx)));
            setIsScanning(false);
            return;
          } else {
            setIsScanning(false);
            setErrorMsg('No trades found in this screenshot. Please ensure the trade rows/table are clearly visible.');
            return;
          }
        } catch (fetchErr: any) {
          lastErrorMsg = fetchErr?.message || lastErrorMsg;
          if (attempt >= MAX_CLIENT_ATTEMPTS) {
            setIsScanning(false);
            setErrorMsg(formatErrorMessage(lastErrorMsg));
            return;
          }
          // Exponential delay before retry
          const backoffDelay = Math.pow(2, attempt - 1) * 1500;
          setScanStep(
            `Connection issue or model busy. Retrying in ${Math.round(backoffDelay / 1000)}s (attempt ${
              attempt + 1
            }/${MAX_CLIENT_ATTEMPTS})...`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }

      setIsScanning(false);
      setErrorMsg(formatErrorMessage(lastErrorMsg || 'Unable to scan screenshot after retries.'));
    } catch (err: any) {
      setIsScanning(false);
      setErrorMsg(formatErrorMessage(err?.message));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processImage(file);
            break;
          }
        }
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === extractedTrades.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(extractedTrades.map((_, idx) => idx)));
    }
  };

  const toggleSelectRow = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const selectedTrades = extractedTrades.filter((_, idx) => selectedIndices.has(idx));
  const totalSelectedPnl = selectedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalWins = selectedTrades.filter((t) => t.pnl > 0).length;
  const totalLosses = selectedTrades.filter((t) => t.pnl < 0).length;

  const handleApplyTrades = () => {
    if (selectedTrades.length > 0) {
      onTradesExtracted(selectedTrades);
      setExtractedTrades([]);
      setSelectedIndices(new Set());
    }
  };

  return (
    <div
      onPaste={handlePaste}
      tabIndex={0}
      className="w-full flex-1 flex flex-col justify-center outline-none"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {isScanning ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="relative">
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center animate-pulse ${
              isDarkMode ? 'bg-blue-950/40 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1.5 -right-1.5 animate-bounce" />
          </div>
          <div>
            <div className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Vision Scanning Statement
            </div>
            <p className="text-xs text-blue-500 font-semibold mt-0.5">{scanStep}</p>
          </div>
        </div>
      ) : extractedTrades.length > 0 ? (
        <div className={`rounded-2xl p-4 border space-y-3 animate-in fade-in zoom-in-95 duration-200 theme-transition ${
          isDarkMode ? 'bg-[#161616] border-blue-500/40' : 'bg-slate-50 border-blue-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {extractedTrades.length === 1 ? '1 Trade Found in Screenshot' : `${extractedTrades.length} Trades Found in Screenshot`}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">
                  Extracted from Image
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Check trades to include, then click Apply to add to balance & calendar!
              </p>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Batch Net P&L</div>
              <div className={`text-base font-mono font-black ${totalSelectedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {totalSelectedPnl >= 0 ? `+${totalSelectedPnl.toFixed(2)}` : totalSelectedPnl.toFixed(2)} {currencyLabel}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {totalWins} Wins / {totalLosses} Losses
              </div>
            </div>
          </div>

          {/* Quick Select All Header */}
          <div className="flex items-center justify-between text-xs pb-1">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex items-center gap-1.5 font-bold transition cursor-pointer ${
                isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {selectedIndices.size === extractedTrades.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {selectedIndices.size === extractedTrades.length ? 'Deselect All' : `Select All (${extractedTrades.length})`}
              </span>
            </button>
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedTrades.length} of {extractedTrades.length} selected
            </span>
          </div>

          {/* Scrollable list of extracted rows */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {extractedTrades.map((t, idx) => {
              const isSelected = selectedIndices.has(idx);
              const isProfit = t.pnl >= 0;
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelectRow(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-[#1d1d22] border-blue-500/60 shadow-xs'
                        : 'bg-white border-blue-400 shadow-xs'
                      : isDarkMode
                      ? 'bg-[#131316] border-[#222227] opacity-60'
                      : 'bg-slate-100/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="text-blue-500 shrink-0">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {t.pair}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${
                          t.type === 'BUY'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}>
                          {t.type}
                        </span>
                        <span className={`font-mono text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t.lots} Lots
                        </span>
                      </div>
                      <div className={`text-[10px] font-mono mt-0.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t.time} • @ {t.openPrice.toFixed(4)} {t.closePrice ? `→ ${t.closePrice.toFixed(4)}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`font-mono font-black ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isProfit ? `+${t.pnl.toFixed(2)}` : t.pnl.toFixed(2)} {currencyLabel}
                    </div>
                    <div className={`text-[9.5px] truncate max-w-[120px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t.strategy}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setExtractedTrades([]);
                setSelectedIndices(new Set());
              }}
              className={`w-full sm:w-auto px-4 py-2.5 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#1e1e1e] border-[#2c2c2c] text-slate-300 hover:bg-[#252525]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Discard & Re-scan
            </button>

            <button
              type="button"
              onClick={handleApplyTrades}
              disabled={selectedIndices.size === 0}
              className={`w-full sm:flex-1 py-3 px-5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                selectedIndices.size > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 hover:scale-[1.01]'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ListPlus className="w-4 h-4" />
              <span>
                Apply All {selectedTrades.length} Trades to Dashboard ({totalSelectedPnl >= 0 ? `+${totalSelectedPnl.toFixed(2)}` : totalSelectedPnl.toFixed(2)} {currencyLabel})
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`h-full min-h-[170px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer theme-transition ${
            isDragging
              ? 'border-blue-500 bg-blue-600/15 scale-[1.01]'
              : isDarkMode
              ? 'border-[#2c2c2c] hover:border-blue-500/80 bg-[#141414] hover:bg-[#181818]'
              : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform ${
            isDarkMode ? 'bg-blue-950/40 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
          }`}>
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Drop your trade screenshot here (1 trade or full statement table)
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
            Auto-extracts every trade row visible in the screenshot. Click to apply to balance & calendar!
          </p>

          <div className="flex items-center justify-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
            <span className={`text-[11px] font-medium px-3 py-1 rounded-full border ${
              isDarkMode ? 'bg-[#1b1b20] border-[#292930] text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              Drag & Drop screenshot or paste with <kbd className="font-mono font-bold text-blue-400">Ctrl + V</kbd>
            </span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className={`mt-2.5 p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs animate-in fade-in ${
          isDarkMode ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-semibold break-words leading-tight">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setErrorMsg(null);
            }}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-white transition shrink-0 cursor-pointer"
            title="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
