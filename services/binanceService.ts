import { OHLCV } from '../types';

const BINANCE_REST = 'https://api.binance.com/api/v3';

// Simplified kline parsing
const parseKline = (k: any[]): OHLCV => ({
  time: k[0],
  open: parseFloat(k[1]),
  high: parseFloat(k[2]),
  low: parseFloat(k[3]),
  close: parseFloat(k[4]),
  volume: parseFloat(k[5]),
});

export const fetchCandles = async (pair: string, interval: string, limit: number = 100): Promise<OHLCV[]> => {
  try {
    const res = await fetch(`${BINANCE_REST}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();
    return data.map(parseKline);
  } catch (e) {
    console.error(`Failed to fetch ${pair} ${interval}`, e);
    // Return empty array to handle gracefully in UI (or trigger fallback mode)
    return [];
  }
};

// Generate realistic dummy data if API fails (CORS fallback)
export const generateMockCandles = (basePrice: number, count: number, volatility: number = 0.001): OHLCV[] => {
  let price = basePrice;
  const candles: OHLCV[] = [];
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const change = price * (Math.random() - 0.5) * volatility * 10;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * volatility;
    const low = Math.min(open, close) - Math.random() * price * volatility;
    price = close;
    
    candles.push({
      time: now - (i * 60000), // approx 1m spacing
      open, high, low, close, volume: Math.random() * 100
    });
  }
  return candles;
};
