import React, { useState, useEffect } from 'react';
import { Signal, SignalType } from '../types';
import { getHistory, clearHistory } from '../services/historyService';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Clock, Calendar } from 'lucide-react';

const HistoryView: React.FC = () => {
  const [history, setHistory] = useState<Signal[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all signal history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-800 rounded-xl bg-[#111418]">
        <Clock size={48} className="text-gray-600 mb-4" />
        <p className="text-gray-400 font-mono">No signals recorded yet.</p>
        <p className="text-xs text-gray-600 mt-2">Signals will appear here automatically when generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-[#151A21] p-4 rounded-xl border border-white/5">
        <div>
            <h2 className="text-lg font-bold text-white">Signal History</h2>
            <p className="text-xs text-gray-500 font-mono">Archive of last 100 triggers</p>
        </div>
        <button 
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-lg text-xs transition-colors"
        >
          <Trash2 size={14} /> Clear History
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#111418]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1A202C] text-xs uppercase text-gray-400 font-mono border-b border-white/10">
              <th className="p-4">Time</th>
              <th className="p-4">Pair</th>
              <th className="p-4">Type</th>
              <th className="p-4 text-right">Entry</th>
              <th className="p-4 text-right">Stop Loss</th>
              <th className="p-4 text-right">Target 1</th>
              <th className="p-4">Reasons</th>
              <th className="p-4 text-center">RR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {history.map((signal, idx) => {
              const date = new Date(signal.timestamp);
              const isBuy = signal.type === SignalType.BUY;
              
              return (
                <tr key={`${signal.pair}-${signal.timestamp}`} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-400 font-mono whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <Calendar size={12} />
                        {date.toLocaleDateString()} 
                        <span className="text-gray-600">|</span>
                        {date.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-white">
                    {signal.pair}
                    <span className="ml-2 text-[10px] bg-white/10 px-1 rounded text-gray-500 font-normal">
                        {signal.mode === 'VERY_SHORT' ? 'TURBO' : 'SCALP'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isBuy ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
                      {isBuy ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                      {signal.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-white">{signal.entryPrice.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono text-red-400">{signal.stopLoss.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono text-green-400">{signal.targets[0]?.price.toFixed(2)}</td>
                  <td className="p-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                        {signal.reasons.map((r, i) => (
                            <span key={i} className="text-[10px] bg-white/5 text-gray-400 px-1 border border-white/5 rounded">
                                {r}
                            </span>
                        ))}
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-gray-500">
                    1:{signal.riskRewardRatio.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryView;