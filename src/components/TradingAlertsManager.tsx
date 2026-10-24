import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  Square,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Radio,
  Sliders,
  CheckSquare,
  Square as SquareIcon,
  X,
  ChevronDown,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  AlertMarket,
  AlertCondition,
  AlertSound,
  AlertRepeat,
  TradingAlert,
  TriggeredAlertEvent,
  MarketPriceData,
} from '../types/alerts';
import { alertAudioManager } from '../utils/audioAlerts';
import { requestNotificationPermission, showSystemNotification } from '../utils/browserNotifications';
import {
  loadUserAlerts,
  saveUserAlert,
  deleteUserAlert,
  bulkSaveAlerts,
} from '../utils/alertsSync';
import { GoogleAccount } from '../App';

interface TradingAlertsManagerProps {
  prices: Record<AlertMarket, MarketPriceData>;
  priceDirections: Record<AlertMarket, 'up' | 'down' | 'neutral'>;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'offline';
  lastPriceUpdate: number;
  googleUser?: GoogleAccount | null;
  currencyLabel?: 'USD' | 'USC';
}

export const TradingAlertsManager: React.FC<TradingAlertsManagerProps> = ({
  prices,
  priceDirections,
  connectionStatus,
  lastPriceUpdate,
  googleUser,
}) => {
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [triggeredEvents, setTriggeredEvents] = useState<TriggeredAlertEvent[]>(() => {
    try {
      const saved = localStorage.getItem('tu_triggered_alert_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeTriggerBanner, setActiveTriggerBanner] = useState<TriggeredAlertEvent | null>(null);

  // Sound settings
  const [volume, setVolume] = useState<number>(alertAudioManager.settings.volume);
  const [isMuted, setIsMuted] = useState<boolean>(alertAudioManager.settings.masterMute);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(alertAudioManager.settings.quietHoursEnabled);
  const [quietStart, setQuietStart] = useState<string>(alertAudioManager.settings.quietHoursStart);
  const [quietEnd, setQuietEnd] = useState<string>(alertAudioManager.settings.quietHoursEnd);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled' | 'triggered'>('all');
  const [sortBy, setSortBy] = useState<'created_desc' | 'market_asc' | 'target_asc' | 'triggers_desc'>('created_desc');

  // Bulk selection
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState<string>('');
  const [formMarket, setFormMarket] = useState<AlertMarket>('XAUUSD');
  const [formCondition, setFormCondition] = useState<AlertCondition>('PRICE_ABOVE');
  const [formTargetPrice, setFormTargetPrice] = useState<string>('');
  const [formSound, setFormSound] = useState<AlertSound>('loud_alarm');
  const [formRepeat, setFormRepeat] = useState<AlertRepeat>('3_times');
  const [formNotes, setFormNotes] = useState<string>('');

  // Track previous prices to detect crossings
  const previousPricesRef = useRef<Record<AlertMarket, number>>({} as any);

  // Load user alerts from Firestore / localStorage
  useEffect(() => {
    loadUserAlerts(undefined, googleUser?.email || 'local').then((res) => {
      if (res.success && Array.isArray(res.alerts)) {
        setAlerts(res.alerts);
      }
    });
  }, [googleUser?.email]);

  // Audio manager listener
  useEffect(() => {
    alertAudioManager.setPlayingListener((playing) => {
      setIsPlayingAudio(playing);
    });
    return () => {
      alertAudioManager.stopSound();
    };
  }, []);

  // Save triggered history
  useEffect(() => {
    try {
      localStorage.setItem('tu_triggered_alert_history', JSON.stringify(triggeredEvents.slice(0, 100)));
    } catch {}
  }, [triggeredEvents]);

  // REAL-TIME ALERT MONITORING ENGINE
  useEffect(() => {
    if (!prices) return;

    alerts.forEach((alert) => {
      if (!alert.enabled) return;

      const currentMarketData = prices[alert.market];
      if (!currentMarketData || typeof currentMarketData.price !== 'number' || currentMarketData.price <= 0) return;

      const currentPrice = currentMarketData.price;
      const prevPrice = previousPricesRef.current[alert.market] ?? currentPrice;

      let isTriggered = false;
      const target = alert.targetPrice;

      switch (alert.condition) {
        case 'PRICE_ABOVE':
          if (currentPrice >= target && prevPrice < target) {
            isTriggered = true;
          }
          break;

        case 'PRICE_BELOW':
          if (currentPrice <= target && prevPrice > target) {
            isTriggered = true;
          }
          break;

        case 'CROSSING_LEVEL':
          if (
            (prevPrice < target && currentPrice >= target) ||
            (prevPrice > target && currentPrice <= target)
          ) {
            isTriggered = true;
          }
          break;

        case 'PCT_CHANGE_ABOVE':
          if (currentMarketData.changePercent >= target) {
            isTriggered = true;
          }
          break;

        case 'PCT_CHANGE_BELOW':
          if (currentMarketData.changePercent <= target) {
            isTriggered = true;
          }
          break;

        case 'DAILY_HIGH':
          if (currentPrice >= currentMarketData.high && currentMarketData.high > 0) {
            isTriggered = true;
          }
          break;

        case 'DAILY_LOW':
          if (currentPrice <= currentMarketData.low && currentMarketData.low > 0) {
            isTriggered = true;
          }
          break;

        default:
          break;
      }

      if (isTriggered) {
        // Prevent rapid duplicate triggers within 10 seconds for the same alert
        const now = Date.now();
        const lastTrigger = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).getTime() : 0;
        if (now - lastTrigger < 10000) return;

        const event: TriggeredAlertEvent = {
          id: `trig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          alertId: alert.id,
          alertName: alert.name,
          market: alert.market,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          triggeredPrice: currentPrice,
          triggeredAt: new Date().toLocaleTimeString(),
          sound: alert.sound,
          repeat: alert.repeat,
          acknowledged: false,
        };

        // 1. Play sound
        alertAudioManager.playAlert(alert.sound, alert.repeat);

        // 2. Set active on-screen trigger banner
        setActiveTriggerBanner(event);

        // 3. Browser notification
        showSystemNotification(`🚨 TRADING ALERT: ${alert.name} [${alert.market}]`, {
          body: `Market Price: ${currentPrice} hit target ${alert.targetPrice} (${alert.condition})`,
        });

        // 4. Update triggered event history
        setTriggeredEvents((prev) => [event, ...prev]);

        // 5. Update alert state in Firestore & state
        const updatedAlert: TradingAlert = {
          ...alert,
          triggerCount: (alert.triggerCount || 0) + 1,
          lastTriggeredAt: new Date().toISOString(),
          lastTriggeredPrice: currentPrice,
          lastObservedPrice: currentPrice,
          // If repeat is '1_time' and not continuous, keep enabled or user can review
        };

        setAlerts((prevList) => {
          const next = prevList.map((a) => (a.id === alert.id ? updatedAlert : a));
          saveUserAlert(undefined, googleUser?.email || 'local', updatedAlert);
          return next;
        });
      }
    });

    // Update previous prices record
    (Object.keys(prices) as AlertMarket[]).forEach((m) => {
      if (prices[m]?.price) {
        previousPricesRef.current[m] = prices[m].price;
      }
    });
  }, [prices, alerts, googleUser?.email]);

  // Open modal for Create
  const handleOpenCreateModal = (defaultMarket?: AlertMarket) => {
    alertAudioManager.unlockAudio();
    requestNotificationPermission().catch(() => {});

    const chosenMarket = defaultMarket || 'XAUUSD';
    const currentP = prices[chosenMarket]?.price || 4000;

    setEditingAlertId(null);
    setFormMarket(chosenMarket);
    setFormName(`${chosenMarket} Target Alert`);
    setFormCondition('PRICE_ABOVE');
    setFormTargetPrice((currentP * 1.005).toFixed(2));
    setFormSound('loud_alarm');
    setFormRepeat('3_times');
    setFormNotes('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (alert: TradingAlert) => {
    alertAudioManager.unlockAudio();
    setEditingAlertId(alert.id);
    setFormMarket(alert.market);
    setFormName(alert.name);
    setFormCondition(alert.condition);
    setFormTargetPrice(alert.targetPrice.toString());
    setFormSound(alert.sound);
    setFormRepeat(alert.repeat);
    setFormNotes(alert.notes || '');
    setIsModalOpen(true);
  };

  // Save Create / Edit
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(formTargetPrice);
    if (isNaN(targetVal)) return;

    if (editingAlertId) {
      // Edit existing
      setAlerts((prev) => {
        const next = prev.map((a) => {
          if (a.id === editingAlertId) {
            const updated: TradingAlert = {
              ...a,
              name: formName.trim() || `${formMarket} Alert`,
              market: formMarket,
              condition: formCondition,
              targetPrice: targetVal,
              sound: formSound,
              repeat: formRepeat,
              notes: formNotes.trim(),
            };
            saveUserAlert(undefined, googleUser?.email || 'local', updated);
            return updated;
          }
          return a;
        });
        return next;
      });
    } else {
      // Create new (Unlimited!)
      const newAlert: TradingAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: formName.trim() || `${formMarket} Price Alert`,
        market: formMarket,
        condition: formCondition,
        targetPrice: targetVal,
        sound: formSound,
        repeat: formRepeat,
        enabled: true,
        notes: formNotes.trim(),
        createdAt: new Date().toISOString(),
        triggerCount: 0,
        lastObservedPrice: prices[formMarket]?.price,
      };

      setAlerts((prev) => {
        const next = [newAlert, ...prev];
        saveUserAlert(undefined, googleUser?.email || 'local', newAlert);
        return next;
      });
    }

    setIsModalOpen(false);
  };

  // Toggle single alert enable/disable
  const handleToggleAlert = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAlerts((prev) => {
      const next = prev.map((a) => {
        if (a.id === id) {
          const updated = { ...a, enabled: !a.enabled };
          saveUserAlert(undefined, googleUser?.email || 'local', updated);
          return updated;
        }
        return a;
      });
      return next;
    });
  };

  // Duplicate an alert
  const handleDuplicateAlert = (alert: TradingAlert, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const duplicated: TradingAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${alert.name} (Copy)`,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
      lastTriggeredAt: undefined,
      lastTriggeredPrice: undefined,
      enabled: true,
    };
    setAlerts((prev) => {
      const next = [duplicated, ...prev];
      saveUserAlert(undefined, googleUser?.email || 'local', duplicated);
      return next;
    });
  };

  // Delete single alert
  const handleDeleteAlert = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      deleteUserAlert(undefined, googleUser?.email || 'local', id);
      return next;
    });
    setSelectedAlertIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedAlertIds.size === filteredAlerts.length) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(filteredAlerts.map((a) => a.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedAlertIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkEnable = (enable: boolean) => {
    setAlerts((prev) => {
      const next = prev.map((a) => (selectedAlertIds.has(a.id) ? { ...a, enabled: enable } : a));
      bulkSaveAlerts(undefined, googleUser?.email || 'local', next);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedAlertIds.size} selected alerts?`)) {
      setAlerts((prev) => {
        const next = prev.filter((a) => !selectedAlertIds.has(a.id));
        selectedAlertIds.forEach((id) => {
          deleteUserAlert(undefined, googleUser?.email || 'local', id);
        });
        return next;
      });
      setSelectedAlertIds(new Set());
    }
  };

  // Filtered & Sorted Alerts
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (marketFilter !== 'all' && a.market !== marketFilter) return false;
        if (statusFilter === 'enabled' && !a.enabled) return false;
        if (statusFilter === 'disabled' && a.enabled) return false;
        if (statusFilter === 'triggered' && (!a.triggerCount || a.triggerCount === 0)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = a.name.toLowerCase().includes(q);
          const matchMarket = a.market.toLowerCase().includes(q);
          const matchNotes = (a.notes || '').toLowerCase().includes(q);
          if (!matchName && !matchMarket && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'created_desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'market_asc') {
          return a.market.localeCompare(b.market);
        }
        if (sortBy === 'target_asc') {
          return a.targetPrice - b.targetPrice;
        }
        if (sortBy === 'triggers_desc') {
          return (b.triggerCount || 0) - (a.triggerCount || 0);
        }
        return 0;
      });
  }, [alerts, marketFilter, statusFilter, searchQuery, sortBy]);

  // Audio settings handlers
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    alertAudioManager.updateSettings({ volume: newVol });
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    alertAudioManager.updateSettings({ masterMute: next });
    if (next) alertAudioManager.stopSound();
  };

  const handleTestSound = (sound: AlertSound) => {
    alertAudioManager.unlockAudio();
    alertAudioManager.playAlert(sound, '1_time', true);
  };

  const handleStopSound = () => {
    alertAudioManager.stopSound();
    setActiveTriggerBanner(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ================= 1. ACTIVE TRIGGER ALARM BANNER (CRITICAL) ================= */}
      {activeTriggerBanner && (
        <div className="apple-liquid-card p-5 border-2 border-rose-500 bg-rose-950/70 text-rose-100 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_40px_rgba(244,63,94,0.45)] animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/50">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500 text-white">
                  ALERT TRIGGERED NOW!
                </span>
                <span className="font-mono text-xs opacity-80">{activeTriggerBanner.triggeredAt}</span>
              </div>
              <h3 className="text-lg font-black tracking-tight mt-0.5">
                {activeTriggerBanner.alertName} • {activeTriggerBanner.market}
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Current Price: <strong className="font-mono text-white text-sm">{activeTriggerBanner.triggeredPrice}</strong> (Target: {activeTriggerBanner.targetPrice} | {activeTriggerBanner.condition.replace('_', ' ')})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStopSound}
              className="px-6 py-3 rounded-2xl bg-white text-rose-700 font-black text-xs hover:bg-rose-100 cursor-pointer transition shadow-lg flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-rose-700" />
              <span>STOP SOUND</span>
            </button>
            <button
              onClick={() => setActiveTriggerBanner(null)}
              className="p-2.5 rounded-xl border border-rose-400/40 text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= 2. LIVE REAL-TIME MARKET TICKER BAR ================= */}
      <div className="apple-liquid-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-tight text-white">Live Market Tickers</h3>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full border ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                }`}>
                  ● {connectionStatus === 'connected' ? 'LIVE STREAMING' : connectionStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Verified price feeds with sub-second WebSocket ticks. Click any market to set an instant alert.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="apple-liquid-primary px-4 py-2 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Trading Alert</span>
            </button>
          </div>
        </div>

        {/* 6 Core Market Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(['XAUUSD', 'US OIL', 'NASDAQ', 'BTCUSD', 'ETHUSD', 'US30'] as AlertMarket[]).map((market) => {
            const data = prices[market];
            const direction = priceDirections[market];
            const isProfit = (data?.changePercent || 0) >= 0;

            return (
              <div
                key={market}
                onClick={() => handleOpenCreateModal(market)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] ${
                  direction === 'up'
                    ? 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : direction === 'down'
                    ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : 'apple-liquid-glass hover:border-blue-500/60'
                }`}
                title={`Click to set alert for ${market}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-white">{market}</span>
                  <span className={`text-[10px] font-mono font-bold flex items-center ${
                    isProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isProfit ? '+' : ''}{data?.changePercent?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-base font-mono font-black text-white mt-1">
                  {data?.price ? data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-0.5">
                  <span>H: {data?.high?.toFixed(1) || '—'}</span>
                  <span>L: {data?.low?.toFixed(1) || '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 3. AUDIO CONTROLS & ALERT BAR ================= */}
      <div className="apple-liquid-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Master Sound Button & Indicator */}
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isMuted
                ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            <span>{isMuted ? 'Alert Sounds Muted' : 'Loud Sounds Active'}</span>
          </button>

          {/* Volume Slider */}
          <div className="flex items-center gap-2 apple-liquid-glass px-3 py-1 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Vol:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-blue-500 cursor-pointer h-1.5"
            />
            <span className="font-mono text-[10px] font-bold text-white">{Math.round(volume * 100)}%</span>
          </div>

          {/* Stop Sound button if playing */}
          {isPlayingAudio && (
            <button
              onClick={handleStopSound}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 animate-pulse cursor-pointer shadow-lg shadow-rose-600/40"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>STOP SOUND NOW</span>
            </button>
          )}

          {/* Quick Sound Test button */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-zinc-400">Test Tone:</span>
            {(['loud_alarm', 'sonar_ping', 'chime_bell'] as AlertSound[]).map((s) => (
              <button
                key={s}
                onClick={() => handleTestSound(s)}
                className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center gap-1"
                title={`Preview ${s.replace('_', ' ')}`}
              >
                <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                <span>{s.split('_')[0].toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats counters */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border border-white/10 text-xs flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Total Alerts:</span>
            <span className="font-mono font-black text-white">{alerts.length}</span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 rounded border border-emerald-800/40">
              UNLIMITED
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-white/10 text-xs flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Active Monitoring:</span>
            <span className="font-mono font-bold text-emerald-400">{alerts.filter((a) => a.enabled).length}</span>
          </div>
        </div>
      </div>

      {/* ================= 4. UNLIMITED ALERTS LIST TABLE & MANAGEMENT ================= */}
      <div className="apple-liquid-card p-6 space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search alerts by name, instrument, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl apple-liquid-glass text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Filter by Market */}
            <select
              value={marketFilter}
              onChange={(e) => setMarketFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-white/10 apple-liquid-glass text-xs font-semibold text-zinc-200 focus:outline-none"
            >
              <option value="all">All Markets ({alerts.length})</option>
              {['XAUUSD', 'US OIL', 'NASDAQ', 'BTCUSD', 'ETHUSD', 'US30'].map((m) => (
                <option key={m} value={m}>
                  {m} ({alerts.filter((a) => a.market === m).length})
                </option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-white/10 apple-liquid-glass text-xs font-semibold text-zinc-200 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="enabled">Active Only ({alerts.filter((a) => a.enabled).length})</option>
              <option value="disabled">Paused Only ({alerts.filter((a) => !a.enabled).length})</option>
              <option value="triggered">Triggered ({alerts.filter((a) => a.triggerCount > 0).length})</option>
            </select>

            {/* Sort by */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-white/10 apple-liquid-glass text-xs font-semibold text-zinc-200 focus:outline-none"
            >
              <option value="created_desc">Newest First</option>
              <option value="market_asc">Market (A-Z)</option>
              <option value="target_asc">Target Price</option>
              <option value="triggers_desc">Most Triggered</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Controls if items selected */}
        {selectedAlertIds.size > 0 && (
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-blue-300">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>{selectedAlertIds.size} alerts selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkEnable(true)}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
              >
                Enable All
              </button>
              <button
                onClick={() => handleBulkEnable(false)}
                className="px-3 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-bold cursor-pointer"
              >
                Disable All
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Alerts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="uppercase font-mono text-[10px] bg-white/5 text-zinc-400">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button onClick={handleSelectAll} className="cursor-pointer text-zinc-400 hover:text-white">
                    {selectedAlertIds.size === filteredAlerts.length && filteredAlerts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <SquareIcon className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Alert Name</th>
                <th className="py-2.5 px-3">Market</th>
                <th className="py-2.5 px-3">Condition</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 px-3 text-right">Current Price</th>
                <th className="py-2.5 px-3">Sound & Repeat</th>
                <th className="py-2.5 px-3 text-center">Triggers</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-medium">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Bell className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <span className="font-bold text-sm text-white">No trading alerts found</span>
                      <p className="text-xs text-zinc-400 max-w-sm">
                        Create unlimited price alerts for XAUUSD, US OIL, NASDAQ, BTCUSD, ETHUSD, and US30 with real-time audio!
                      </p>
                      <button
                        onClick={() => handleOpenCreateModal()}
                        className="mt-2 apple-liquid-primary px-4 py-2 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Your First Alert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isSelected = selectedAlertIds.has(alert.id);
                  const currentMarketData = prices[alert.market];
                  const livePrice = currentMarketData?.price;
                  const diff = livePrice ? alert.targetPrice - livePrice : 0;
                  const diffPct = livePrice ? (diff / livePrice) * 100 : 0;

                  return (
                    <tr
                      key={alert.id}
                      className={`transition ${
                        isSelected ? 'bg-blue-600/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleSelectRow(alert.id)}
                          className="cursor-pointer text-zinc-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <SquareIcon className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Enable/Disable Toggle */}
                      <td className="py-3 px-3">
                        <button
                          onClick={(e) => handleToggleAlert(alert.id, e)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            alert.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                          }`}
                          title={alert.enabled ? 'Click to pause alert' : 'Click to enable alert'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              alert.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Name & Notes */}
                      <td className="py-3 px-3">
                        <div className="font-black text-white text-xs">{alert.name}</div>
                        {alert.notes && <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">{alert.notes}</div>}
                      </td>

                      {/* Market Pill */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                          {alert.market}
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-bold text-zinc-300">
                          {alert.condition === 'PRICE_ABOVE' && '▲ Price Above'}
                          {alert.condition === 'PRICE_BELOW' && '▼ Price Below'}
                          {alert.condition === 'CROSSING_LEVEL' && '⇄ Crosses Level'}
                          {alert.condition === 'PCT_CHANGE_ABOVE' && '📈 % Change >'}
                          {alert.condition === 'PCT_CHANGE_BELOW' && '📉 % Change <'}
                          {alert.condition === 'DAILY_HIGH' && '★ Daily High'}
                          {alert.condition === 'DAILY_LOW' && '★ Daily Low'}
                        </span>
                      </td>

                      {/* Target Price */}
                      <td className="py-3 px-3 text-right font-mono font-black text-amber-400">
                        {alert.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <div className="text-[10px] text-zinc-400 font-sans">
                          {diff > 0 ? `+${diff.toFixed(2)} away` : `${diff.toFixed(2)} passed`}
                        </div>
                      </td>

                      {/* Current Live Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {livePrice ? livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                        <div className={`text-[10px] ${diffPct >= 0 ? 'text-zinc-400' : 'text-emerald-400'}`}>
                          {diffPct >= 0 ? `${diffPct.toFixed(1)}% to hit` : 'Target reached'}
                        </div>
                      </td>

                      {/* Sound & Repeat */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleTestSound(alert.sound)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-amber-400 cursor-pointer"
                            title="Preview sound"
                          >
                            <Play className="w-3 h-3 fill-amber-400" />
                          </button>
                          <span className="text-[11px] text-zinc-300 font-medium capitalize">
                            {alert.sound.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono px-1 rounded bg-white/5 text-zinc-400">
                            {alert.repeat === 'continuous' ? 'Loop' : alert.repeat.replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      {/* Trigger Count */}
                      <td className="py-3 px-3 text-center">
                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                          alert.triggerCount > 0
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                            : 'bg-white/5 text-zinc-500'
                        }`}>
                          {alert.triggerCount || 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(alert)}
                            className="p-1.5 text-zinc-400 hover:text-blue-400 transition cursor-pointer rounded-lg hover:bg-white/5"
                            title="Edit Alert"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateAlert(alert, e)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 transition cursor-pointer rounded-lg hover:bg-white/5"
                            title="Duplicate Alert"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteAlert(alert.id, e)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 transition cursor-pointer rounded-lg hover:bg-white/5"
                            title="Delete Alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 5. TRIGGERED ALERT EVENT HISTORY LOG ================= */}
      {triggeredEvents.length > 0 && (
        <div className="apple-liquid-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="font-black text-sm text-white">Triggered Alert History ({triggeredEvents.length})</h4>
            </div>
            <button
              onClick={() => setTriggeredEvents([])}
              className="text-[11px] font-bold text-zinc-400 hover:text-rose-400 cursor-pointer"
            >
              Clear Log History
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {triggeredEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-xl border border-white/10 apple-liquid-glass flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div>
                    <span className="font-black text-white">{evt.alertName}</span>{' '}
                    <span className="font-mono text-[10px] text-blue-400">[{evt.market}]</span>
                    <span className="text-zinc-400 text-[11px] ml-2">
                      Target {evt.targetPrice} hit at <strong className="font-mono text-white">{evt.triggeredPrice}</strong>
                    </span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-zinc-400">{evt.triggeredAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 6. CREATE / EDIT ALERT MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="apple-liquid-modal max-w-lg w-full p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingAlertId ? 'Edit Trading Alert' : 'Create Unlimited Alert'}
                  </h3>
                  <p className="text-xs text-zinc-400">Saved permanently to your verified account</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Alert Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300 mb-1">
                  Alert Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Gold Resistance Breakout"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Instrument & Condition Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Market Instrument */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300 mb-1">
                    Market Instrument
                  </label>
                  <select
                    value={formMarket}
                    onChange={(e) => {
                      const m = e.target.value as AlertMarket;
                      setFormMarket(m);
                      const cur = prices[m]?.price;
                      if (cur) setFormTargetPrice(cur.toFixed(2));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass text-sm text-white font-mono font-bold focus:outline-none"
                  >
                    <option value="XAUUSD">XAUUSD (Gold / USD)</option>
                    <option value="US OIL">US OIL (Crude WTI)</option>
                    <option value="NASDAQ">NASDAQ (US Tech 100)</option>
                    <option value="BTCUSD">BTCUSD (Bitcoin)</option>
                    <option value="ETHUSD">ETHUSD (Ethereum)</option>
                    <option value="US30">US30 (Dow Jones 30)</option>
                  </select>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300 mb-1">
                    Trigger Condition
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as AlertCondition)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass text-sm text-white font-semibold focus:outline-none"
                  >
                    <option value="PRICE_ABOVE">Price Rises Above (≥)</option>
                    <option value="PRICE_BELOW">Price Drops Below (≤)</option>
                    <option value="CROSSING_LEVEL">Price Crosses Level (⇄)</option>
                    <option value="PCT_CHANGE_ABOVE">% Change Rises Above</option>
                    <option value="PCT_CHANGE_BELOW">% Change Drops Below</option>
                    <option value="DAILY_HIGH">New 24h Daily High</option>
                    <option value="DAILY_LOW">New 24h Daily Low</option>
                  </select>
                </div>
              </div>

              {/* Target Price with quick nudge buttons */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-zinc-300">
                    Target Price / Level
                  </label>
                  <span className="text-xs font-mono text-zinc-400">
                    Live: <strong className="text-white">{prices[formMarket]?.price || '—'}</strong>
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  value={formTargetPrice}
                  onChange={(e) => setFormTargetPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass font-mono font-black text-base text-amber-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Quick Level Presets */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-zinc-400">Quick:</span>
                  {[
                    { label: 'Current', factor: 1 },
                    { label: '+0.5%', factor: 1.005 },
                    { label: '+1.0%', factor: 1.01 },
                    { label: '-0.5%', factor: 0.995 },
                    { label: '-1.0%', factor: 0.99 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const cur = prices[formMarket]?.price || 100;
                        setFormTargetPrice((cur * p.factor).toFixed(2));
                      }}
                      className="px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound & Repeat Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Alert Sound */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wide text-zinc-300">
                      Alert Sound
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTestSound(formSound)}
                      className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-amber-400" />
                      <span>Test Sound</span>
                    </button>
                  </div>
                  <select
                    value={formSound}
                    onChange={(e) => setFormSound(e.target.value as AlertSound)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass text-xs text-white font-semibold focus:outline-none"
                  >
                    <option value="loud_alarm">Loud Alarm Tone (Urgent)</option>
                    <option value="emergency_siren">Emergency Siren (Oscillating)</option>
                    <option value="sonar_ping">Sonar Ping (Deep Resonance)</option>
                    <option value="chime_bell">Chime Bell (Crystal Harmonic)</option>
                    <option value="cyber_radar">Cyber Radar (Pulse Sweep)</option>
                  </select>
                </div>

                {/* Repeat Behavior */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300 mb-1">
                    Repeat Behavior
                  </label>
                  <select
                    value={formRepeat}
                    onChange={(e) => setFormRepeat(e.target.value as AlertRepeat)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 apple-liquid-glass text-xs text-white font-semibold focus:outline-none"
                  >
                    <option value="1_time">Play 1 Time</option>
                    <option value="3_times">Repeat 3 Times (Standard)</option>
                    <option value="5_times">Repeat 5 Times (Persistent)</option>
                    <option value="continuous">Continuous Repeat Until Stopped</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-300 mb-1">
                  Trade Notes / Strategy Reference
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Wait for 15M candle close before entering SELL"
                  className="w-full px-3.5 py-2 rounded-xl border border-white/10 apple-liquid-glass text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="apple-liquid-primary px-6 py-2.5 font-black text-xs cursor-pointer shadow-md"
                >
                  {editingAlertId ? 'Update Alert' : 'Save & Activate Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
