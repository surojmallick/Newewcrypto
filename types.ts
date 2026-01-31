
export enum TradeMode {
  VERY_SHORT = 'VERY_SHORT', // 2-5 min
  SCALPING = 'SCALPING',     // 5-30 min
}

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  pair: string;
  price: number;
  candles1m: OHLCV[];
  candles3m: OHLCV[];
  candles5m: OHLCV[];
  candles15m: OHLCV[];
}

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  NONE = 'NONE'
}

export interface TechnicalLevel {
  price: number;
  type: 'support' | 'resistance' | 'fib' | 'vwap' | 'liquidity';
  description: string;
}

export interface Signal {
  pair: string;
  type: SignalType;
  mode: TradeMode;
  entryPrice: number;
  stopLoss: number;
  stopLossReason: string;
  targets: { price: number; reason: string; hit?: boolean }[];
  confidence: number;
  timestamp: number;
  reasons: string[]; // List of technical conditions met
  warnings: string[]; // Any near-fail conditions
  riskRewardRatio: number;
  metrics: {
    rsi: number;
    volumeRatio: number;
    isAboveVwap: boolean;
    isAboveEma21: boolean;
    adx: number; // Added ADX
  };
  scanningReason?: string; // New field: Explain what we are waiting for
}

export interface Indicators {
  ema9: number;
  ema21: number;
  ema50?: number;
  vwap: number;
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  stochRsi: {
    k: number;
    d: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  volumeMa: number;
  adx: number;
}
