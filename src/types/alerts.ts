export type AlertMarket = 'XAUUSD' | 'US OIL' | 'NASDAQ' | 'BTCUSD' | 'ETHUSD' | 'US30';

export type AlertCondition =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'CROSSING_LEVEL'
  | 'PCT_CHANGE_ABOVE'
  | 'PCT_CHANGE_BELOW'
  | 'DAILY_HIGH'
  | 'DAILY_LOW';

export type AlertSound =
  | 'loud_alarm'
  | 'emergency_siren'
  | 'sonar_ping'
  | 'chime_bell'
  | 'cyber_radar';

export type AlertRepeat = '1_time' | '3_times' | '5_times' | 'continuous';

export interface MarketPriceData {
  symbol: AlertMarket;
  name: string;
  price: number;
  high: number;
  low: number;
  prevClose: number;
  changePercent: number;
  precision: number;
  lastUpdated?: number;
}

export interface TradingAlert {
  id: string;
  userId?: string;
  name: string;
  market: AlertMarket;
  condition: AlertCondition;
  targetPrice: number; // Target price or target % depending on condition
  sound: AlertSound;
  repeat: AlertRepeat;
  enabled: boolean;
  notes?: string;
  createdAt: string;
  lastTriggeredAt?: string;
  lastTriggeredPrice?: number;
  triggerCount: number;
  lastObservedPrice?: number;
}

export interface TriggeredAlertEvent {
  id: string;
  alertId: string;
  alertName: string;
  market: AlertMarket;
  condition: AlertCondition;
  targetPrice: number;
  triggeredPrice: number;
  triggeredAt: string;
  sound: AlertSound;
  repeat: AlertRepeat;
  acknowledged: boolean;
}

export interface AlertSoundSettings {
  masterMute: boolean;
  volume: number; // 0.0 to 1.0
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
}
