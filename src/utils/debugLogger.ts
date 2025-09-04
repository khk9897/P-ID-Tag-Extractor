import { DEBUG_MODE, DEBUG_LEVEL, DEBUG_CATEGORIES } from '../constants.ts';

// Get or create global performance store
const getPerformanceStore = () => {
  if (typeof window !== 'undefined') {
    if (!(window as any).performanceStore) {
      (window as any).performanceStore = {
        functionCalls: new Map<string, number>(),
        renderCounts: new Map<string, number>(),
        timers: new Map<string, number>(),
        stateChanges: new Map<string, { count: number; lastValue?: any }>(),
        memoRecalculations: new Map<string, number>(),
        memorySnapshots: [] as { time: number; memory: number; label?: string }[],
      };
    }
    return (window as any).performanceStore;
  }
  // Fallback for SSR or non-browser environments
  return {
    functionCalls: new Map<string, number>(),
    renderCounts: new Map<string, number>(),
    timers: new Map<string, number>(),
    stateChanges: new Map<string, { count: number; lastValue?: any }>(),
    memoRecalculations: new Map<string, number>(),
    memorySnapshots: [] as { time: number; memory: number; label?: string }[],
  };
};

// Color codes for console output
const LOG_COLORS = {
  STATE: 'color: #10b981; font-weight: bold;',      // Green
  RENDER: 'color: #f59e0b; font-weight: bold;',     // Amber
  PERF: 'color: #3b82f6; font-weight: bold;',       // Blue
  MEMO: 'color: #8b5cf6; font-weight: bold;',       // Purple
  FUNC: 'color: #ec4899; font-weight: bold;',       // Pink
  EXTRACT: 'color: #14b8a6; font-weight: bold;',    // Teal
  RELATION: 'color: #f87171; font-weight: bold;',   // Red
  EVENT: 'color: #a78bfa; font-weight: bold;',      // Light Purple
  MEMORY: 'color: #fb923c; font-weight: bold;',     // Orange
};

// Main debug logger
export const debugLog = (category: keyof typeof DEBUG_CATEGORIES, message: string, data?: any) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES[category]) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[${category}] ${timestamp}`;
  
  if (DEBUG_LEVEL === 'BASIC') {
    console.log(`%c${prefix}`, LOG_COLORS[category], message);
  } else if (DEBUG_LEVEL === 'DETAILED') {
    console.log(`%c${prefix}`, LOG_COLORS[category], message, data || '');
  } else if (DEBUG_LEVEL === 'VERBOSE') {
    console.group(`%c${prefix}`, LOG_COLORS[category], message);
    if (data) console.log(data);
    console.trace();
    console.groupEnd();
  }
};

// Performance timer
export const perfTimer = {
  start: (label: string) => {
    if (!DEBUG_MODE || !DEBUG_CATEGORIES.PERF) return;
    const store = getPerformanceStore();
    store.timers.set(label, performance.now());
    debugLog('PERF', `Timer started: ${label}`);
  },
  
  end: (label: string) => {
    if (!DEBUG_MODE || !DEBUG_CATEGORIES.PERF) return;
    const store = getPerformanceStore();
    const start = store.timers.get(label);
    if (start) {
      const duration = performance.now() - start;
      store.timers.delete(label);
      debugLog('PERF', `${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
    return 0;
  },
};

// Function call tracker
export const trackFunctionCall = (funcName: string, args?: any[]) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.FUNC) return;
  
  const store = getPerformanceStore();
  const count = (store.functionCalls.get(funcName) || 0) + 1;
  store.functionCalls.set(funcName, count);
  
  // Only log critical performance warnings at higher thresholds
  if (count === 5000 || count % 10000 === 0) {
    debugLog('FUNC', `🚨 CRITICAL: ${funcName} called ${count} times - needs optimization`);
  }
};

// Component render tracker
export const trackRender = (componentName: string, props?: any) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.RENDER) return;
  
  const store = getPerformanceStore();
  const count = (store.renderCounts.get(componentName) || 0) + 1;
  store.renderCounts.set(componentName, count);
  
  // Only log excessive render warnings at higher thresholds
  if (count === 50 || count % 100 === 0) {
    debugLog('RENDER', `⚠️ ${componentName} rendered ${count} times`);
  }
};

// State change tracker
export const trackStateChange = (stateName: string, oldValue: any, newValue: any) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.STATE) return;
  
  const store = getPerformanceStore();
  const state = store.stateChanges.get(stateName) || { count: 0 };
  state.count++;
  state.lastValue = newValue;
  store.stateChanges.set(stateName, state);
  
  // Only log major state changes or excessive updates
  if (state.count === 1 || state.count % 20 === 0) {
    let difference = '';
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const diff = newValue.length - oldValue.length;
      if (Math.abs(diff) > 0) difference = ` (${diff > 0 ? '+' : ''}${diff} items)`;
    }
    
    if (state.count === 1) {
      debugLog('STATE', `${stateName} initialized${difference}`);
    } else {
      debugLog('STATE', `${stateName} updated ${state.count} times${difference}`);
    }
  }
};

// Memoization tracker
export const trackMemoRecalculation = (memoName: string, dependencies: any[]) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.MEMO) return;
  
  const store = getPerformanceStore();
  const count = (store.memoRecalculations.get(memoName) || 0) + 1;
  store.memoRecalculations.set(memoName, count);
  
  // Only log frequent memoization issues
  if (count === 10 || count % 50 === 0) {
    debugLog('MEMO', `🔄 ${memoName} recalculated ${count} times - check dependencies`);
  }
};

// Memory usage tracker
export const trackMemoryUsage = (label?: string) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.MEMORY) return;
  
  // @ts-ignore - performance.memory is Chrome-specific
  if (performance.memory) {
    // @ts-ignore
    const memory = performance.memory.usedJSHeapSize / 1048576; // Convert to MB
    const store = getPerformanceStore();
    store.memorySnapshots.push({ 
      time: Date.now(), 
      memory,
      label 
    });
    
    debugLog('MEMORY', `Memory usage: ${memory.toFixed(2)} MB${label ? ` (${label})` : ''}`);
  }
};

// Click event tracker
export const trackClickEvent = (eventName: string, target?: string) => {
  if (!DEBUG_MODE || !DEBUG_CATEGORIES.EVENT) return;
  
  const clickId = `click_${eventName}_${Date.now()}`;
  perfTimer.start(clickId);
  debugLog('EVENT', `🖱️ Click started: ${eventName}${target ? ` (${target})` : ''}`);
  
  // Return a completion function
  return () => {
    const duration = perfTimer.end(clickId);
    if (duration > 100) {
      debugLog('EVENT', `🖱️ Click completed: ${eventName} - ${duration.toFixed(2)}ms${duration > 500 ? ' ⚠️ SLOW' : ''}`);
    } else {
      debugLog('EVENT', `🖱️ Click completed: ${eventName} - ${duration.toFixed(2)}ms`);
    }
  };
};

// Performance report generator
export const generatePerformanceReport = () => {
  if (!DEBUG_MODE) return;
  
  console.group('%c📊 Performance Report', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
  
  const store = getPerformanceStore();
  
  // Function calls
  if (store.functionCalls.size > 0) {
    console.group('%c⚡ Function Calls', 'color: #ec4899; font-weight: bold;');
    const sortedFuncs = Array.from(store.functionCalls.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    sortedFuncs.forEach(([func, count]) => {
      console.log(`${func}: ${count} calls`);
    });
    console.groupEnd();
  }
  
  // Render counts
  if (store.renderCounts.size > 0) {
    console.group('%c🎨 Component Renders', 'color: #f59e0b; font-weight: bold;');
    store.renderCounts.forEach((count, component) => {
      console.log(`${component}: ${count} renders`);
    });
    console.groupEnd();
  }
  
  // State changes
  if (store.stateChanges.size > 0) {
    console.group('%c📦 State Changes', 'color: #10b981; font-weight: bold;');
    store.stateChanges.forEach((state, name) => {
      console.log(`${name}: ${state.count} changes`);
    });
    console.groupEnd();
  }
  
  // Memoization
  if (store.memoRecalculations.size > 0) {
    console.group('%c🧠 Memoization Recalculations', 'color: #8b5cf6; font-weight: bold;');
    store.memoRecalculations.forEach((count, memo) => {
      console.log(`${memo}: ${count} recalculations`);
    });
    console.groupEnd();
  }
  
  // Memory usage
  if (store.memorySnapshots.length > 0) {
    console.group('%c💾 Memory Usage', 'color: #fb923c; font-weight: bold;');
    const firstSnapshot = store.memorySnapshots[0];
    const lastSnapshot = store.memorySnapshots[store.memorySnapshots.length - 1];
    console.log(`Initial: ${firstSnapshot.memory.toFixed(2)} MB`);
    console.log(`Current: ${lastSnapshot.memory.toFixed(2)} MB`);
    console.log(`Delta: ${(lastSnapshot.memory - firstSnapshot.memory).toFixed(2)} MB`);
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Reset all performance data
export const resetPerformanceData = () => {
  const store = getPerformanceStore();
  store.functionCalls.clear();
  store.renderCounts.clear();
  store.timers.clear();
  store.stateChanges.clear();
  store.memoRecalculations.clear();
  store.memorySnapshots = [];
  console.log('%c🔄 Performance data reset', 'color: #3b82f6; font-weight: bold;');
};

// Export to global for console access
if (DEBUG_MODE) {
  (window as any).perfReport = generatePerformanceReport;
  (window as any).perfReset = resetPerformanceData;
  console.log('%c🚀 Debug Logger Initialized', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
  console.log('%cUse window.perfReport() for performance report', 'color: #6b7280;');
  console.log('%cUse window.perfReset() to reset data', 'color: #6b7280;');
}