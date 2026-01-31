
import React from 'react';
import { Signal, SignalType } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Activity, ShieldAlert, Target, BarChart2, TrendingUp, TrendingDown, Clock, MousePointerClick } from 'lucide-react';

interface Props {
  signal: Signal;
  onClick: () => void;
}

const SignalCard: React.FC<Props> = ({ signal, onClick }) => {
  const isBuy = signal.type === SignalType.BUY;
  const isNone = signal.type === SignalType.NONE;

  // --- ACTIVE SIGNAL ---
  if (!isNone) {
    const isLong = isBuy;
    // Distinct Color Schemes
    const theme = isLong ? {
        bg: 'bg-[#0E1512]',
        border: 'border-green-500/50',
        text: 'text-green-400',
        gradient: 'bg-gradient-to-r from-green-500/20 to-transparent',
        badgeBg: 'bg-green-900/40',
        icon: ArrowUpCircle
    } : {
        bg: 'bg-[#1A0F0F]',
        border: 'border-red-500/50',
        text: 'text-red-400',
        gradient: 'bg-gradient-to-r from-red-500/20 to-transparent',
        badgeBg: 'bg-red-900/40',
        icon: ArrowDownCircle
    };
    
    const Icon = theme.icon;

    return (
      <div 
        onClick={onClick}
        className={`group relative ${theme.bg} border ${theme.border} rounded-xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] hover:shadow-2xl cursor-pointer`}
      >
        {/* Status Badge Absolute */}
        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl ${theme.badgeBg} ${theme.text} text-xs font-bold flex items-center gap-1`}>
            {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isLong ? 'LONG' : 'SHORT'}
        </div>

        {/* Top Section */}
        <div className={`p-4 ${theme.gradient} border-b border-white/5`}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-white tracking-wide">{signal.pair}</h3>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 font-mono">
                {signal.mode === 'VERY_SHORT' ? 'TURBO' : 'SCALP'}
            </span>
          </div>
          
          <div className="flex items-end justify-between mt-2">
             <div>
                 <div className="text-[10px] text-gray-500 uppercase font-semibold">Entry Price</div>
                 <div className="text-3xl font-mono font-medium text-white tracking-tighter">
                    {signal.entryPrice.toFixed(2)}
                 </div>
             </div>
             <div className="text-right">
                <Icon size={32} className={`${theme.text} opacity-80`} />
             </div>
          </div>
        </div>

        {/* Technical Reasons Chips */}
        <div className="px-4 py-2 flex flex-wrap gap-1 bg-black/20">
            {signal.reasons.map((r, i) => (
                <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-white/10 text-gray-300 bg-white/5">
                    {r}
                </span>
            ))}
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-2 divide-x divide-white/10 border-b border-white/10 bg-black/20">
            <div className="p-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-500 uppercase">Stop Loss</span>
                    <span className="text-[9px] text-red-400/80 border border-red-900/30 px-1 rounded truncate max-w-[80px]">{signal.stopLossReason}</span>
                </div>
                <div className="text-sm font-mono text-red-400 font-medium">{signal.stopLoss.toFixed(2)}</div>
            </div>
            <div className="p-3">
                <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] text-gray-500 uppercase">Target 1</span>
                     <span className="text-[9px] text-green-400/80 border border-green-900/30 px-1 rounded truncate max-w-[80px]">{signal.targets[0]?.reason}</span>
                </div>
                <div className="text-sm font-mono text-green-400 font-medium">{signal.targets[0]?.price.toFixed(2)}</div>
            </div>
        </div>

        {/* Metrics Footer */}
        <div className="p-3 bg-black/40 flex items-center justify-between text-xs text-gray-400 font-mono">
             <div className="flex gap-3">
                <span title="Relative Strength Index">RSI: <span className="text-white">{signal.metrics.rsi}</span></span>
                <span title="Trend Strength">ADX: <span className={signal.metrics.adx > 25 ? 'text-green-400' : 'text-yellow-500'}>{signal.metrics.adx}</span></span>
             </div>
             <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Clock size={10} />
                {Math.floor((Date.now() - signal.timestamp)/1000)}s ago
             </div>
        </div>
      </div>
    );
  }

  // --- SCANNING / WAITING STATE ---
  return (
    <div 
        onClick={onClick}
        className="group bg-[#111418] border border-white/5 rounded-xl p-4 flex flex-col justify-between h-full hover:bg-[#161B22] hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
    >
        {/* Hover Highlight */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-lg font-bold text-gray-300 group-hover:text-white transition-colors block">{signal.pair}</span>
                    <span className="text-xl font-mono text-white/80">{signal.entryPrice.toFixed(2)}</span>
                </div>
                <Activity size={16} className="text-blue-500/50 group-hover:text-blue-400 group-hover:animate-pulse" />
            </div>

            {/* STATUS DISPLAY */}
            <div className="mb-auto bg-black/30 rounded p-2 border border-white/5 min-h-[60px]">
                <div className="text-[9px] text-blue-400 uppercase font-bold mb-1 flex items-center gap-1">
                    <Clock size={10} /> WAITING FOR
                </div>
                <div className="text-xs text-gray-400 leading-snug break-words">
                    {signal.scanningReason || "Analyzing market structure..."}
                </div>
            </div>
        </div>

        <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[11px] border-t border-white/5 pt-2">
                <span className="text-gray-600">ADX Strength</span>
                <span className={`font-mono font-bold ${signal.metrics.adx > 25 ? 'text-green-500' : 'text-gray-500'}`}>
                    {signal.metrics.adx} {signal.metrics.adx > 25 ? '(STRONG)' : '(WEAK)'}
                </span>
            </div>
            <div className="flex justify-between text-[11px]">
                <span className="text-gray-600">RSI (14)</span>
                <span className={`font-mono ${signal.metrics.rsi > 70 ? 'text-red-400' : signal.metrics.rsi < 30 ? 'text-green-400' : 'text-gray-400'}`}>
                    {signal.metrics.rsi}
                </span>
            </div>
             <div className="flex justify-between text-[11px]">
                <span className="text-gray-600">Vol</span>
                <span className={`font-mono ${signal.metrics.volumeRatio > 1.2 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {signal.metrics.volumeRatio}x
                </span>
            </div>
        </div>
        
    </div>
  );
};

export default SignalCard;
