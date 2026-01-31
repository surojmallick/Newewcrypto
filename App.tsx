import React, { useState, useEffect, useRef } from 'react';
import { TradeMode, Signal, OHLCV, SignalType } from './types';
import { MODE_CONFIG, TRADING_PAIRS, REFRESH_RATE } from './constants';
import { fetchCandles, generateMockCandles } from './services/binanceService';
import { analyzePair } from './services/signalEngine';
import { saveToHistory } from './services/historyService';
import SignalCard from './components/SignalCard';
import ChartModal from './components/ChartModal';
import HistoryView from './components/HistoryView';
import { Activity, Zap, BarChart2, RefreshCw, Filter, History, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<TradeMode>(TradeMode.VERY_SHORT);
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  
  // Data Store
  const marketDataRef = useRef<Record<string, {
      exec: OHLCV[],
      bias: OHLCV[]
  }>>({});

  // WebSocket Reference
  const wsRef = useRef<WebSocket | null>(null);

  const initData = async () => {
    setLoading(true);
    const config = MODE_CONFIG[mode];
    
    // Fetch initial snapshots for all pairs
    const promises = TRADING_PAIRS.map(async (pair) => {
        let exec = await fetchCandles(pair, config.executionTimeframe, 100);
        let bias = await fetchCandles(pair, config.biasTimeframe, 100);

        if (exec.length === 0) exec = generateMockCandles(50000 + Math.random()*2000, 100);
        if (bias.length === 0) bias = generateMockCandles(50000 + Math.random()*2000, 100);

        marketDataRef.current[pair] = { exec, bias };
    });

    await Promise.all(promises);
    setLoading(false);
    // Initial analysis
    runAnalysis();
    connectWebSocket();
  };

  const connectWebSocket = () => {
      if (wsRef.current) wsRef.current.close();
      
      const streams = TRADING_PAIRS.map(p => `${p.toLowerCase()}@kline_1m`).join('/');
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);

      ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.e === 'kline') {
              const pair = msg.s;
              const k = msg.k;
              const candle: OHLCV = {
                  time: k.t,
                  open: parseFloat(k.o),
                  high: parseFloat(k.h),
                  low: parseFloat(k.l),
                  close: parseFloat(k.c),
                  volume: parseFloat(k.v)
              };
              
              if (marketDataRef.current[pair]) {
                  const data = marketDataRef.current[pair];
                  const updateCandleArray = (arr: OHLCV[]) => {
                      const last = arr[arr.length - 1];
                      if (candle.time === last.time) {
                          arr[arr.length - 1] = candle;
                      } else if (candle.time > last.time) {
                          arr.push(candle);
                          if (arr.length > 200) arr.shift();
                      }
                  };
                  updateCandleArray(data.exec);
                  updateCandleArray(data.bias);
              }
          }
      };
      wsRef.current = ws;
  };

  const runAnalysis = () => {
      // Functional state update to access the *previous* signals state for persistence
      setSignals(prevSignals => {
          const newSignals: Record<string, Signal> = {};
          
          TRADING_PAIRS.forEach(pair => {
              const data = marketDataRef.current[pair];
              if (data && data.exec.length > 0) {
                  const activeSignal = prevSignals[pair];
                  const signal = analyzePair(pair, mode, data.exec, data.bias, activeSignal);
                  newSignals[pair] = signal;

                  // --- HISTORY LOGGING LOGIC ---
                  // 1. Signal must be valid (BUY/SELL)
                  // 2. Previously it was NONE (brand new trigger) OR 
                  // 3. It existed but with a different timestamp (re-trigger after timeout/close)
                  if (signal.type !== SignalType.NONE) {
                      const isNewEntry = !activeSignal || activeSignal.type === SignalType.NONE;
                      const isNewTimestamp = activeSignal && signal.timestamp !== activeSignal.timestamp;
                      
                      if (isNewEntry || isNewTimestamp) {
                          // Save async to not block render
                          setTimeout(() => saveToHistory(signal), 0);
                      }
                  }
              }
          });
          
          return newSignals;
      });
      
      setLastUpdate(Date.now());
  };

  useEffect(() => {
    setSignals({}); 
    initData();
    return () => {
        if (wsRef.current) wsRef.current.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
      const interval = setInterval(() => {
          runAnalysis();
      }, REFRESH_RATE);
      return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Sorting and Grouping
  const allSignals = Object.values(signals) as Signal[];
  const activeSignals = allSignals.filter(s => s.type !== SignalType.NONE)
    .sort((a, b) => b.confidence - a.confidence);
  
  const scanningSignals = allSignals.filter(s => s.type === SignalType.NONE)
    .sort((a, b) => a.pair.localeCompare(b.pair));

  return (
    <div className="min-h-screen bg-crypto-dark text-crypto-text font-sans selection:bg-crypto-accent selection:text-white">
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#0B0E11]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity size={20} className="text-white" />
             </div>
             <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                QuantScalp <span className="text-blue-500">Pro</span>
                </h1>
                <div className="text-[10px] text-gray-500 font-mono tracking-wider">AI SIGNAL ENGINE</div>
             </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Tabs */}
            <div className="flex bg-[#151A21] p-1 rounded-lg border border-white/5 mr-4">
                <button
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <LayoutDashboard size={14} /> Dashboard
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${view === 'history' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <History size={14} /> History
                </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-[#151A21] p-1 rounded-lg border border-white/5">
                <button
                onClick={() => setMode(TradeMode.VERY_SHORT)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${mode === TradeMode.VERY_SHORT ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                <Zap size={14} /> Turbo (3-10m)
                </button>
                <button
                onClick={() => setMode(TradeMode.SCALPING)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${mode === TradeMode.SCALPING ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                <BarChart2 size={14} /> Intraday (5-30m)
                </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {view === 'dashboard' ? (
            <>
                {/* Dashboard Status */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-900/10 to-transparent border border-white/5">
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                            </span>
                            <span className="font-medium text-gray-300">Live Connection</span>
                        </div>
                        <div className="h-4 w-px bg-white/10"></div>
                        <div className="flex gap-4">
                            <span>Exec TF: <span className="text-white font-mono">{MODE_CONFIG[mode].executionTimeframe}</span></span>
                            <span>Bias TF: <span className="text-white font-mono">{MODE_CONFIG[mode].biasTimeframe}</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-gray-500">
                        <RefreshCw size={12} className={loading ? 'animate-spin text-blue-500' : ''} />
                        LAST UPDATE: {new Date(lastUpdate).toLocaleTimeString()}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center h-64 gap-6">
                        <div className="relative">
                            <div className="animate-spin w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Activity size={24} className="text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-gray-400 font-mono tracking-widest text-sm animate-pulse">INITIALIZING ENGINE...</div>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* Active Signals Section */}
                        {activeSignals.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Zap size={18} className="text-yellow-400 fill-yellow-400" />
                                    <h2 className="text-lg font-bold text-white tracking-wide">ACTIVE SIGNALS <span className="text-gray-500 text-sm font-normal ml-2">({activeSignals.length})</span></h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {activeSignals.map(signal => (
                                        <SignalCard 
                                            key={signal.pair} 
                                            signal={signal} 
                                            onClick={() => setSelectedPair(signal.pair)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Watchlist / Scanning Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-2 mt-4">
                                <Filter size={16} className="text-blue-400" />
                                <h2 className="text-lg font-bold text-gray-300 tracking-wide">WATCHLIST / SCANNING <span className="text-gray-600 text-sm font-normal ml-2">({scanningSignals.length})</span></h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                {scanningSignals.map(signal => (
                                    <SignalCard 
                                        key={signal.pair} 
                                        signal={signal} 
                                        onClick={() => setSelectedPair(signal.pair)}
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </>
        ) : (
            <HistoryView />
        )}

        {/* Chart Modal */}
        {selectedPair && marketDataRef.current[selectedPair] && (
            <ChartModal 
                pair={selectedPair} 
                data={marketDataRef.current[selectedPair].exec} 
                onClose={() => setSelectedPair(null)} 
            />
        )}

      </main>
    </div>
  );
};

export default App;