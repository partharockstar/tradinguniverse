export interface CurrencyPair {
  id: string;
  symbol: string;
  name: string;
  base: string;
  quote: string;
  bid: number;
  ask: number;
  spread: number;
  digits: number;
  change24h: number;
  changePips: number;
  high24h: number;
  low24h: number;
  category: 'major' | 'minor' | 'commodity' | 'crypto';
  sparkline: number[];
  sentimentLong: number;
}

export interface EconomicEvent {
  id: string;
  time: string;
  date: string;
  currency: string;
  country: string;
  flag: string;
  title: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
  actual?: string;
  outcome?: 'better' | 'worse' | 'neutral';
}

export interface VerifiedSystem {
  id: string;
  name: string;
  author: string;
  authorAvatar: string;
  broker: string;
  gain: number;
  monthlyGain: number;
  drawdown: number;
  profitFactor: number;
  winRate: number;
  trades: number;
  balance: number;
  verified: boolean;
  style: 'Scalp' | 'Day Trading' | 'Swing' | 'Algo EA' | 'Price Action';
  equityCurve: number[];
}

export interface TradeLog {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  closePrice: number;
  pips: number;
  pnl: number;
  strategy: string;
  date: string;
  status: 'CLOSED' | 'OPEN';
}
