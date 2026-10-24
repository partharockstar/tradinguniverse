import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertMarket, MarketPriceData } from '../types/alerts';

export const INITIAL_MARKET_PRICES: Record<AlertMarket, MarketPriceData> = {
  'XAUUSD': { symbol: 'XAUUSD', name: 'Gold / USD', price: 4007.9, high: 4050.2, low: 3989.1, prevClose: 4060.4, changePercent: -1.29, precision: 2 },
  'US OIL': { symbol: 'US OIL', name: 'Crude Oil (WTI)', price: 103.27, high: 103.92, low: 98.84, prevClose: 101.5, changePercent: 1.74, precision: 2 },
  'NASDAQ': { symbol: 'NASDAQ', name: 'US Tech 100', price: 29117.75, high: 29326.0, low: 28987.0, prevClose: 29200.0, changePercent: -0.28, precision: 2 },
  'BTCUSD': { symbol: 'BTCUSD', name: 'Bitcoin', price: 80747.99, high: 81079.98, low: 80530.26, prevClose: 80100.0, changePercent: 0.81, precision: 2 },
  'ETHUSD': { symbol: 'ETHUSD', name: 'Ethereum', price: 2377.65, high: 2385.42, low: 2368.58, prevClose: 2350.0, changePercent: 1.18, precision: 2 },
  'US30': { symbol: 'US30', name: 'Wall Street 30', price: 52394.0, high: 53166.0, low: 52234.0, prevClose: 52500.0, changePercent: -0.2, precision: 2 },
};

export function useMarketPrices() {
  const [prices, setPrices] = useState<Record<AlertMarket, MarketPriceData>>(INITIAL_MARKET_PRICES);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'reconnecting' | 'offline'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [priceDirections, setPriceDirections] = useState<Record<AlertMarket, 'up' | 'down' | 'neutral'>>({
    'XAUUSD': 'neutral',
    'US OIL': 'neutral',
    'NASDAQ': 'neutral',
    'BTCUSD': 'neutral',
    'ETHUSD': 'neutral',
    'US30': 'neutral',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchRestPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/market-prices');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.prices && isMountedRef.current) {
          setPrices((prev) => {
            const next = { ...prev };
            const newDirections = { ...priceDirections };

            (Object.keys(json.prices) as AlertMarket[]).forEach((sym) => {
              const item = json.prices[sym];
              if (item && typeof item.price === 'number') {
                const oldPrice = prev[sym]?.price;
                if (oldPrice !== undefined) {
                  if (item.price > oldPrice) newDirections[sym] = 'up';
                  else if (item.price < oldPrice) newDirections[sym] = 'down';
                }
                next[sym] = {
                  ...prev[sym],
                  ...item,
                  lastUpdated: Date.now(),
                };
              }
            });

            setPriceDirections(newDirections);
            setTimeout(() => {
              if (isMountedRef.current) {
                setPriceDirections({
                  'XAUUSD': 'neutral',
                  'US OIL': 'neutral',
                  'NASDAQ': 'neutral',
                  'BTCUSD': 'neutral',
                  'ETHUSD': 'neutral',
                  'US30': 'neutral',
                });
              }
            }, 800);

            return next;
          });
          setConnectionStatus('connected');
          setLastUpdate(Date.now());
        }
      }
    } catch {
      if (isMountedRef.current) {
        setConnectionStatus('reconnecting');
      }
    }
  }, [priceDirections]);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Initial REST fetch
    fetchRestPrices();

    // 2. Poll commodities and indices every 2.5s
    pollTimerRef.current = setInterval(() => {
      fetchRestPrices();
    }, 2500);

    // 3. Binance direct WebSocket streaming for BTC & ETH
    const connectCryptoWs = () => {
      try {
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker');
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMountedRef.current) setConnectionStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (!data || !data.s) return;

            const sym: AlertMarket | null =
              data.s === 'BTCUSDT' ? 'BTCUSD' : data.s === 'ETHUSDT' ? 'ETHUSD' : null;

            if (sym) {
              const livePrice = parseFloat(data.c);
              const high = parseFloat(data.h);
              const low = parseFloat(data.l);
              const chg = parseFloat(data.P);
              const prev = parseFloat(data.x);

              if (!isNaN(livePrice) && livePrice > 0) {
                setPrices((prevMap) => {
                  const oldP = prevMap[sym]?.price;
                  if (oldP !== undefined && oldP !== livePrice) {
                    setPriceDirections((dirs) => ({
                      ...dirs,
                      [sym]: livePrice > oldP ? 'up' : 'down',
                    }));
                  }
                  return {
                    ...prevMap,
                    [sym]: {
                      ...prevMap[sym],
                      price: livePrice,
                      high: !isNaN(high) ? high : prevMap[sym].high,
                      low: !isNaN(low) ? low : prevMap[sym].low,
                      prevClose: !isNaN(prev) ? prev : prevMap[sym].prevClose,
                      changePercent: !isNaN(chg) ? chg : prevMap[sym].changePercent,
                      lastUpdated: Date.now(),
                    },
                  };
                });
                setLastUpdate(Date.now());
              }
            }
          } catch {}
        };

        ws.onerror = () => {
          if (isMountedRef.current) setConnectionStatus('reconnecting');
        };

        ws.onclose = () => {
          // Reconnect after 3s
          if (isMountedRef.current) {
            setTimeout(connectCryptoWs, 3000);
          }
        };
      } catch {
        // Fallback to REST only
      }
    };

    connectCryptoWs();

    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [fetchRestPrices]);

  return {
    prices,
    priceDirections,
    connectionStatus,
    lastUpdate,
    refreshNow: fetchRestPrices,
  };
}
