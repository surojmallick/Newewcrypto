import { TradeMode } from './types';

export const TRADING_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];

export const MODE_CONFIG = {
  [TradeMode.VERY_SHORT]: {
    name: 'Turbo Scalping',
    duration: '3-10 min',
    biasTimeframe: '5m', // Increased from 3m to reduce noise
    executionTimeframe: '1m',
    minConfidence: 75,
  },
  [TradeMode.SCALPING]: {
    name: 'Scalping',
    duration: '5-30 min',
    biasTimeframe: '15m',
    executionTimeframe: '5m',
    minConfidence: 70,
  }
};

export const REFRESH_RATE = 1000; // UI update rate