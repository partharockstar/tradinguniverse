import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { getUserCloudData, saveUserCloudData, deleteUserCloudData } from './server/cloudStorage.js';

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode ?? '', process.cwd(), '') };

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'trade-ocr-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            // Worldwide cross-device cloud sync endpoints
            if (req.url && req.url.startsWith('/api/cloud-sync/load')) {
              try {
                const urlObj = new URL(req.url, 'http://localhost:3000');
                const email = urlObj.searchParams.get('email');
                if (!email) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Email parameter required' }));
                  return;
                }
                const profile = await getUserCloudData(email);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                if (!profile) {
                  res.end(JSON.stringify({ success: true, exists: false, message: 'No cloud data found for this email' }));
                } else {
                  res.end(JSON.stringify({ success: true, exists: true, data: profile }));
                }
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err?.message || 'Server error loading cloud data' }));
              }
              return;
            }

            if (req.url === '/api/cloud-sync/save' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  if (!payload.email) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: false, error: 'Email is required' }));
                    return;
                  }
                  const saved = await saveUserCloudData(payload);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: true,
                    savedAt: saved.updatedAt,
                    tradesCount: saved.trades?.length || 0,
                    data: saved,
                  }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Server error saving cloud data' }));
                }
              });
              return;
            }

            if (req.url === '/api/cloud-sync/delete' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body || '{}');
                  if (!payload.email) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: false, error: 'Email is required' }));
                    return;
                  }
                  const deleted = await deleteUserCloudData(payload.email);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, deleted }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Server error deleting cloud data' }));
                }
              });
              return;
            }

            if (req.url === '/api/parse-trade-screenshot' && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { imageBase64, mimeType = 'image/png' } = JSON.parse(body || '{}');
                  if (!imageBase64) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'No image provided' }));
                    return;
                  }

                  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }));
                    return;
                  }

                  const ai = new GoogleGenAI({
                    apiKey,
                    httpOptions: {
                      headers: {
                        'User-Agent': 'aistudio-build',
                      },
                    },
                  });
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
                  let responseText = '';
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
                                { inlineData: { mimeType, data: cleanBase64 } },
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

                        responseText = response.text || '{"trades":[]}';
                        lastError = null;
                        break; // Success on this attempt
                      } catch (err: any) {
                        lastError = err;
                        const retryable = isRetryableError(err);
                        console.warn(`[Auto-Scan OCR] Model ${modelName} attempt ${attempt + 1} failed:`, err?.message || err);
                        // If not retryable (e.g., 404 model unavailable to new users), fall back immediately to next model
                        if (!retryable || attempt >= MAX_RETRIES_PER_MODEL) {
                          break;
                        }
                        // Exponential backoff: 1000ms, 2000ms + random jitter
                        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 300;
                        await new Promise((resolve) => setTimeout(resolve, delay));
                      }
                    }

                    if (responseText) {
                      break; // Succeeded, stop trying fallback models
                    }
                  }

                  if (lastError && !responseText) {
                    throw lastError;
                  }

                  res.setHeader('Content-Type', 'application/json');
                  res.end(responseText || '{"trades":[]}');
                } catch (err: any) {
                  console.error('OCR Error:', err);
                  let message = err?.message || 'Error processing image';
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

                  res.statusCode = isHighDemand ? 503 : 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: isHighDemand
                      ? 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.'
                      : message,
                    isHighDemand,
                  }));
                }
              });
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
