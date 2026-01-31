import { Signal, SignalType } from '../types';

const STORAGE_KEY = 'quantscalp_history_v1';

export const getHistory = (): Signal[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const saveToHistory = (signal: Signal) => {
  if (signal.type === SignalType.NONE) return;

  const history = getHistory();

  // Deduplication: Check if a signal for this pair with this specific timestamp already exists
  // We use timestamp because a new signal will have a new creation time
  const exists = history.some(s => s.pair === signal.pair && s.timestamp === signal.timestamp);

  if (!exists) {
    // Add to beginning of array
    const updated = [signal, ...history].slice(0, 100); // Keep last 100 signals
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};