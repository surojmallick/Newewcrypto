import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { OHLCV } from '../types';
import { X } from 'lucide-react';

interface Props {
  pair: string;
  data: OHLCV[];
  onClose: () => void;
}

const ChartModal: React.FC<Props> = ({ pair, data, onClose }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#151A21' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: '#2A2F3A' },
        horzLines: { color: '#2A2F3A' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderVisible: false,
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });

    // Format data for lightweight-charts
    // Time needs to be in seconds for unix timestamp
    const formattedData = data.map(d => ({
      time: d.time / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })).sort((a,b) => a.time - b.time);

    // Remove duplicates
    const uniqueData = formattedData.filter((v, i, a) => i === 0 || v.time !== a[i-1].time);

    candleSeries.setData(uniqueData as any);
    
    chartRef.current = chart;

    const handleResize = () => {
      if(chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#151A21] border border-gray-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white tracking-wide">{pair} <span className="text-sm text-gray-500 font-normal">1 Minute Chart</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 flex-1">
           <div ref={chartContainerRef} className="w-full h-[400px]"></div>
        </div>
        <div className="p-4 border-t border-gray-800 bg-[#0B0E11] rounded-b-xl text-xs text-gray-500 text-center">
            Prices provided by Yahoo Finance / Binance Public Data
        </div>
      </div>
    </div>
  );
};

export default ChartModal;