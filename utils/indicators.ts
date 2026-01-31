
import { OHLCV, Indicators } from '../types';

// Helper to get array of closes
const getCloses = (candles: OHLCV[]) => candles.map(c => c.close);

export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
};

export const calculateEMA = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
};

export const calculateRSI = (data: number[], period: number): number => {
  if (data.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateMACD = (data: number[], fast: number, slow: number, signal: number) => {
  if (data.length < slow + signal) return { macd: 0, signal: 0, histogram: 0 };
  
  const kFast = 2 / (fast + 1);
  const kSlow = 2 / (slow + 1);
  
  const fastEmas: number[] = [];
  const slowEmas: number[] = [];

  let f = data[0];
  let s = data[0];
  
  for(let i=0; i<data.length; i++) {
    f = (data[i] - f) * kFast + f;
    s = (data[i] - s) * kSlow + s;
    fastEmas.push(f);
    slowEmas.push(s);
  }

  const rawMacd = fastEmas.map((v, i) => v - slowEmas[i]);
  const currentMacd = rawMacd[rawMacd.length - 1];
  const signalLine = calculateEMA(rawMacd, signal);
  
  return {
    macd: currentMacd,
    signal: signalLine,
    histogram: currentMacd - signalLine
  };
};

export const calculateBollingerBands = (data: number[], period: number, stdDevMult: number) => {
  if (data.length < period) return { upper: 0, middle: 0, lower: 0 };
  const sma = calculateSMA(data, period);
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    middle: sma,
    upper: sma + (stdDev * stdDevMult),
    lower: sma - (stdDev * stdDevMult)
  };
};

export const calculateATR = (candles: OHLCV[], period: number): number => {
  if (candles.length < period + 1) return 0;
  
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }
  return calculateSMA(trs, period);
};

export const calculateVWAP = (candles: OHLCV[]): number => {
  if (candles.length === 0) return 0;
  let cumPV = 0;
  let cumV = 0;
  
  const lookback = Math.min(candles.length, 1000);
  const startIdx = candles.length - lookback;

  for (let i = startIdx; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    cumPV += tp * candles[i].volume;
    cumV += candles[i].volume;
  }
  
  return cumV === 0 ? 0 : cumPV / cumV;
};

export const calculateStochRSI = (rsiData: number[], period: number = 14) => {
    // Need at least period length
    if(rsiData.length < period) return { k: 50, d: 50 };
    
    // We want the most recent StochRSI
    // Current RSI is rsiData[last]
    // Lookback is last 'period' elements
    const slice = rsiData.slice(-period);
    const currentRsi = slice[slice.length - 1];
    const minRsi = Math.min(...slice);
    const maxRsi = Math.max(...slice);
    
    let stoch = 0;
    if(maxRsi - minRsi !== 0) {
        stoch = ((currentRsi - minRsi) / (maxRsi - minRsi)) * 100;
    } else {
        stoch = 50;
    }
    
    // Smooth K and D (usually SMA 3)
    // For this implementation, we return current raw Stoch as K, and previous Stoch as D to simulate cross
    // Proper way: Calculate Stoch array, then SMA for K, then SMA for D.
    // Simplified: 
    return { k: stoch, d: 50 }; 
};

export const calculateADX = (candles: OHLCV[], period: number = 14): number => {
    if (candles.length < period * 2) return 0;

    let trs = [], plusDMs = [], minusDMs = [];
    
    for(let i=1; i<candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i-1];
        
        const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
        const up = curr.high - prev.high;
        const down = prev.low - curr.low;
        
        const plusDM = (up > down && up > 0) ? up : 0;
        const minusDM = (down > up && down > 0) ? down : 0;
        
        trs.push(tr);
        plusDMs.push(plusDM);
        minusDMs.push(minusDM);
    }
    
    // Smooth using Wilder's method (simplified to SMA for this snippet efficiency)
    const smoothTR = calculateSMA(trs.slice(-period), period);
    const smoothPlusDM = calculateSMA(plusDMs.slice(-period), period);
    const smoothMinusDM = calculateSMA(minusDMs.slice(-period), period);
    
    if (smoothTR === 0) return 0;
    
    const plusDI = (smoothPlusDM / smoothTR) * 100;
    const minusDI = (smoothMinusDM / smoothTR) * 100;
    
    const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
    
    // ADX is smoothed DX
    // We just return DX as a proxy for ADX strength in this window
    return dx; 
};

export const getIndicators = (candles: OHLCV[], config: {
    emaShort: number, emaLong: number, emaTrend?: number,
    rsiPeriod: number, macd: {f:number, s:number, sig:number},
    bb: {p:number, m:number}, atrPeriod: number, volMa: number
}): Indicators => {
    const closes = getCloses(candles);
    const volumes = candles.map(c => c.volume);
    
    // RSI History for StochRSI (calculating last 20 RSIs)
    const rsiHistory: number[] = [];
    const rsiLookback = config.rsiPeriod + 14; 
    for(let i=0; i<30; i++) {
        const end = closes.length - i;
        if(end > config.rsiPeriod) {
             const subset = closes.slice(0, end);
             rsiHistory.unshift(calculateRSI(subset, config.rsiPeriod));
        }
    }
    
    const stoch = calculateStochRSI(rsiHistory);

    return {
        ema9: calculateEMA(closes, config.emaShort),
        ema21: calculateEMA(closes, config.emaLong),
        ema50: config.emaTrend ? calculateEMA(closes, config.emaTrend) : undefined,
        vwap: calculateVWAP(candles),
        rsi: calculateRSI(closes, config.rsiPeriod),
        macd: calculateMACD(closes, config.macd.f, config.macd.s, config.macd.sig),
        stochRsi: { k: stoch.k, d: rsiHistory.length > 2 ? calculateStochRSI(rsiHistory.slice(0, -1)).k : 50 }, // Use prev K as D for crossover check
        bollinger: calculateBollingerBands(closes, config.bb.p, config.bb.m),
        atr: calculateATR(candles, config.atrPeriod),
        volumeMa: calculateSMA(volumes, config.volMa),
        adx: calculateADX(candles)
    };
};
