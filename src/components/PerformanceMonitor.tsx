import React, { useState, useEffect, useRef } from 'react';
import { DEBUG_MODE, DEBUG_CATEGORIES } from '../constants.ts';
import { debugLog } from '../utils/debugLogger.ts';

interface PerformanceStats {
  functionCalls: Map<string, number>;
  renderCounts: Map<string, number>;
  stateChanges: Map<string, { count: number; lastValue?: any }>;
  memoRecalculations: Map<string, number>;
  memoryUsage: number;
  timers: Map<string, number>;
}

const PerformanceMonitor: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    functionCalls: new Map(),
    renderCounts: new Map(),
    stateChanges: new Map(),
    memoRecalculations: new Map(),
    memoryUsage: 0,
    timers: new Map(),
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update stats from global performance store
  const updateStats = () => {
    // @ts-ignore - Accessing debug data from global
    if (window.performanceStore) {
      // @ts-ignore
      const store = window.performanceStore;
      setStats({
        functionCalls: new Map(store.functionCalls),
        renderCounts: new Map(store.renderCounts),
        stateChanges: new Map(store.stateChanges),
        memoRecalculations: new Map(store.memoRecalculations),
        // @ts-ignore - performance.memory is Chrome-specific
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0,
        timers: new Map(store.timers),
      });
    }
  };

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsVisible(prev => !prev);
        debugLog('PERF', 'Performance monitor toggled');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update stats periodically when visible
  useEffect(() => {
    if (isVisible) {
      updateStats(); // Initial update
      intervalRef.current = setInterval(updateStats, 1000); // Update every second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible]);

  if (!DEBUG_MODE || !isVisible) {
    return null;
  }

  const topFunctionCalls = Array.from(stats.functionCalls.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topRenderCounts = Array.from(stats.renderCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  const topStateChanges = Array.from(stats.stateChanges.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const topMemoRecalculations = Array.from(stats.memoRecalculations.entries())
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed top-4 right-4 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-[9999] w-96 max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-semibold text-sm">Performance Monitor</span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
        
        {/* Memory Usage */}
        <div className="bg-slate-700/50 rounded p-3">
          <h3 className="text-orange-400 font-semibold text-sm mb-2 flex items-center">
            <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
            Memory Usage
          </h3>
          <div className="text-slate-300 text-sm">
            {stats.memoryUsage.toFixed(2)} MB
          </div>
        </div>

        {/* Function Calls */}
        {topFunctionCalls.length > 0 && (
          <div className="bg-slate-700/50 rounded p-3">
            <h3 className="text-pink-400 font-semibold text-sm mb-2 flex items-center">
              <span className="w-2 h-2 bg-pink-400 rounded-full mr-2"></span>
              Top Function Calls
            </h3>
            <div className="space-y-1 text-xs">
              {topFunctionCalls.map(([func, count]) => (
                <div key={func} className="flex justify-between text-slate-300">
                  <span className="truncate max-w-48">{func}</span>
                  <span className="text-pink-300 font-mono">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Component Renders */}
        {topRenderCounts.size > 0 && (
          <div className="bg-slate-700/50 rounded p-3">
            <h3 className="text-amber-400 font-semibold text-sm mb-2 flex items-center">
              <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
              Component Renders
            </h3>
            <div className="space-y-1 text-xs">
              {topRenderCounts.map(([component, count]) => (
                <div key={component} className="flex justify-between text-slate-300">
                  <span className="truncate max-w-48">{component}</span>
                  <span className="text-amber-300 font-mono">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* State Changes */}
        {topStateChanges.length > 0 && (
          <div className="bg-slate-700/50 rounded p-3">
            <h3 className="text-green-400 font-semibold text-sm mb-2 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              State Changes
            </h3>
            <div className="space-y-1 text-xs">
              {topStateChanges.map(([state, data]) => (
                <div key={state} className="flex justify-between text-slate-300">
                  <span className="truncate max-w-48">{state}</span>
                  <span className="text-green-300 font-mono">{data.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memo Recalculations */}
        {topMemoRecalculations.size > 0 && (
          <div className="bg-slate-700/50 rounded p-3">
            <h3 className="text-purple-400 font-semibold text-sm mb-2 flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              Memo Recalculations
            </h3>
            <div className="space-y-1 text-xs">
              {topMemoRecalculations.map(([memo, count]) => (
                <div key={memo} className="flex justify-between text-slate-300">
                  <span className="truncate max-w-48">{memo}</span>
                  <span className="text-purple-300 font-mono">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-slate-700/50 rounded p-3 border-t border-slate-600">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // @ts-ignore
                if (window.perfReport) window.perfReport();
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Console Report
            </button>
            <button
              onClick={() => {
                // @ts-ignore
                if (window.perfReset) window.perfReset();
                updateStats();
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
            >
              Reset Data
            </button>
          </div>
          <div className="text-slate-400 text-xs mt-2">
            Ctrl+Shift+P to toggle
          </div>
        </div>
      </div>
    </div>
  );
};

// Enable PerformanceMonitor access from debug logger
if (DEBUG_MODE) {
  // Make performance store accessible globally for the monitor
  (window as any).performanceStore = {
    functionCalls: new Map<string, number>(),
    renderCounts: new Map<string, number>(),
    timers: new Map<string, number>(),
    stateChanges: new Map<string, { count: number; lastValue?: any }>(),
    memoRecalculations: new Map<string, number>(),
    memorySnapshots: [] as { time: number; memory: number; label?: string }[],
  };
}

export default PerformanceMonitor;