import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Clock,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Wallet,
  Activity,
  DollarSign,
  Coins,
  Trophy,
  X,
  Edit3,
  Check,
  Camera,
  Trash2,
  Sun,
  Moon,
  Cloud,
  Download,
  Upload,
  LogOut,
  FileImage,
  FileText,
  Maximize2,
  Save,
  Tag,
  Paperclip,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { CurrencyPair } from '../types/forex';
import { UserAccountConfig } from './OnboardingFlow';
import { ScreenshotDropZone, ExtractedTrade } from './ScreenshotDropZone';
import { GoogleAccount } from '../App';
import { TradingScreenshotsGallery, GalleryTrade } from './TradingScreenshotsGallery';
import { compressImage } from '../utils/imageUtils';
import { fetchCloudUserData, saveCloudUserData } from '../utils/cloudSync';
import { loadUnifiedUserData, saveUnifiedUserData, deleteTradeFromFirestore } from '../utils/firestoreSync';
import { auth } from '../firebase';
import { ShootingStars } from './ShootingStars';
import { TradingUniverseLogo } from './TradingUniverseLogo';

interface DashboardViewProps {
  onBackToHome?: () => void;
  currencyPairs: CurrencyPair[];
  triggerAddTradeCount?: number;
  userConfig?: UserAccountConfig;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  googleUser?: GoogleAccount | null;
  onGoogleLogin?: (account: GoogleAccount) => void;
  onGoogleLogout?: () => void;
  onSwitchCurrency?: (currency: 'USD' | 'USC') => void;
  cloudSyncTimestamp?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onBackToHome,
  userConfig,
  isDarkMode = true,
  onToggleDarkMode,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  onSwitchCurrency,
  cloudSyncTimestamp,
}) => {
  const currencyLabel = userConfig?.currency || 'USC';
  const initialBaseBalance = userConfig?.balance !== undefined ? Number(userConfig.balance) : 100;

  // View state: 'dashboard' vs 'screenshots'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'screenshots'>('dashboard');

  // ================= 1. PERSISTENT BALANCE =================
  const [userBalance, setUserBalance] = useState<number>(() => {
    const saved = localStorage.getItem('tu_balance');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return parsed;
    }
    return initialBaseBalance;
  });

  const [isEditingBalance, setIsEditingBalance] = useState<boolean>(false);
  const [tempBalanceInput, setTempBalanceInput] = useState<string>(userBalance.toString());

  const handleUpdateBalance = (newVal: number) => {
    setUserBalance(newVal);
    localStorage.setItem('tu_balance', newVal.toString());
    if (googleUser?.email) {
      localStorage.setItem(`tu_balance_${googleUser.email}_${currencyLabel}`, newVal.toString());
      saveUnifiedUserData({
        userId: auth.currentUser?.uid,
        email: googleUser.email,
        name: googleUser.name,
        currency: currencyLabel,
        balance: newVal,
        trades,
      }).catch(console.warn);
    }
  };

  useEffect(() => {
    if (userConfig?.balance !== undefined) {
      const saved = localStorage.getItem('tu_balance');
      if (saved === null) {
        handleUpdateBalance(Number(userConfig.balance));
        setTempBalanceInput(Number(userConfig.balance).toString());
      }
    }
  }, [userConfig?.balance]);

  // ================= 2. PERSISTENT TRADES WITH SCREENSHOTS & REASON =================
  const [trades, setTrades] = useState<GalleryTrade[]>(() => {
    try {
      const saved = localStorage.getItem('tu_trades');
      if (saved) {
        const parsed: GalleryTrade[] = JSON.parse(saved);
        // Automatically purge any dummy test or mock trades so the user starts fresh
        const cleaned = parsed.filter(
          (t) =>
            !(t.openPrice === 4154.705) &&
            !(t.openPrice === 81283.77 && t.pair === 'BTC/USD') &&
            !(t.openPrice === 81259.39 && t.pair === 'BTC/USD') &&
            !(t.openPrice === 81590.58 && t.pair === 'BTC/USD') &&
            !(t.openPrice === 93.123 && t.pair === 'USOIL') &&
            !(t.openPrice === 1.0825 && t.pair === 'EUR/USD') &&
            !(t.openPrice === 2724.5 && t.pair === 'XAU/USD') &&
            !(t.openPrice === 1.3012 && t.pair === 'GBP/USD') &&
            !(t.openPrice === 153.85 && t.pair === 'USD/JPY') &&
            t.strategy !== 'London Session Breakout' &&
            t.strategy !== 'H4 Trend Pullback (FVG)' &&
            t.strategy !== 'Key Resistance Rejection' &&
            t.strategy !== 'Trend Continuation' &&
            !t.id.startsWith('tr-10') &&
            !t.id.includes('demo') &&
            !t.id.includes('mock') &&
            !t.id.includes('test')
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('tu_trades', JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tu_trades', JSON.stringify(trades));
    if (googleUser?.email) {
      localStorage.setItem(`tu_trades_${googleUser.email}`, JSON.stringify(trades));
    }
    localStorage.setItem('tu_current_view', 'dashboard');
  }, [trades, googleUser?.email]);

  const [currentTime, setCurrentTime] = useState<string>('');
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [showScanArea, setShowScanArea] = useState<boolean>(true);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Mini Notepad State
  const [activeNotepadTrade, setActiveNotepadTrade] = useState<GalleryTrade | null>(null);
  const [notepadText, setNotepadText] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Image zoom modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Hidden file input for quick screenshot attach
  const [pendingUpload, setPendingUpload] = useState<{ tradeId: string; type: 'open' | 'close' } | null>(null);
  const tableFileInputRef = React.useRef<HTMLInputElement>(null);

  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState(userConfig?.name || '');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);

  // Cross-device cloud sync states
  const [cloudSyncState, setCloudSyncState] = useState<'synced' | 'syncing' | 'offline' | 'error'>(
    googleUser?.email ? 'synced' : 'offline'
  );
  const [lastSyncText, setLastSyncText] = useState<string>('Just now');
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState<boolean>(false);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState<boolean>(false);

  // Sync state when App signals new cloud data
  useEffect(() => {
    if (!cloudSyncTimestamp) return;
    try {
      const savedTrades = localStorage.getItem('tu_trades');
      if (savedTrades) {
        setTrades(JSON.parse(savedTrades));
      }
      const savedBalance = localStorage.getItem('tu_balance');
      if (savedBalance !== null) {
        setUserBalance(parseFloat(savedBalance));
      }
      setCloudSyncState('synced');
      setLastSyncText('Just now');
    } catch (e) {
      console.warn('Error refreshing state from cloud timestamp:', e);
    }
  }, [cloudSyncTimestamp]);

  // Initial cloud + Firestore fetch on mount if logged in
  useEffect(() => {
    if (!googleUser?.email) {
      setCloudSyncState('offline');
      setIsInitialLoadDone(true);
      return;
    }
    setCloudSyncState('syncing');

    loadUnifiedUserData(auth.currentUser?.uid, googleUser.email, currencyLabel)
      .then((res) => {
        if (res.success && res.data) {
          const acc = res.data.accounts?.[currencyLabel];
          const loadedTrades = acc?.trades ?? res.data.trades ?? [];
          const loadedBalance = acc?.balance ?? res.data.balance ?? 100;

          if (Array.isArray(loadedTrades) && loadedTrades.length > 0) {
            setTrades(loadedTrades);
            localStorage.setItem('tu_trades', JSON.stringify(loadedTrades));
            localStorage.setItem(`tu_trades_${googleUser.email}_${currencyLabel}`, JSON.stringify(loadedTrades));
            localStorage.setItem(`tu_trades_backup_${currencyLabel}`, JSON.stringify(loadedTrades));
          } else {
            // Check local cache if server had 0 trades to avoid accidental reset
            const localCached = localStorage.getItem(`tu_trades_${googleUser.email}_${currencyLabel}`) ||
                                localStorage.getItem(`tu_trades_${currencyLabel}`) ||
                                localStorage.getItem('tu_trades');
            if (localCached) {
              try {
                const parsed = JSON.parse(localCached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setTrades(parsed);
                }
              } catch (e) {
                console.warn('Cache parse error:', e);
              }
            }
          }

          if (loadedBalance !== undefined && !isNaN(loadedBalance)) {
            setUserBalance(loadedBalance);
            localStorage.setItem('tu_balance', String(loadedBalance));
            localStorage.setItem(`tu_balance_${googleUser.email}_${currencyLabel}`, String(loadedBalance));
          }

          setCloudSyncState('synced');
          setLastSyncText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      })
      .catch((err) => {
        console.warn('Initial load error (kept local state safe):', err);
        setCloudSyncState('error');
      })
      .finally(() => {
        setIsInitialLoadDone(true);
      });
  }, [googleUser?.email, currencyLabel]);

  // Automatic debounced cloud + Firestore backup
  // CRITICAL: NEVER run before initial load has completed!
  useEffect(() => {
    if (!isInitialLoadDone || !googleUser?.email) return;

    setCloudSyncState('syncing');
    const timer = setTimeout(async () => {
      try {
        const res = await saveUnifiedUserData({
          userId: auth.currentUser?.uid,
          email: googleUser.email,
          name: googleUser.name,
          currency: currencyLabel,
          balance: userBalance,
          trades,
        });
        if (res.success) {
          setCloudSyncState('synced');
          setLastSyncText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } else {
          setCloudSyncState('error');
        }
      } catch {
        setCloudSyncState('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [trades, userBalance, userConfig, googleUser?.email, currencyLabel, isInitialLoadDone]);

  // Update specific trade in state & localStorage
  const handleUpdateTrade = (tradeId: string, updates: Partial<GalleryTrade>) => {
    setTrades((prev) => {
      const next = prev.map((t) => (t.id === tradeId ? { ...t, ...updates } : t));
      localStorage.setItem('tu_trades', JSON.stringify(next));
      if (googleUser?.email) {
        localStorage.setItem(`tu_trades_${googleUser.email}_${currencyLabel}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Manual selection for Trade Result (Profit, Loss, Breakeven)
  const handleSetTradeResult = (tradeId: string, resultType: 'PROFIT' | 'LOSS' | 'BREAKEVEN') => {
    setTrades((prev) => {
      const next = prev.map((t) => {
        if (t.id !== tradeId) return t;
        let newPnl = t.pnl;
        if (resultType === 'BREAKEVEN') {
          // Never zero out P&L to 00 when Breakeven is clicked!
          // Preserves original trade P&L as requested:
          // "ami breakeven click korle 00 hoye jay , ata jeno kokono na hoy"
          newPnl = t.pnl;
        } else if (resultType === 'PROFIT' && t.pnl < 0) {
          newPnl = Math.abs(t.pnl);
        } else if (resultType === 'LOSS' && t.pnl > 0) {
          newPnl = -Math.abs(t.pnl);
        }
        return {
          ...t,
          result: resultType,
          pnl: newPnl,
        };
      });
      localStorage.setItem('tu_trades', JSON.stringify(next));
      if (googleUser?.email) {
        localStorage.setItem(`tu_trades_${googleUser.email}_${currencyLabel}`, JSON.stringify(next));
      }
      return next;
    });
  };

  // Open Mini Notepad for Reason
  const handleOpenNotepad = (trade: GalleryTrade) => {
    setActiveNotepadTrade(trade);
    setNotepadText(trade.notes || trade.strategy || '');
    setSelectedTag(trade.strategy || '');
  };

  // Save reason in Mini Notepad
  const handleSaveNotepad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotepadTrade) return;
    const finalReason = notepadText.trim() || selectedTag || 'Technical Setup';
    handleUpdateTrade(activeNotepadTrade.id, {
      notes: finalReason,
      strategy: selectedTag || finalReason.slice(0, 30),
    });
    setActiveNotepadTrade(null);
    setImportNotification(`✓ Reason saved for ${activeNotepadTrade.pair}!`);
    setTimeout(() => setImportNotification(null), 3000);
  };

  // Quick attach screenshot from table
  const handleTriggerTableUpload = (tradeId: string, type: 'open' | 'close') => {
    setPendingUpload({ tradeId, type });
    tableFileInputRef.current?.click();
  };

  const handleTableFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;
    try {
      const compressed = await compressImage(file);
      if (pendingUpload.type === 'open') {
        handleUpdateTrade(pendingUpload.tradeId, { openScreenshot: compressed });
      } else {
        handleUpdateTrade(pendingUpload.tradeId, { closeScreenshot: compressed });
      }
      setImportNotification(`✓ ${pendingUpload.type.toUpperCase()} screenshot attached to trade!`);
      setTimeout(() => setImportNotification(null), 3500);
    } catch {
      alert('Could not attach screenshot');
    } finally {
      setPendingUpload(null);
      if (tableFileInputRef.current) tableFileInputRef.current.value = '';
    }
  };

  // Batch extraction from screenshot drop
  const handleScreenshotTradesExtracted = (extractedList: ExtractedTrade[]) => {
    const formattedTrades: GalleryTrade[] = extractedList.map((extracted, idx) => ({
      id: `trade-ss-${Date.now()}-${idx}`,
      pair: extracted.pair,
      type: extracted.type,
      lots: extracted.lots,
      openPrice: extracted.openPrice,
      closePrice: extracted.closePrice,
      pnl: extracted.pnl,
      pips: extracted.pips,
      status: 'CLOSED',
      time: extracted.time,
      strategy: extracted.strategy,
      dateDay: extracted.dateDay || new Date().getDate(),
      dateMonth: new Date().getMonth(),
      dateYear: new Date().getFullYear(),
      notes: extracted.strategy,
    }));

    setTrades((prev) => {
      const updated = [...formattedTrades, ...prev];
      localStorage.setItem('tu_trades', JSON.stringify(updated));
      return updated;
    });

    const totalBatchPnl = extractedList.reduce((sum, t) => sum + t.pnl, 0);
    const sign = totalBatchPnl >= 0 ? '+' : '';
    setImportNotification(
      `✓ Successfully applied ${extractedList.length} trades! Net P&L: ${sign}${totalBatchPnl.toFixed(2)} ${currencyLabel}. Auto-saved to memory!`
    );
    setTimeout(() => {
      setImportNotification(null);
    }, 7000);
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatBalance = (amount: number) => {
    const formatted = Math.max(0, amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (currencyLabel === 'USC') {
      return `${formatted} USC`;
    }
    return `${formatted} USD`;
  };

  const formatCurrency = (amount: number) => {
    const isNeg = amount < 0;
    const abs = Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (currencyLabel === 'USC') {
      return isNeg ? `-${abs} USC` : `+${abs} USC`;
    }
    return isNeg ? `-${abs} USD` : `+${abs} USD`;
  };

  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const totalRealizedPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalUnrealizedPnl = openTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalPnl = totalRealizedPnl + totalUnrealizedPnl;
  const currentEquity = userBalance + totalPnl;
  const winningTrades = closedTrades.filter((t) => t.pnl > 0);
  const winRate =
    closedTrades.length > 0
      ? Math.round((winningTrades.length / closedTrades.length) * 100)
      : 0;

  const handleSaveBalanceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempBalanceInput);
    if (!isNaN(val) && val >= 10) {
      handleUpdateBalance(val);
      setIsEditingBalance(false);
    }
  };

  const handleDeleteTrade = (id: string) => {
    setTrades((prev) => {
      const nextTrades = prev.filter((t) => t.id !== id);
      localStorage.setItem('tu_trades', JSON.stringify(nextTrades));
      if (googleUser?.email) {
        localStorage.setItem(`tu_trades_${googleUser.email}_${currencyLabel}`, JSON.stringify(nextTrades));
        deleteTradeFromFirestore(auth.currentUser?.uid, id).catch(console.warn);
        saveUnifiedUserData({
          userId: auth.currentUser?.uid,
          email: googleUser.email,
          name: googleUser.name,
          currency: currencyLabel,
          balance: userBalance,
          trades: nextTrades,
        }).catch(console.warn);
      }
      return nextTrades;
    });
  };

  const handleManualSyncNow = async () => {
    if (!googleUser?.email) {
      setShowGoogleModal(true);
      return;
    }
    setIsManualSyncing(true);
    setCloudSyncState('syncing');
    try {
      const res = await fetchCloudUserData(googleUser.email);
      if (res.success && res.exists && res.data) {
        if (Array.isArray(res.data.trades)) {
          setTrades(res.data.trades);
          localStorage.setItem('tu_trades', JSON.stringify(res.data.trades));
        }
        if (res.data.balance !== undefined) {
          setUserBalance(res.data.balance);
          localStorage.setItem('tu_balance', String(res.data.balance));
        }
        setImportNotification(`✓ Cloud sync complete! Loaded ${res.data.trades?.length || 0} trades for ${googleUser.email}.`);
      } else {
        await saveCloudUserData({
          email: googleUser.email,
          name: googleUser.name,
          userConfig,
          balance: userBalance,
          trades,
        });
        setImportNotification(`✓ Cloud sync complete! Backed up to ${googleUser.email}.`);
      }
      setCloudSyncState('synced');
      setLastSyncText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setCloudSyncState('error');
      setImportNotification('Cloud sync error. Check your connection.');
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setImportNotification(null), 4000);
    }
  };

  const handleConnectGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputEmail.trim()) return;
    setIsManualSyncing(true);
    setCloudSyncState('syncing');
    const email = inputEmail.trim().toLowerCase();
    const name = inputName.trim() || 'Trader';
    const account: GoogleAccount = {
      email,
      name,
      avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      connectedAt: new Date().toLocaleDateString(),
    };

    try {
      const res = await fetchCloudUserData(email);
      if (res.success && res.exists && res.data) {
        if (Array.isArray(res.data.trades)) {
          setTrades(res.data.trades);
          localStorage.setItem('tu_trades', JSON.stringify(res.data.trades));
          localStorage.setItem(`tu_trades_${email}`, JSON.stringify(res.data.trades));
        }
        if (res.data.balance !== undefined) {
          setUserBalance(res.data.balance);
          localStorage.setItem('tu_balance', String(res.data.balance));
          localStorage.setItem(`tu_balance_${email}`, String(res.data.balance));
        }
        setCloudSyncState('synced');
        setImportNotification(`✓ Welcome back! Retrieved ${res.data.trades?.length || 0} trades from cloud for ${email}.`);
      } else {
        // Brand new user: initialize clean empty journal
        const freshTrades: GalleryTrade[] = [];
        await saveCloudUserData({
          email,
          name,
          userConfig,
          balance: userBalance,
          trades: freshTrades,
        });
        setTrades(freshTrades);
        localStorage.setItem('tu_trades', JSON.stringify(freshTrades));
        localStorage.setItem(`tu_trades_${email}`, JSON.stringify(freshTrades));
        setCloudSyncState('synced');
        setImportNotification(`✓ Cloud account initialized! Synced clean journal for ${email}.`);
      }
      if (onGoogleLogin) onGoogleLogin(account);
      setIsSwitchingAccount(false);
      setShowGoogleModal(false);
    } catch (err: any) {
      setCloudSyncState('error');
      setImportNotification(`Login error: ${err?.message || 'Failed to sync'}`);
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setImportNotification(null), 4500);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      userConfig,
      balance: userBalance,
      trades,
      exportedAt: new Date().toISOString(),
      googleUser,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-universe-backup-${userConfig?.name ? userConfig.name.toLowerCase().replace(/\s+/g, '-') : 'trader'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.balance) handleUpdateBalance(parsed.balance);
          if (Array.isArray(parsed.trades)) setTrades(parsed.trades);
          setImportNotification('✓ Complete backup restored successfully!');
          setTimeout(() => setImportNotification(null), 5000);
        } catch {
          alert('Invalid backup file');
        }
      };
      reader.readAsText(file);
    }
  };

  // Equity points calculation
  const equityPoints: number[] = [userBalance];
  let running = userBalance;
  [...trades].reverse().forEach((t) => {
    running += t.pnl;
    equityPoints.push(running);
  });

  const minEq = Math.min(...equityPoints);
  const maxEq = Math.max(...equityPoints);
  const eqRange = maxEq - minEq || 1;

  const chartW = 500;
  const chartH = 160;
  const pad = 20;

  const svgCoords = equityPoints.map((val, idx) => {
    const x = pad + (idx / (equityPoints.length - 1)) * (chartW - 2 * pad);
    const y = chartH - pad - ((val - minEq) / eqRange) * (chartH - 2 * pad);
    return `${x},${y}`;
  });

  const lineD = `M ${svgCoords.join(' L ')}`;
  const fillD = `M ${pad},${chartH} L ${svgCoords.join(' L ')} L ${chartW - pad},${chartH} Z`;

  // Dynamic Calendar Navigation state (pure Date object guarantees exact serial order 2026 -> 2027 -> 2028)
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date(2026, 9, 1)); // October 2026

  const handlePrevMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const calendarMonthLabel = `${monthNames[calendarMonth]} ${calendarYear}`;

  const daysInSelectedMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const daysInMonth = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);
  const firstDayWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  // Monday is column 0, Sunday is column 6:
  const startDayOffset = (firstDayWeekday + 6) % 7;

  // Monthly realized P&L for selected month
  const monthTrades = trades.filter((t) => {
    if (t.dateYear !== undefined && t.dateMonth !== undefined) {
      return t.dateYear === calendarYear && t.dateMonth === calendarMonth;
    }
    return calendarYear === 2026 && calendarMonth === 9;
  });
  const monthRealizedPnl = monthTrades
    .filter((t) => t.status === 'CLOSED')
    .reduce((sum, t) => sum + t.pnl, 0);

  const getDayTrades = (day: number) => {
    return monthTrades.filter((t) => t.dateDay === day);
  };

  const bgMain = 'bg-black text-zinc-100';
  const bgSidebar = 'apple-liquid-sidebar';
  const bgCard = 'apple-liquid-card';
  const borderSubtle = 'border-white/10';
  const textSubtle = 'text-zinc-400';
  const textHeading = 'text-white';

  return (
    <div className={`min-h-screen w-full theme-transition flex font-sans relative ${bgMain}`}>
      {/* Background Animated Shooting Stars */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <ShootingStars isDarkMode={isDarkMode} />
      </div>

      {/* Hidden file input for table camera buttons */}
      <input
        type="file"
        ref={tableFileInputRef}
        accept="image/*"
        onChange={handleTableFileSelected}
        className="hidden"
      />

      {/* ================= FIXED SIDEBAR (DOES NOT SCROLL) ================= */}
      <aside className={`sticky top-0 h-screen w-64 border-r flex flex-col justify-between p-4 shrink-0 hidden md:flex theme-transition z-30 ${bgSidebar}`}>
        <div className="space-y-5">
          {/* Logo */}
          <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle}`}>
            <div className="flex items-center gap-2.5">
              <TradingUniverseLogo size="md" />
              <span className={`font-extrabold text-base tracking-tight ${textHeading}`}>
                Trading<span className="text-zinc-300">Universe</span>
              </span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="apple-liquid-card p-3.5 rounded-2xl space-y-2.5 theme-transition">
            <div className="flex items-center gap-2.5">
              <TradingUniverseLogo size="md" />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold flex items-center gap-1.5 truncate ${textHeading}`}>
                  <span className="truncate">Trading Universe</span>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.2 bg-[#ffdf00] text-black rounded shrink-0">
                    {userConfig?.platform || 'Exness'}
                  </span>
                </div>
                <div className={`text-[11px] font-medium ${textSubtle}`}>
                  {userConfig?.currency || 'USC'} Verified
                </div>
              </div>
            </div>

            {/* Balance Badge in Profile */}
            <div className={`pt-2 border-t flex items-center justify-between text-xs ${borderSubtle}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${textSubtle}`}>Account Balance</span>
              <span className="font-mono font-extrabold px-2 py-0.5 rounded-md text-zinc-200 bg-zinc-900 border border-zinc-800">
                {formatBalance(userBalance)}
              </span>
            </div>

            {/* Google Cloud Sync Status */}
            <button
              onClick={() => setShowGoogleModal(true)}
              className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition cursor-pointer ${
                googleUser
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50'
                  : isDarkMode
                  ? 'bg-[#202026] text-zinc-300 hover:bg-[#282830] border border-[#2d2d35]'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Cloud className={`w-3.5 h-3.5 shrink-0 ${googleUser ? 'text-emerald-400' : 'text-blue-500'}`} />
                <span className="truncate">{googleUser ? 'Cloud Synced' : 'Cloud Backup'}</span>
              </div>
              <span className={`text-[9px] px-1 rounded ${googleUser ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-400'}`}>
                {googleUser ? 'SYNCED' : 'CONNECT'}
              </span>
            </button>
          </div>

          {/* Navigation with "Trading Screenshot" Folder right below Dashboard */}
          <div className="space-y-1.5">
            {/* 1. Dashboard Tab */}
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-zinc-300 hover:bg-[#1a1a1f] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-200" />
              <span>Dashboard</span>
            </button>

            {/* 2. Trading Screenshot Folder Tab */}
            <button
              onClick={() => setCurrentTab('screenshots')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentTab === 'screenshots'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-zinc-300 hover:bg-[#1a1a1f] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileImage className="w-4 h-4 text-amber-400" />
                <span>Trading Screenshot</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#222228] text-zinc-400">
                {trades.filter((t) => t.openScreenshot || t.closeScreenshot).length}
              </span>
            </button>


            {/* 3. Statement OCR Drop Button */}
            <button
              onClick={() => {
                setCurrentTab('dashboard');
                setShowScanArea((prev) => !prev);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isDarkMode ? 'text-zinc-400 hover:bg-[#1a1a1f] hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>{showScanArea ? 'Hide Statement Drop' : 'Scan Statement'}</span>
            </button>
          </div>
        </div>

        {/* Fixed Footer: Exit to Home & Log Out */}
        <div className={`pt-4 border-t space-y-2 ${borderSubtle}`}>
          {googleUser && onGoogleLogout && (
            <button
              onClick={onGoogleLogout}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border font-bold text-xs transition cursor-pointer ${
                isDarkMode
                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-300 hover:bg-rose-950/60'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
              title="Log out of account (will require sign-in on next visit)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-bold text-xs transition cursor-pointer backdrop-blur-md ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to Home</span>
            </button>
          )}
        </div>
      </aside>

      {/* ================= MAIN CONTENT VIEWPORT ================= */}
      <main className="flex-1 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Top Bar Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer shadow-xs md:hidden ${
                  isDarkMode ? 'bg-[#18181d] border-[#27272d] text-zinc-300' : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}
            <div>
              <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${textHeading}`}>
                <span>{currentTab === 'dashboard' ? 'Trading Universe' : 'Trading Screenshot Folder'}</span>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-blue-950/80 text-blue-400 border border-blue-800/40' : 'bg-blue-100 text-blue-700'
                }`}>
                  {userConfig?.platform || 'Exness'} • {currencyLabel}
                </span>
              </h1>
              <p className={`text-xs font-medium ${textSubtle}`}>Trading Universe • Verified Trading Journal</p>
            </div>
          </div>

          {/* Top Actions: View Switcher, Google Sync & Clock */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Switcher Buttons for Mobile / Quick Access */}
            <div className={`flex p-0.5 rounded-xl border ${isDarkMode ? 'bg-[#18181d] border-[#27272d]' : 'bg-slate-100 border-slate-200'}`}>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'dashboard'
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentTab('screenshots')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'screenshots'
                    ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <FileImage className="w-3.5 h-3.5" />
                <span>Trading Screenshot</span>
              </button>

            </div>

            {googleUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setIsSwitchingAccount(false);
                    setShowGoogleModal(true);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs ${
                    cloudSyncState === 'synced'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                      : cloudSyncState === 'syncing'
                      ? 'bg-blue-950/40 text-blue-300 border-blue-800/60'
                      : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                  }`}
                  title="Click to view Cloud Account & Sync details"
                >
                  {cloudSyncState === 'syncing' || isManualSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span className="hidden sm:inline truncate max-w-[130px]">Trading Universe Cloud</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    cloudSyncState === 'syncing' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {cloudSyncState === 'syncing' ? 'SYNCING...' : 'SYNCED'}
                  </span>
                </button>

                <button
                  onClick={handleManualSyncNow}
                  disabled={isManualSyncing}
                  title="Sync Now: Pull freshest data from cloud or save local changes"
                  className={`p-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#18181d] border-[#27272d] text-zinc-300 hover:text-white hover:bg-[#202026]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-blue-400' : 'text-zinc-400 hover:text-zinc-200'}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsSwitchingAccount(false);
                  setShowGoogleModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold transition cursor-pointer shadow-xs"
                title="Log in with your email to access trades from any phone worldwide"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Login & Cloud Sync</span>
              </button>
            )}

            <div className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-mono font-medium shadow-xs ${
              isDarkMode ? 'bg-[#18181d] border-[#27272d] text-zinc-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{currentTime || '05:00:00 PM'}</span>
            </div>
          </div>
        </div>

        {/* Import Notification Banner */}
        {importNotification && (
          <div className={`p-4 border-2 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2 duration-300 ${
            isDarkMode ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200' : 'bg-emerald-50 border-emerald-400 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{importNotification}</span>
            </div>
            <button onClick={() => setImportNotification(null)} className="font-mono font-bold text-sm opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ================= CONDITIONAL VIEW: DASHBOARD vs SCREENSHOT FOLDER ================= */}
        {currentTab === 'screenshots' ? (
          <TradingScreenshotsGallery
            trades={trades}
            onUpdateTrade={handleUpdateTrade}
            currencyLabel={currencyLabel}
            isDarkMode={isDarkMode}
            onOpenNotepad={handleOpenNotepad}
          />
        ) : (
          <>
            {/* 4 FULL-SIZED KPI TOP METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. ACCOUNT BALANCE */}
              <div className="apple-liquid-card p-5 relative group theme-transition border-white/10 hover:border-white/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/60 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${textSubtle}`}>
                      <span>ACCOUNT BALANCE</span>
                      <span className="text-[10px] text-zinc-300 font-bold bg-zinc-900 border border-zinc-700/70 px-1.5 py-0.2 rounded">
                        {currencyLabel}
                      </span>
                    </div>

                    {isEditingBalance ? (
                      <form onSubmit={handleSaveBalanceEdit} className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          min="10"
                          step="any"
                          value={tempBalanceInput}
                          onChange={(e) => setTempBalanceInput(e.target.value)}
                          className={`w-24 px-2 py-0.5 text-sm font-mono font-bold border border-blue-500 rounded ${
                            isDarkMode ? 'bg-[#222228] text-white' : 'bg-white text-slate-900'
                          }`}
                          autoFocus
                        />
                        <button type="submit" className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs">
                          <Check className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => setIsEditingBalance(false)} className="p-1 bg-zinc-700 text-zinc-300 rounded text-xs">
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <div className={`text-2xl font-mono font-black mt-0.5 tracking-tight flex items-center gap-2 ${textHeading}`}>
                        <span>{formatBalance(userBalance)}</span>
                        <button
                          onClick={() => {
                            setTempBalanceInput(userBalance.toString());
                            setIsEditingBalance(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-400 transition p-1"
                          title="Edit balance"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="text-[11px] text-emerald-500 font-semibold mt-0.5 flex items-center gap-1">
                      <span>● Saved in Permanent Memory</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. EQUITY */}
              <div className={`p-5 rounded-2xl border theme-transition flex items-center gap-4 ${bgCard}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${textSubtle}`}>EQUITY</div>
                  <div className={`text-2xl font-mono font-black mt-0.5 ${textHeading}`}>
                    {formatBalance(currentEquity)}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${textSubtle}`}>
                    Balance + Realized P&L
                  </div>
                </div>
              </div>

              {/* 3. TOTAL P&L */}
              <div className={`p-5 rounded-2xl border theme-transition flex items-center gap-4 ${bgCard}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-zinc-900 text-zinc-300 border border-zinc-800">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${textSubtle}`}>TOTAL P&L</div>
                  <div className={`text-2xl font-mono font-black mt-0.5 ${totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatCurrency(totalPnl)}
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${textSubtle}`}>
                    Realized: {formatCurrency(totalRealizedPnl)}
                  </div>
                </div>
              </div>

              {/* 4. WIN RATE */}
              <div className={`p-5 rounded-2xl border theme-transition flex items-center gap-4 ${bgCard}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'bg-purple-950/50 text-purple-400 border border-purple-800/40' : 'bg-purple-50 text-purple-600 border border-purple-100'
                }`}>
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${textSubtle}`}>WIN RATE</div>
                  <div className={`text-2xl font-mono font-black mt-0.5 ${textHeading}`}>
                    {winRate}%
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${textSubtle}`}>
                    {winningTrades.length} Won / {closedTrades.length} Closed
                  </div>
                </div>
              </div>
            </div>

            {/* PERFORMANCE CHART & MONTHLY CALENDAR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Equity Performance & Auto-Scan */}
              <div className={`lg:col-span-7 p-6 rounded-2xl border theme-transition space-y-4 ${bgCard}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${textSubtle}`}>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span>EQUITY PERFORMANCE & STATEMENT AUTO-SCAN</span>
                    </div>
                    <div className={`text-3xl font-mono font-black mt-1 ${textHeading}`}>
                      {formatBalance(currentEquity)}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowScanArea((prev) => !prev)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      showScanArea
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : isDarkMode
                        ? 'bg-[#1e1e24] border-[#2b2b33] text-zinc-300 hover:bg-[#25252d]'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>{showScanArea ? 'Hide Statement Drop' : '+ Drop / Scan Statement'}</span>
                  </button>
                </div>

                {showScanArea && (
                  <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#18181d] border-[#27272d]' : 'bg-slate-50 border-slate-200'}`}>
                    <ScreenshotDropZone
                      onTradesExtracted={handleScreenshotTradesExtracted}
                      currencyLabel={currencyLabel}
                      isDarkMode={isDarkMode}
                    />
                  </div>
                )}

                <div className={`min-h-[190px] rounded-xl border p-4 flex flex-col justify-between theme-transition ${
                  isDarkMode ? 'bg-[#101013] border-[#202025]' : 'bg-slate-50/50 border-slate-200'
                }`}>
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-40 overflow-visible">
                    <defs>
                      <linearGradient id="equityEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="35" x2={chartW} y2="35" stroke="#1e1e24" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2={chartW} y2="80" stroke="#1e1e24" strokeDasharray="3 3" />
                    <line x1="0" y1="125" x2={chartW} y2="125" stroke="#1e1e24" strokeDasharray="3 3" />
                    
                    <path d={fillD} fill="url(#equityEmeraldGradient)" />
                    <path
                      d={lineD}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {svgCoords.map((coord, idx) => {
                      const [cx, cy] = coord.split(',');
                      return (
                        <circle
                          key={idx}
                          cx={cx}
                          cy={cy}
                          r={idx === svgCoords.length - 1 ? 4.5 : 2.5}
                          className={idx === svgCoords.length - 1 ? 'fill-emerald-400 stroke-white stroke-2' : 'fill-emerald-500'}
                        />
                      );
                    })}
                  </svg>

                  <div className={`flex justify-between text-[10px] font-mono pt-2 border-t ${isDarkMode ? 'border-[#1e1e24] text-zinc-400' : 'border-slate-200/60 text-slate-500'}`}>
                    <span>Base Balance: {formatBalance(userBalance)}</span>
                    <span>Oct 14 ({trades.filter((t) => t.dateDay === 14).length} Trades)</span>
                    <span>Oct 15 ({trades.filter((t) => t.dateDay === 15).length} Trades)</span>
                    <span className="font-bold text-blue-500">Current Equity: {formatBalance(currentEquity)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Monthly P&L Calendar */}
              <div className={`lg:col-span-5 p-6 rounded-2xl border theme-transition flex flex-col justify-between ${bgCard}`}>
                <div>
                  <div className={`flex items-center justify-between pb-3 border-b ${borderSubtle} flex-wrap gap-2`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${textHeading}`}>Monthly Calendar</span>
                      <span className={`text-xs font-mono font-semibold ${textSubtle}`}>
                        P&L: {formatCurrency(monthRealizedPnl)}
                      </span>
                    </div>

                    {/* Serial Year & Month Navigation: 2026 -> 2027 -> 2028 */}
                    <div className="flex items-center gap-2">
                      {/* Serial Year Buttons */}
                      <div className="inline-flex items-center p-0.5 rounded-xl border border-white/15 bg-white/5 backdrop-blur-xl gap-0.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                        {[2026, 2027, 2028].map((yr) => (
                          <button
                            key={yr}
                            onClick={() => setCalendarDate(new Date(yr, calendarMonth, 1))}
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-black transition cursor-pointer ${
                              calendarYear === yr
                                ? 'bg-blue-600 text-white shadow-xs scale-105'
                                : isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>

                      {/* Month Prev/Next Steppers */}
                      <div className={`flex items-center gap-1 text-xs ${textSubtle}`}>
                        <button
                          onClick={handlePrevMonth}
                          className="p-1 hover:opacity-100 opacity-70 hover:text-blue-400 hover:scale-110 transition cursor-pointer"
                          title="Previous Month"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className={`font-bold text-xs select-none px-2 py-0.5 rounded-lg border backdrop-blur-md ${
                          isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-800'
                        }`}>
                          {monthNames[calendarMonth]} {calendarYear}
                        </span>
                        <button
                          onClick={handleNextMonth}
                          className="p-1 hover:opacity-100 opacity-70 hover:text-blue-400 hover:scale-110 transition cursor-pointer"
                          title="Next Month"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-8 gap-1 text-center text-[10px] font-bold uppercase py-2 text-zinc-400">
                    <span>M</span>
                    <span>T</span>
                    <span>W</span>
                    <span>T</span>
                    <span>F</span>
                    <span>S</span>
                    <span>S</span>
                    <span className="text-blue-500 font-extrabold">Weekly</span>
                  </div>

                  <div className="grid grid-cols-8 gap-1.5 text-xs">
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                      <div key={`empty-${i}`} className={`h-9 sm:h-10 rounded-lg border ${
                        isDarkMode ? 'bg-[#18181d]/40 border-[#202025]' : 'bg-slate-50/40 border-slate-100/40'
                      }`}></div>
                    ))}
                    {daysInMonth.map((day) => {
                      const now = new Date();
                      const isToday = now.getFullYear() === calendarYear && now.getMonth() === calendarMonth && now.getDate() === day;
                      const dayTrades = getDayTrades(day);
                      const hasTrades = dayTrades.length > 0;
                      const dayTotalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                      
                      // Check for manual results if any
                      const hasManualBreakeven = dayTrades.some((t) => t.result === 'BREAKEVEN');
                      const hasManualLoss = dayTrades.some((t) => t.result === 'LOSS');
                      const hasManualProfit = dayTrades.some((t) => t.result === 'PROFIT');

                      const isBreakevenDay = hasTrades && (dayTotalPnl === 0 || (hasManualBreakeven && !hasManualProfit && !hasManualLoss));
                      const isProfitDay = hasTrades && !isBreakevenDay && dayTotalPnl > 0;
                      const isLossDay = hasTrades && !isBreakevenDay && dayTotalPnl < 0;

                      const dayOfWeek = (day + startDayOffset - 1) % 7;
                      const isSunday = dayOfWeek === 6;
                      const weekTrades = monthTrades.filter((t) => t.dateDay && t.dateDay <= day && t.dateDay > day - 7);
                      const weekTotalPnl = weekTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                      const hasWeekTrades = weekTrades.length > 0;

                      return (
                        <React.Fragment key={day}>
                          <div
                            title={
                              hasTrades
                                ? `${calendarMonthLabel.split(' ')[0]} ${day}: ${dayTotalPnl >= 0 ? '+' : ''}${dayTotalPnl.toFixed(2)} ${currencyLabel} (${dayTrades.length} trade${dayTrades.length > 1 ? 's' : ''})`
                                : isToday
                                ? `${calendarMonthLabel.split(' ')[0]} ${day} (Today - No trades yet)`
                                : `${calendarMonthLabel.split(' ')[0]} ${day}`
                            }
                            className={`h-9 sm:h-10 rounded-xl border flex flex-col items-center justify-center relative transition-all duration-200 select-none ${
                              isProfitDay
                                ? 'bg-gradient-to-b from-emerald-500/35 to-emerald-700/40 text-emerald-100 border-emerald-400/50 shadow-[0_4px_14px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md hover:scale-105 cursor-pointer ring-1 ring-emerald-300/30'
                                : isLossDay
                                ? 'bg-gradient-to-b from-rose-500/35 to-rose-700/40 text-rose-100 border-rose-400/50 shadow-[0_4px_14px_rgba(244,63,94,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md hover:scale-105 cursor-pointer ring-1 ring-rose-300/30'
                                : isBreakevenDay
                                ? 'bg-gradient-to-b from-amber-400/35 to-amber-600/40 text-amber-100 border-amber-400/50 shadow-[0_4px_14px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-md hover:scale-105 cursor-pointer ring-1 ring-amber-300/30'
                                : isToday
                                ? 'border-2 border-blue-500 bg-blue-600/20 font-bold text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                                : isDarkMode
                                ? 'border-[#202025] bg-[#121215] text-zinc-400 hover:bg-[#1a1a20]'
                                : 'border-slate-100 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`text-[11px] leading-tight ${
                              isProfitDay || isLossDay || isBreakevenDay ? 'font-black text-white drop-shadow-xs' : 'font-semibold'
                            }`}>
                              {day}
                            </span>

                            {isProfitDay && (
                              <span className="text-[7.5px] font-mono font-black text-emerald-100 leading-none mt-0.5 tracking-tight drop-shadow-xs">
                                +{dayTotalPnl >= 1000 ? `${(dayTotalPnl / 1000).toFixed(1)}k` : dayTotalPnl >= 100 ? Math.round(dayTotalPnl) : dayTotalPnl.toFixed(1)}
                              </span>
                            )}
                            {isLossDay && (
                              <span className="text-[7.5px] font-mono font-black text-rose-100 leading-none mt-0.5 tracking-tight drop-shadow-xs">
                                {dayTotalPnl <= -1000 ? `${(dayTotalPnl / 1000).toFixed(1)}k` : dayTotalPnl <= -100 ? Math.round(dayTotalPnl) : dayTotalPnl.toFixed(1)}
                              </span>
                            )}
                            {isBreakevenDay && (
                              <span className="text-[7px] font-mono font-black text-amber-100 leading-none mt-0.5 tracking-tight drop-shadow-xs">
                                BE
                              </span>
                            )}
                            {isToday && !hasTrades && (
                              <span className="text-[6.5px] font-black text-blue-400 uppercase tracking-widest leading-none mt-0.5">
                                NOW
                              </span>
                            )}
                          </div>
                          {isSunday && (
                            <div
                              title={`Weekly P&L: ${weekTotalPnl >= 0 ? '+' : ''}${weekTotalPnl.toFixed(2)} ${currencyLabel}`}
                              className={`h-9 sm:h-10 rounded-xl text-[9px] flex flex-col items-center justify-center font-mono text-center leading-tight transition border backdrop-blur-xs ${
                                hasWeekTrades && weekTotalPnl > 0
                                  ? isDarkMode ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 font-bold' : 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                                  : hasWeekTrades && weekTotalPnl < 0
                                  ? isDarkMode ? 'bg-rose-950/40 border-rose-700/50 text-rose-300 font-bold' : 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                                  : isDarkMode ? 'bg-[#18181d] border-[#222226] text-zinc-500' : 'bg-slate-100 border-slate-200 text-slate-500'
                              }`}
                            >
                              <span className="text-[7.5px] uppercase font-bold text-zinc-400 font-sans">WK</span>
                              <span className="font-extrabold text-[9px]">
                                {hasWeekTrades
                                  ? (weekTotalPnl > 0 ? `+${weekTotalPnl >= 100 ? Math.round(weekTotalPnl) : weekTotalPnl.toFixed(1)}` : weekTotalPnl.toFixed(1))
                                  : '0'}
                              </span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 pt-4 text-xs font-medium text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 border border-emerald-400/60 shadow-[0_2px_8px_rgba(16,185,129,0.35)] inline-block"></span>
                    <span className={`font-bold text-xs ${textHeading}`}>Profit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-lg bg-gradient-to-b from-rose-500 to-rose-700 border border-rose-400/60 shadow-[0_2px_8px_rgba(244,63,94,0.35)] inline-block"></span>
                    <span className={`font-bold text-xs ${textHeading}`}>Loss</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-lg bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-400/60 shadow-[0_2px_8px_rgba(245,158,11,0.35)] inline-block"></span>
                    <span className={`font-bold text-xs ${textHeading}`}>Breakeven</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-lg border-2 border-blue-500 bg-blue-600/30 inline-block"></span>
                    <span className="text-blue-400 text-xs font-semibold">Today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= TRADE HISTORY TABLE WITH SCREENSHOT BARS & REASON NOTEPAD ================= */}
            <div className={`p-6 rounded-2xl border theme-transition space-y-4 ${bgCard}`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${borderSubtle}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`font-extrabold text-sm tracking-tight ${textHeading}`}>Trade History</h3>
                    <p className={`text-[11px] font-medium ${textSubtle}`}>
                      {trades.length === 0 ? 'No past trades recorded' : `${trades.length} total closed transactions (saved in permanent memory)`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentTab('screenshots')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isDarkMode ? 'bg-[#1e1e24] border-[#2b2b33] text-amber-400 hover:bg-[#25252d]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>View All Screenshots ({trades.filter((t) => t.openScreenshot || t.closeScreenshot).length})</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase font-mono text-[10px] ${
                    isDarkMode ? 'bg-[#18181d] text-zinc-400' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3">Date / Time</th>
                      <th className="py-2.5 px-3">Pair</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Lots</th>
                      {/* Open Position */}
                      <th className="py-2.5 px-3">Open Position</th>
                      {/* Close Position */}
                      <th className="py-2.5 px-3">Close Position</th>
                      {/* Reason Column */}
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">P&L ({currencyLabel})</th>
                      <th className="py-2.5 px-3 text-center">Result</th>
                      <th className="py-2.5 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-medium ${isDarkMode ? 'divide-[#202025]' : 'divide-slate-100'}`}>
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-zinc-400 text-xs">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Clock className="w-6 h-6 text-zinc-500 stroke-[1.5]" />
                            <span className={`font-semibold ${textHeading}`}>No trade history recorded</span>
                            <span className={`text-[11px] ${textSubtle}`}>
                              Drop your Exness trade statement screenshot above to extract and apply all trades automatically!
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trades.map((t) => (
                        <tr key={t.id} className={`transition ${isDarkMode ? 'hover:bg-[#1a1a20]' : 'hover:bg-slate-50/60'}`}>
                          <td className="py-3 px-3 text-zinc-400 font-mono text-[11px]">{t.time}</td>
                          <td className={`py-3 px-3 font-bold ${textHeading}`}>{t.pair}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              t.type === 'BUY'
                                ? isDarkMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-100 text-emerald-800'
                                : isDarkMode ? 'bg-rose-950 text-rose-400 border border-rose-800/40' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className={`py-3 px-3 font-mono ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>{t.lots}</td>

                          {/* Open Price & Open Camera Button */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-400">{t.openPrice.toFixed(4)}</span>
                              {t.openScreenshot ? (
                                <button
                                  onClick={() => setLightboxImage({ url: t.openScreenshot!, title: `${t.pair} Open Chart` })}
                                  className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/60 cursor-pointer flex items-center justify-center transition shadow-xs"
                                  title="View Open Position Chart"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTriggerTableUpload(t.id, 'open')}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                                    isDarkMode
                                      ? 'bg-[#1e1e24] border-[#2b2b33] text-zinc-400 hover:text-blue-400 hover:border-blue-500'
                                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-500'
                                  }`}
                                  title="Attach Open Position Screenshot"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Close Price & Close Camera Button */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-zinc-400">{t.closePrice ? t.closePrice.toFixed(4) : '—'}</span>
                              {t.closeScreenshot ? (
                                <button
                                  onClick={() => setLightboxImage({ url: t.closeScreenshot!, title: `${t.pair} Close Chart` })}
                                  className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/60 cursor-pointer flex items-center justify-center transition shadow-xs"
                                  title="View Close Position Chart"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleTriggerTableUpload(t.id, 'close')}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                                    isDarkMode
                                      ? 'bg-[#1e1e24] border-[#2b2b33] text-zinc-400 hover:text-blue-400 hover:border-blue-500'
                                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-500'
                                  }`}
                                  title="Attach Close Position Screenshot"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Reason Column: simply shows clickable "Reason" button */}
                          <td className="py-3 px-3">
                            <button
                              onClick={() => handleOpenNotepad(t)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                t.notes
                                  ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 hover:bg-blue-600/25'
                                  : isDarkMode
                                  ? 'bg-[#1c1c22] border-[#2a2a30] text-zinc-400 hover:text-white hover:bg-[#24242c]'
                                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                              }`}
                              title="Click to open Notepad and write trade reason"
                            >
                              <FileText className="w-3 h-3 text-amber-400" />
                              <span>Reason</span>
                              {t.notes && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                            </button>
                          </td>

                          {/* Realized P&L */}
                          <td className={`py-3 px-3 text-right font-mono font-bold ${
                            t.pnl > 0 ? 'text-emerald-500' : t.pnl < 0 ? 'text-rose-500' : 'text-amber-400'
                          }`}>
                            {t.pnl === 0 ? `0.00 ${currencyLabel}` : formatCurrency(t.pnl)}
                          </td>

                          {/* Apple Ultra Liquid Glass Manual Result Options: Profit, Loss, Breakeven */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center p-1 rounded-2xl backdrop-blur-3xl bg-white/[0.08] dark:bg-black/55 border border-white/25 dark:border-white/15 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.4)] gap-1">
                              {/* Profit Option */}
                              <button
                                type="button"
                                onClick={() => handleSetTradeResult(t.id, 'PROFIT')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all duration-300 cursor-pointer ${
                                  t.result === 'PROFIT'
                                    ? 'bg-gradient-to-b from-emerald-400/60 via-emerald-500/50 to-emerald-700/70 text-white border border-emerald-300/80 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),0_0_20px_rgba(16,185,129,0.6)] backdrop-blur-3xl scale-105'
                                    : 'text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/15 border border-transparent'
                                }`}
                                title="Tap to select Profit"
                              >
                                Profit
                              </button>

                              {/* Loss Option */}
                              <button
                                type="button"
                                onClick={() => handleSetTradeResult(t.id, 'LOSS')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all duration-300 cursor-pointer ${
                                  t.result === 'LOSS'
                                    ? 'bg-gradient-to-b from-rose-400/60 via-rose-500/50 to-rose-700/70 text-white border border-rose-300/80 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),0_0_20px_rgba(244,63,94,0.6)] backdrop-blur-3xl scale-105'
                                    : 'text-zinc-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent'
                                }`}
                                title="Tap to select Loss"
                              >
                                Loss
                              </button>

                              {/* Breakeven Option */}
                              <button
                                type="button"
                                onClick={() => handleSetTradeResult(t.id, 'BREAKEVEN')}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all duration-300 cursor-pointer ${
                                  t.result === 'BREAKEVEN'
                                    ? 'bg-gradient-to-b from-amber-300/60 via-amber-500/50 to-amber-700/70 text-white border border-amber-300/80 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),0_0_20px_rgba(245,158,11,0.6)] backdrop-blur-3xl scale-105'
                                    : 'text-zinc-400 hover:text-amber-300 hover:bg-amber-500/15 border border-transparent'
                                }`}
                                title="Tap to select Breakeven"
                              >
                                Breakeven
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleDeleteTrade(t.id)}
                              className="p-1 text-zinc-500 hover:text-rose-500 transition cursor-pointer"
                              title="Remove trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ================= MINI NOTEPAD MODAL (FOR REASON) ================= */}
      {activeNotepadTrade && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`apple-liquid-modal max-w-lg w-full p-6 shadow-2xl ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${borderSubtle}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base flex items-center gap-2">
                    <span>Trade Reason Notepad</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
                      {activeNotepadTrade.pair} ({activeNotepadTrade.type})
                    </span>
                  </h3>
                  <p className={`text-xs ${textSubtle}`}>Write your entry strategy, psychology, or exit mistake</p>
                </div>
              </div>
              <button
                onClick={() => setActiveNotepadTrade(null)}
                className={`p-1.5 rounded-lg transition ${isDarkMode ? 'hover:bg-[#202028] text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotepad} className="space-y-4">
              {/* Quick Strategy Preset Pills */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Quick Strategy Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'ICT Silver Bullet',
                    'FVG Imbalance',
                    'Liquidity Sweep',
                    'Stop Loss hit in profit',
                    'Support Rejection',
                    'Trend Continuation',
                    'Break & Retest',
                    'News Volatility',
                    'FOMO Entry',
                    'Disciplined Exit',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setSelectedTag(tag);
                        if (!notepadText) setNotepadText(tag);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        selectedTag === tag
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                          : isDarkMode
                          ? 'bg-[#1b1b22] border-[#292932] text-zinc-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notepad Textarea */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Execution Reason & Trade Notes
                </label>
                <textarea
                  rows={5}
                  value={notepadText}
                  onChange={(e) => setNotepadText(e.target.value)}
                  placeholder="Write the reason why you took this trade, your confluences, entry timeframe, stop loss placement, or emotional state during execution..."
                  className={`w-full p-3.5 rounded-2xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed ${
                    isDarkMode ? 'bg-[#1a1a20] border-[#2a2a32] text-white placeholder-zinc-500' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveNotepadTrade(null)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isDarkMode ? 'bg-[#1e1e24] border-[#2b2b33] text-zinc-300 hover:bg-[#25252d]' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Reason</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <div className="max-w-5xl w-full flex items-center justify-between pb-3 text-white">
            <span className="font-extrabold text-sm">{lightboxImage.title}</span>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-1.5 rounded-xl apple-liquid-button text-white transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="apple-liquid-modal max-w-5xl max-h-[85vh] overflow-hidden p-2 shadow-2xl">
            <img
              src={lightboxImage.url}
              alt="Zoomed Chart"
              className="w-full h-full object-contain max-h-[82vh] rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* Google Cloud Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`apple-liquid-modal max-w-md w-full p-6 shadow-2xl ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-4 ${borderSubtle}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base">Worldwide Cloud Journal Sync</h3>
                  <p className={`text-xs ${textSubtle}`}>Access all your trades & balance from any phone worldwide</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGoogleModal(false);
                  setIsSwitchingAccount(false);
                }}
                className={`p-1.5 rounded-lg transition ${isDarkMode ? 'hover:bg-[#202028] text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {cloudSyncStatus && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs font-bold text-emerald-300">
                {cloudSyncStatus}
              </div>
            )}

            {googleUser && !isSwitchingAccount ? (
              <div className="space-y-4">
                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  isDarkMode ? 'bg-[#1a1a20] border-[#292930]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {googleUser.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm flex items-center gap-1.5">
                      <span>{googleUser.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className={`text-xs font-mono truncate ${textSubtle}`}>
                      {googleUser.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      CONNECTED
                    </span>
                  </div>
                </div>

                <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isDarkMode ? 'bg-[#191920] border-[#272730] text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Cloud Sync Status:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Auto-Sync Active
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Last synced: <span className="font-mono text-zinc-300">{lastSyncText}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-700/40">
                    💡 If you open this URL on another phone or computer, enter this exact same email and name to load all your trades and balance.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={handleManualSyncNow}
                    disabled={isManualSyncing}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-blue-600/30"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
                    <span>{isManualSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setInputEmail(googleUser.email);
                      setInputName(googleUser.name);
                      setIsSwitchingAccount(true);
                    }}
                    className={`py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      isDarkMode ? 'bg-[#202026] border-[#2f2f38] hover:bg-[#282832]' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch Email</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <button
                    onClick={handleExportBackup}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      isDarkMode ? 'bg-[#202026] border-[#2f2f38] hover:bg-[#282832]' : 'bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Export JSON</span>
                  </button>

                  <label className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    isDarkMode ? 'bg-[#202026] border-[#2f2f38] hover:bg-[#282832]' : 'bg-white border-slate-200 hover:bg-slate-100'
                  }`}>
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                  </label>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className={`text-[10px] ${textSubtle}`}>Data safely stored on cloud server</span>
                  <button
                    onClick={() => {
                      if (onGoogleLogout) onGoogleLogout();
                      setCloudSyncStatus('Logged out from Cloud sync.');
                      setTimeout(() => setCloudSyncStatus(null), 2000);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectGoogle} className="space-y-4">
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isDarkMode ? 'bg-blue-950/20 border-blue-800/40 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  🌍 <strong>Worldwide Cloud Access:</strong> Log in with your email and name. All your trades, balance, and notes will sync to the server. You can enter this same email & name on ANY phone or computer in the world to access your trading journal!
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-[#1d1d23] border-[#2f2f38] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wide mb-1.5 ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                    Trader Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? 'bg-[#1d1d23] border-[#2f2f38] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  {isSwitchingAccount && (
                    <button
                      type="button"
                      onClick={() => setIsSwitchingAccount(false)}
                      className={`py-3.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        isDarkMode ? 'bg-[#1d1d23] border-[#2f2f38] text-zinc-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isManualSyncing}
                    className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isManualSyncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>{isManualSyncing ? 'Connecting & Loading Cloud...' : 'Log In & Sync Across Devices'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
