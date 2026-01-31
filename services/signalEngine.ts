
import { TradeMode, Signal, SignalType, OHLCV, Indicators } from '../types';
import { getIndicators } from '../utils/indicators';

export const analyzePair = (
    pair: string,
    mode: TradeMode,
    candlesExec: OHLCV[],
    candlesBias: OHLCV[],
    activeSignal?: Signal
): Signal => {
    
    const currentPrice = candlesExec[candlesExec.length - 1].close;
    const isShort = mode === TradeMode.VERY_SHORT;

    // 1. Calculate Indicators
    const indExec = getIndicators(candlesExec, isShort ? {
        emaShort: 9, emaLong: 21, rsiPeriod: 14, 
        macd: {f:12, s:26, sig:9}, bb: {p:20, m:2}, atrPeriod: 14, volMa: 20
    } : {
        emaShort: 9, emaLong: 21, emaTrend: 50, rsiPeriod: 14,
        macd: {f:12, s:26, sig:9}, bb: {p:20, m:2}, atrPeriod: 14, volMa: 20
    });

    const indBias = getIndicators(candlesBias, isShort ? {
        emaShort: 21, emaLong: 50, rsiPeriod: 14,
        macd: {f:12, s:26, sig:9}, bb: {p:20, m:2}, atrPeriod: 14, volMa: 20
    } : {
        emaShort: 21, emaLong: 50, rsiPeriod: 14,
        macd: {f:12, s:26, sig:9}, bb: {p:20, m:2}, atrPeriod: 14, volMa: 20
    });

    const metrics = {
        rsi: parseFloat(indExec.rsi.toFixed(1)),
        volumeRatio: parseFloat((candlesExec[candlesExec.length-1].volume / indExec.volumeMa).toFixed(1)),
        isAboveVwap: currentPrice > indExec.vwap,
        isAboveEma21: currentPrice > indExec.ema21,
        adx: parseFloat(indExec.adx.toFixed(1))
    };

    // 2. ACTIVE TRADE MANAGEMENT (Sticky Logic)
    // Once a signal is active, we use wider stops to prevent "vanishing" on noise.
    if (activeSignal && activeSignal.type !== SignalType.NONE) {
        
        // Dynamic Stop Loss trailing logic could go here, but for now we enforce the hard SL
        if ((activeSignal.type === SignalType.BUY && currentPrice <= activeSignal.stopLoss) ||
            (activeSignal.type === SignalType.SELL && currentPrice >= activeSignal.stopLoss)) {
             return {
                ...activeSignal,
                type: SignalType.NONE,
                warnings: [`SL Hit`],
                scanningReason: `Stopped out at ${currentPrice.toFixed(2)}`,
                entryPrice: currentPrice,
                metrics
            };
        }
        
        // Extended Timeout to prevent premature expiry
        const timeElapsed = Date.now() - activeSignal.timestamp;
        const maxDuration = isShort ? 30 * 60 * 1000 : 90 * 60 * 1000;
        
        if (timeElapsed > maxDuration) {
             return {
                ...activeSignal,
                type: SignalType.NONE,
                warnings: ['Expired'],
                scanningReason: "Signal Expired (Time limit)",
                entryPrice: currentPrice,
                metrics
            };
        }

        // Return the active signal unchanged to maintain state
        return { ...activeSignal, metrics };
    }

    // 3. SNIPER SIGNAL GENERATION
    // STRICT "No Loss" Philosophy: High Trend + Pullback Entry
    const reasons: string[] = [];
    const warnings: string[] = [];
    const missingConditions: string[] = [];
    let signalType = SignalType.NONE;
    let confidence = 0;

    // A. Trend Filter (Must be strong)
    const isBiasBullish = indBias.ema9 > indBias.ema21;
    const isBiasBearish = indBias.ema9 < indBias.ema21;
    const isTrendStrong = indBias.adx > 20; // Only trade trending markets

    if (!isTrendStrong) {
        missingConditions.push(`Market Choppy (ADX ${indBias.adx.toFixed(0)} < 20)`);
    } else {
        // B. Execution Logic (Pullback Entry)
        // We look for StochRSI crosses in direction of trend
        
        if (isBiasBullish) {
            // Trend is UP, look for OVERSOLD dips
            const trendAligned = indExec.ema9 > indExec.ema21;
            const stochOversold = indExec.stochRsi.k < 30; // Was oversold recently
            const stochCrossUp = indExec.stochRsi.k > indExec.stochRsi.d; // Crossing up now
            const volumeOk = metrics.volumeRatio > 1.0;
            const rsiRoom = indExec.rsi < 65; // Room to grow

            if (!trendAligned) missingConditions.push("1m Trend Misaligned");
            if (!stochCrossUp) missingConditions.push("Waiting for StochRSI Cross Up");
            if (!stochOversold && indExec.stochRsi.k > 40) missingConditions.push("Price not cheap enough (Stoch)");
            if (!rsiRoom) missingConditions.push(`RSI too high (${indExec.rsi.toFixed(0)})`);
            
            if (missingConditions.length === 0) {
                signalType = SignalType.BUY;
                reasons.push("Strong Up-Trend");
                reasons.push("Oversold Pullback");
                reasons.push("Momentum Turning Up");
                confidence = 90;
            }

        } else if (isBiasBearish) {
            // Trend is DOWN, look for OVERBOUGHT rallies
            const trendAligned = indExec.ema9 < indExec.ema21;
            const stochOverbought = indExec.stochRsi.k > 70; // Was overbought recently
            const stochCrossDown = indExec.stochRsi.k < indExec.stochRsi.d; // Crossing down now
            const volumeOk = metrics.volumeRatio > 1.0;
            const rsiRoom = indExec.rsi > 35; // Room to drop

            if (!trendAligned) missingConditions.push("1m Trend Misaligned");
            if (!stochCrossDown) missingConditions.push("Waiting for StochRSI Cross Down");
            if (!stochOverbought && indExec.stochRsi.k < 60) missingConditions.push("Price too low to sell (Stoch)");
            if (!rsiRoom) missingConditions.push(`RSI too low (${indExec.rsi.toFixed(0)})`);

            if (missingConditions.length === 0) {
                signalType = SignalType.SELL;
                reasons.push("Strong Down-Trend");
                reasons.push("Overbought Rally");
                reasons.push("Momentum Turning Down");
                confidence = 90;
            }
        }
    }

    // FORMAT SCANNING REASON
    let scanningStatus = "";
    if (missingConditions.length > 0) {
        scanningStatus = missingConditions[0]; // Show primary blocker
        if(missingConditions.length > 1) scanningStatus += ` & ${missingConditions[1]}`;
    } else if (signalType === SignalType.NONE) {
        scanningStatus = "Monitoring Market Structure...";
    }

    // 4. RISK CALCULATION (Wider stops for stability)
    let stopLoss = 0;
    let slReason = '';
    let targets: {price: number, reason: string}[] = [];
    const atr = indExec.atr || (currentPrice * 0.005);
    
    if (signalType === SignalType.BUY) {
        // Stop loss below recent swing low OR 2x ATR (More breathing room)
        const recentLow = Math.min(...candlesExec.slice(-5).map(c => c.low));
        stopLoss = Math.min(recentLow, currentPrice - (atr * 2.0));
        slReason = "Swing Low / ATR";
        
        const risk = currentPrice - stopLoss;
        targets = [
            { price: currentPrice + (risk * 2.0), reason: "2.0R Target" },
            { price: indExec.bollinger.upper, reason: "BB Extension" }
        ];

    } else if (signalType === SignalType.SELL) {
        // Stop loss above recent swing high OR 2x ATR
        const recentHigh = Math.max(...candlesExec.slice(-5).map(c => c.high));
        stopLoss = Math.max(recentHigh, currentPrice + (atr * 2.0));
        slReason = "Swing High / ATR";

        const risk = stopLoss - currentPrice;
        targets = [
            { price: currentPrice - (risk * 2.0), reason: "2.0R Target" },
            { price: indExec.bollinger.lower, reason: "BB Extension" }
        ];
    }

    // Sanity check: If volatility is zero, don't signal
    if (Math.abs(currentPrice - stopLoss) <= 0.0000001) {
        signalType = SignalType.NONE;
        scanningStatus = "Volatility too low";
    }

    return {
        pair,
        type: signalType,
        mode,
        entryPrice: currentPrice,
        stopLoss,
        stopLossReason: slReason,
        targets,
        confidence,
        timestamp: Date.now(),
        reasons,
        warnings,
        riskRewardRatio: (targets[0]?.price && stopLoss) ? Math.abs(targets[0].price - currentPrice) / Math.abs(currentPrice - stopLoss) : 0,
        metrics,
        scanningReason: signalType === SignalType.NONE ? scanningStatus : undefined
    };
};
