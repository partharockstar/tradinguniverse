import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { getUserCloudData, saveUserCloudData, deleteUserCloudData } from './server/cloudStorage';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Cloud sync endpoints for worldwide cross-device persistence
app.get('/api/cloud-sync/load', async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required' });
    }
    const profile = await getUserCloudData(email);
    if (!profile) {
      return res.json({ success: true, exists: false, message: 'No cloud data found for this email' });
    }
    return res.json({ success: true, exists: true, data: profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error loading cloud data' });
  }
});

app.post('/api/cloud-sync/save', async (req, res) => {
  try {
    const { email, name, userConfig, trades, balance, avatar, currency } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const saved = await saveUserCloudData({ email, name, userConfig, trades, balance, avatar, currency });
    return res.json({
      success: true,
      savedAt: saved.updatedAt,
      tradesCount: saved.trades?.length || 0,
      data: saved,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error saving cloud data' });
  }
});

app.post('/api/cloud-sync/delete', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const deleted = await deleteUserCloudData(email);
    return res.json({ success: true, deleted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error deleting cloud data' });
  }
});

// Cache for live market prices
let marketPricesCache: any = {
  timestamp: 0,
  data: {
    'XAUUSD': { symbol: 'XAUUSD', name: 'Gold / USD', price: 4007.9, high: 4050.2, low: 3989.1, prevClose: 4060.4, changePercent: -1.29, precision: 2 },
    'US OIL': { symbol: 'US OIL', name: 'Crude Oil (WTI)', price: 103.27, high: 103.92, low: 98.84, prevClose: 101.5, changePercent: 1.74, precision: 2 },
    'NASDAQ': { symbol: 'NASDAQ', name: 'US Tech 100', price: 29117.75, high: 29326.0, low: 28987.0, prevClose: 29200.0, changePercent: -0.28, precision: 2 },
    'BTCUSD': { symbol: 'BTCUSD', name: 'Bitcoin', price: 80747.99, high: 81079.98, low: 80530.26, prevClose: 80100.0, changePercent: 0.81, precision: 2 },
    'ETHUSD': { symbol: 'ETHUSD', name: 'Ethereum', price: 2377.65, high: 2385.42, low: 2368.58, prevClose: 2350.0, changePercent: 1.18, precision: 2 },
    'US30': { symbol: 'US30', name: 'Wall Street 30', price: 52394.0, high: 53166.0, low: 52234.0, prevClose: 52500.0, changePercent: -0.2, precision: 2 },
  },
};

// Live real-time market data endpoint for the 6 core markets
app.get('/api/market-prices', async (_req, res) => {
  const now = Date.now();
  // 1.5s caching prevents rate-limiting while providing near-instant streaming rates
  if (now - marketPricesCache.timestamp < 1500) {
    return res.json({ success: true, timestamp: marketPricesCache.timestamp, prices: marketPricesCache.data });
  }

  const yahooSymbols: Record<string, string> = {
    'XAUUSD': 'GC=F',
    'US OIL': 'CL=F',
    'NASDAQ': 'NQ=F',
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'US30': 'YM=F',
  };

  try {
    // 1. Crypto fast-fetch via Binance
    try {
      const cryptoRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D');
      if (cryptoRes.ok) {
        const cryptoData: any[] = await cryptoRes.json();
        cryptoData.forEach((item) => {
          if (item.symbol === 'BTCUSDT') {
            const p = parseFloat(item.lastPrice);
            if (!isNaN(p) && p > 0) {
              marketPricesCache.data['BTCUSD'] = {
                symbol: 'BTCUSD',
                name: 'Bitcoin',
                price: p,
                high: parseFloat(item.highPrice) || p,
                low: parseFloat(item.lowPrice) || p,
                prevClose: parseFloat(item.prevClosePrice) || p,
                changePercent: parseFloat(item.priceChangePercent) || 0,
                precision: 2,
              };
            }
          } else if (item.symbol === 'ETHUSDT') {
            const p = parseFloat(item.lastPrice);
            if (!isNaN(p) && p > 0) {
              marketPricesCache.data['ETHUSD'] = {
                symbol: 'ETHUSD',
                name: 'Ethereum',
                price: p,
                high: parseFloat(item.highPrice) || p,
                low: parseFloat(item.lowPrice) || p,
                prevClose: parseFloat(item.prevClosePrice) || p,
                changePercent: parseFloat(item.priceChangePercent) || 0,
                precision: 2,
              };
            }
          }
        });
      }
    } catch {
      // Fallback to existing or Yahoo
    }

    // 2. Metals, Oil & Indices via Yahoo Finance
    const commoditiesAndIndices = ['XAUUSD', 'US OIL', 'NASDAQ', 'US30'];
    await Promise.all(
      commoditiesAndIndices.map(async (key) => {
        const sym = yahooSymbols[key];
        if (!sym) return;
        try {
          const yRes = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1m&range=1d`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }
          );
          if (yRes.ok) {
            const yData = await yRes.json();
            const meta = yData?.chart?.result?.[0]?.meta;
            if (meta && typeof meta.regularMarketPrice === 'number' && meta.regularMarketPrice > 0) {
              const prev = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
              const chg = prev > 0 ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0;
              marketPricesCache.data[key] = {
                symbol: key,
                name: key === 'XAUUSD' ? 'Gold / USD' : key === 'US OIL' ? 'Crude Oil (WTI)' : key === 'NASDAQ' ? 'US Tech 100' : 'Wall Street 30',
                price: meta.regularMarketPrice,
                high: meta.regularMarketDayHigh ?? meta.regularMarketPrice,
                low: meta.regularMarketDayLow ?? meta.regularMarketPrice,
                prevClose: prev,
                changePercent: Number(chg.toFixed(2)),
                precision: 2,
              };
            }
          }
        } catch {
          // Keep existing cached price
        }
      })
    );

    marketPricesCache.timestamp = Date.now();
  } catch (err) {
    console.warn('Market prices update warning:', err);
  }

  return res.json({ success: true, timestamp: marketPricesCache.timestamp, prices: marketPricesCache.data });
});


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint to parse trade screenshot (single trade OR multiple trades table)
app.post('/api/parse-trade-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const isRetryableError = (err: any) => {
      if (!err) return false;
      const str = String(err?.message || err).toLowerCase();
      const status = err?.status || err?.code || err?.response?.status;
      if (status === 429 || status === 503 || status === 500) return true;
      return (
        str.includes('high demand') ||
        str.includes('spikes in demand') ||
        str.includes('rate limit') ||
        str.includes('resource_exhausted') ||
        str.includes('quota') ||
        str.includes('try again later') ||
        str.includes('unavailable') ||
        str.includes('overloaded') ||
        str.includes('temporarily')
      );
    };

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
    ];
    let outputText = '';
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const MAX_RETRIES_PER_MODEL = 2; // 1 initial + 2 retries = 3 attempts max
      for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: `You are an expert, meticulous financial trading OCR engine.
Analyze this user-uploaded trading statement or position screenshot.

STRICT ACCURACY RULES:
1. Extract ONLY the trades that are actually visible in THIS specific screenshot.
2. If there is 1 trade row visible, return an array with exactly 1 trade.
3. If there are 3 trade rows visible, return an array with exactly 3 trades.
4. If there are 10 trade rows visible, return an array with exactly 10 trades.
5. NEVER fabricate, hallucinate, invent, or add ANY extra trades or demo trades.
6. NEVER include any default or sample trade (such as fake XAU/USD or EUR/USD) unless it is visibly present in the screenshot.
7. For each row:
   - pair: the exact symbol/currency pair (e.g., "XAU/USD", "EUR/USD", "BTC/USD", "USOIL", "GBP/JPY")
   - type: BUY or SELL
   - lots: lot size as number
   - openPrice: entry price as number
   - closePrice: exit price as number if closed
   - pnl: exact profit or loss as number (positive if profit, negative if loss)
   - pips: pips gained or lost as number
   - strategy: order close reason if visible (e.g., "Take Profit", "Stop Loss", "Manual Close") or empty string
   - time: timestamp or date string visible on the trade
   - dateDay: numeric day of month (1-31) if visible, or null
8. If no trading positions or trade rows are readable in the screenshot, return {"trades": []}.`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  trades: {
                    type: Type.ARRAY,
                    description: 'List of trades strictly visible in the image.',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        pair: { type: Type.STRING, description: 'Trading pair symbol' },
                        type: { type: Type.STRING, enum: ['BUY', 'SELL'] },
                        lots: { type: Type.NUMBER, description: 'Lot volume' },
                        openPrice: { type: Type.NUMBER, description: 'Opening/execution price' },
                        closePrice: { type: Type.NUMBER, description: 'Close price if closed' },
                        pnl: { type: Type.NUMBER, description: 'Profit or loss value' },
                        pips: { type: Type.NUMBER, description: 'Pips value' },
                        strategy: { type: Type.STRING, description: 'Order reason or note' },
                        time: { type: Type.STRING, description: 'Timestamp string' },
                        dateDay: { type: Type.INTEGER, description: 'Day of month (1-31)' },
                      },
                      required: ['pair', 'type', 'lots', 'openPrice', 'pnl'],
                    },
                  },
                },
                required: ['trades'],
              },
            },
          });

          outputText = response.text || '{"trades":[]}';
          lastError = null;
          break; // Success
        } catch (err: any) {
          lastError = err;
          const retryable = isRetryableError(err);
          console.warn(`[Server Auto-Scan] Model ${modelName} attempt ${attempt + 1} failed:`, err?.message || err);
          if (!retryable || attempt >= MAX_RETRIES_PER_MODEL) {
            break; // Stop retrying this model, proceed to fallback model
          }
          // Exponential backoff with jitter
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 300;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (outputText) {
        break; // Successfully got response
      }
    }

    if (lastError && !outputText) {
      throw lastError;
    }

    const parsedData = JSON.parse(outputText || '{"trades":[]}');
    return res.json(parsedData);
  } catch (err: any) {
    console.error('Gemini vision trade screenshot error:', err);
    let message = err?.message || 'Failed to parse trade screenshot with AI';
    try {
      const parsed = typeof message === 'string' && message.trim().startsWith('{') ? JSON.parse(message.trim()) : null;
      if (parsed?.error?.message) {
        message = parsed.error.message;
      }
    } catch {}

    const isHighDemand =
      message.toLowerCase().includes('high demand') ||
      message.toLowerCase().includes('spikes in demand') ||
      message.toLowerCase().includes('resource_exhausted') ||
      err?.status === 503 ||
      err?.status === 429;

    return res.status(isHighDemand ? 503 : 500).json({
      error: isHighDemand
        ? 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.'
        : message,
      isHighDemand,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
