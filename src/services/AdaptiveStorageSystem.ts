import {
  StorageAdapter,
  StorageAdapterType,
  StorageStrategy,
  StorageCondition,
  AdaptiveStorageConfig,
  StorageMigration,
  StorageInfo,
  StorageMetrics,
  StorageEvent,
  StorageEventType
} from '../types/StorageTypes';

// Storage adapter implementations
class LocalStorageAdapter implements StorageAdapter {
  name: string = 'localStorage';
  isAvailable: boolean;
  maxStorageSize?: number;
  currentUsage?: number;

  constructor() {
    this.isAvailable = typeof localStorage !== 'undefined';
    this.checkCapacity();
  }

  private checkCapacity(): void {
    if (!this.isAvailable) return;
    
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      // Estimate storage quota (most browsers limit localStorage to ~5-10MB)
      this.maxStorageSize = 5 * 1024 * 1024; // 5MB estimate
      
      // Calculate current usage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      this.currentUsage = totalSize;
    } catch (error) {
      this.isAvailable = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) throw new Error('localStorage not available');
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      throw new Error(`Failed to get ${key} from localStorage: ${error.message}`);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.isAvailable) throw new Error('localStorage not available');
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('localStorage quota exceeded');
      }
      throw new Error(`Failed to set ${key} in localStorage: ${error.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isAvailable) throw new Error('localStorage not available');
    localStorage.removeItem(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;
    return localStorage.getItem(key) !== null;
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) throw new Error('localStorage not available');
    localStorage.clear();
  }

  async keys(): Promise<string[]> {
    if (!this.isAvailable) return [];
    return Object.keys(localStorage);
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMultiple<T>(entries: Array<{ key: string; value: T }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value);
    }
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    keys.forEach(key => localStorage.removeItem(key));
  }

  async size(): Promise<number> {
    return this.currentUsage || 0;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const used = await this.size();
    const quota = this.maxStorageSize || 5 * 1024 * 1024;
    
    return {
      available: quota - used,
      used,
      quota,
      percentage: (used / quota) * 100,
      canStore: (quota - used) > 1024 // At least 1KB available
    };
  }
}

class IndexedDBAdapter implements StorageAdapter {
  name: string = 'indexedDB';
  isAvailable: boolean;
  maxStorageSize?: number;
  currentUsage?: number;
  private db: IDBDatabase | null = null;
  private dbName: string = 'AdaptiveStorage';
  private version: number = 1;

  constructor() {
    this.isAvailable = typeof indexedDB !== 'undefined';
    if (this.isAvailable) {
      this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        this.isAvailable = false;
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.get(key);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get ${key} from IndexedDB`));
      };
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to set ${key} in IndexedDB`));
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete ${key} from IndexedDB`));
    });
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async clear(): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear IndexedDB'));
    });
  }

  async keys(): Promise<string[]> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');
      const request = store.getAllKeys();
      
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error('Failed to get keys from IndexedDB'));
    });
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMultiple<T>(entries: Array<{ key: string; value: T }>): Promise<void> {
    if (!this.db) await this.initialize();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['storage'], 'readwrite');
      const store = transaction.objectStore('storage');
      
      let completed = 0;
      let hasError = false;
      
      entries.forEach(entry => {
        const request = store.put({ key: entry.key, value: entry.value });
        
        request.onsuccess = () => {
          completed++;
          if (completed === entries.length && !hasError) {
            resolve();
          }
        };
        
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(new Error('Failed to set multiple items in IndexedDB'));
          }
        };
      });
    });
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.delete(key);
    }
  }

  async size(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }
    
    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      return 0;
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    const used = await this.size();
    let quota = 0;
    
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota || 0;
      } catch (error) {
        // Fallback quota estimate
        quota = 1024 * 1024 * 1024; // 1GB
      }
    }
    
    return {
      available: quota - used,
      used,
      quota,
      percentage: quota > 0 ? (used / quota) * 100 : 0,
      canStore: (quota - used) > 1024 * 1024 // At least 1MB available
    };
  }
}

class MemoryAdapter implements StorageAdapter {
  name: string = 'memory';
  isAvailable: boolean = true;
  maxStorageSize: number;
  currentUsage: number = 0;
  private storage: Map<string, any> = new Map();

  constructor(maxSize: number = 50 * 1024 * 1024) { // 50MB default
    this.maxStorageSize = maxSize;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.storage.get(key) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    const size = serialized.length + key.length;
    
    if (this.currentUsage + size > this.maxStorageSize) {
      throw new Error('Memory storage quota exceeded');
    }
    
    // Remove old size if key exists
    if (this.storage.has(key)) {
      const oldValue = JSON.stringify(this.storage.get(key));
      this.currentUsage -= oldValue.length + key.length;
    }
    
    this.storage.set(key, value);
    this.currentUsage += size;
  }

  async delete(key: string): Promise<void> {
    if (this.storage.has(key)) {
      const value = JSON.stringify(this.storage.get(key));
      this.currentUsage -= value.length + key.length;
      this.storage.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
    this.currentUsage = 0;
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    return keys.map(key => this.storage.get(key) || null);
  }

  async setMultiple<T>(entries: Array<{ key: string; value: T }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value);
    }
  }

  async deleteMultiple(keys: string[]): Promise<void> {
    keys.forEach(key => this.storage.delete(key));
  }

  async size(): Promise<number> {
    return this.currentUsage;
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return {
      available: this.maxStorageSize - this.currentUsage,
      used: this.currentUsage,
      quota: this.maxStorageSize,
      percentage: (this.currentUsage / this.maxStorageSize) * 100,
      canStore: (this.maxStorageSize - this.currentUsage) > 1024
    };
  }
}

export class AdaptiveStorageSystem {
  private adapters: Map<StorageAdapterType, StorageAdapter> = new Map();
  private currentAdapter: StorageAdapter;
  private config: AdaptiveStorageConfig;
  private metrics: StorageMetrics;
  private eventListeners: Map<StorageEventType, Set<(event: StorageEvent) => void>> = new Map();
  private evaluationTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: Partial<AdaptiveStorageConfig> = {}) {
    this.config = {
      strategies: [],
      evaluationInterval: 60000, // 1 minute
      fallbackEnabled: true,
      healthCheckEnabled: true,
      healthCheckInterval: 30000, // 30 seconds
      migrationEnabled: true,
      ...config
    };

    this.metrics = {
      totalOperations: 0,
      successRate: 100,
      averageResponseTime: 0,
      adapterUsage: {},
      errorRate: 0,
      cacheHitRate: 0,
      storageUtilization: {}
    };

    this.initializeAdapters();
    this.initializeDefaultStrategies();
    this.selectInitialAdapter();
    this.startEvaluation();
    
    if (this.config.healthCheckEnabled) {
      this.startHealthCheck();
    }
  }

  private initializeAdapters(): void {
    // Initialize available adapters
    const localStorage = new LocalStorageAdapter();
    if (localStorage.isAvailable) {
      this.adapters.set('localStorage', localStorage);
    }

    const indexedDB = new IndexedDBAdapter();
    if (indexedDB.isAvailable) {
      this.adapters.set('indexedDB', indexedDB);
    }

    const memory = new MemoryAdapter();
    this.adapters.set('memory', memory);
  }

  private initializeDefaultStrategies(): void {
    if (this.config.strategies.length === 0) {
      this.config.strategies = [
        {
          name: 'IndexedDB Primary',
          description: 'Use IndexedDB for large data storage',
          adapters: {
            primary: 'indexedDB',
            fallback: ['localStorage', 'memory']
          },
          conditions: [
            {
              type: 'adapter_healthy',
              adapter: 'indexedDB',
              operator: '===',
              value: true
            },
            {
              type: 'quota_available',
              adapter: 'indexedDB',
              threshold: 10 * 1024 * 1024, // 10MB
              operator: '>',
              value: 10 * 1024 * 1024
            }
          ],
          priority: 1
        },
        {
          name: 'LocalStorage Fallback',
          description: 'Use localStorage for smaller data',
          adapters: {
            primary: 'localStorage',
            fallback: ['memory']
          },
          conditions: [
            {
              type: 'adapter_healthy',
              adapter: 'localStorage',
              operator: '===',
              value: true
            },
            {
              type: 'quota_available',
              adapter: 'localStorage',
              threshold: 1024 * 1024, // 1MB
              operator: '>',
              value: 1024 * 1024
            }
          ],
          priority: 2
        },
        {
          name: 'Memory Only',
          description: 'Use in-memory storage as last resort',
          adapters: {
            primary: 'memory',
            fallback: []
          },
          conditions: [],
          priority: 3
        }
      ];
    }
  }

  private async selectInitialAdapter(): Promise<void> {
    const strategy = await this.selectBestStrategy();
    const adapter = this.adapters.get(strategy.adapters.primary);
    
    if (!adapter) {
      throw new Error(`Adapter ${strategy.adapters.primary} not available`);
    }
    
    this.currentAdapter = adapter;
    this.emitEvent('adapter_switched', undefined, {
      from: undefined,
      to: strategy.adapters.primary,
      strategy: strategy.name
    });
  }

  private async selectBestStrategy(): Promise<StorageStrategy> {
    // Sort strategies by priority
    const sortedStrategies = [...this.config.strategies].sort((a, b) => a.priority - b.priority);
    
    for (const strategy of sortedStrategies) {
      if (await this.evaluateStrategy(strategy)) {
        return strategy;
      }
    }
    
    // Return lowest priority strategy as fallback
    return sortedStrategies[sortedStrategies.length - 1];
  }

  private async evaluateStrategy(strategy: StorageStrategy): Promise<boolean> {
    const adapter = this.adapters.get(strategy.adapters.primary);
    if (!adapter || !adapter.isAvailable) {
      return false;
    }

    for (const condition of strategy.conditions) {
      if (!(await this.evaluateCondition(condition, adapter))) {
        return false;
      }
    }

    return true;
  }

  private async evaluateCondition(condition: StorageCondition, adapter: StorageAdapter): Promise<boolean> {
    let actualValue: any;

    switch (condition.type) {
      case 'storage_available':
        actualValue = adapter.isAvailable;
        break;
        
      case 'quota_available':
        const info = await adapter.getStorageInfo();
        actualValue = info.available;
        break;
        
      case 'adapter_healthy':
        actualValue = await this.isAdapterHealthy(adapter);
        break;
        
      default:
        return true;
    }

    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '===': return actual === expected;
      case '!==': return actual !== expected;
      default: return true;
    }
  }

  private async isAdapterHealthy(adapter: StorageAdapter): Promise<boolean> {
    try {
      const testKey = '__health_check__';
      const testValue = { timestamp: Date.now() };
      
      await adapter.set(testKey, testValue);
      const retrieved = await adapter.get(testKey);
      await adapter.delete(testKey);
      
      return retrieved !== null && retrieved.timestamp === testValue.timestamp;
    } catch (error) {
      return false;
    }
  }

  private startEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    
    this.evaluationTimer = setInterval(async () => {
      try {
        const bestStrategy = await this.selectBestStrategy();
        const bestAdapter = this.adapters.get(bestStrategy.adapters.primary);
        
        if (bestAdapter && bestAdapter !== this.currentAdapter) {
          await this.switchAdapter(bestAdapter, bestStrategy);
        }
      } catch (error) {
        console.error('Strategy evaluation failed:', error);
      }
    }, this.config.evaluationInterval);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    for (const [type, adapter] of this.adapters.entries()) {
      const healthy = await this.isAdapterHealthy(adapter);
      adapter.isAvailable = healthy;
      
      if (!healthy) {
        this.emitEvent('error', undefined, {
          adapter: type,
          error: 'Health check failed'
        });
      }
    }
    
    // Update metrics
    this.updateStorageUtilization();
  }

  private async updateStorageUtilization(): Promise<void> {
    for (const [type, adapter] of this.adapters.entries()) {
      try {
        this.metrics.storageUtilization[type] = await adapter.getStorageInfo();
      } catch (error) {
        console.warn(`Failed to get storage info for ${type}:`, error);
      }
    }
  }

  private async switchAdapter(newAdapter: StorageAdapter, strategy: StorageStrategy): Promise<void> {
    const oldAdapter = this.currentAdapter;
    
    if (this.config.migrationEnabled) {
      await this.migrateData(oldAdapter, newAdapter);
    }
    
    this.currentAdapter = newAdapter;
    
    this.emitEvent('adapter_switched', undefined, {
      from: oldAdapter.name,
      to: newAdapter.name,
      strategy: strategy.name
    });
  }

  private async migrateData(from: StorageAdapter, to: StorageAdapter): Promise<void> {
    try {
      const keys = await from.keys();
      
      if (keys.length === 0) {
        return;
      }
      
      const migration: StorageMigration = {
        id: this.generateId(),
        from: from.name as StorageAdapterType,
        to: to.name as StorageAdapterType,
        keys,
        status: 'running',
        progress: 0,
        startedAt: Date.now()
      };

      let completed = 0;
      
      for (const key of keys) {
        try {
          const value = await from.get(key);
          if (value !== null) {
            await to.set(key, value);
          }
          completed++;
          migration.progress = (completed / keys.length) * 100;
        } catch (error) {
          console.warn(`Failed to migrate ${key}:`, error);
        }
      }
      
      migration.status = 'completed';
      migration.completedAt = Date.now();
      
    } catch (error) {
      console.error('Data migration failed:', error);
      throw error;
    }
  }

  // Public API methods
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const result = await this.currentAdapter.get<T>(key);
      this.recordOperation('get', startTime, true);
      return result;
    } catch (error) {
      this.recordOperation('get', startTime, false);
      
      if (this.config.fallbackEnabled) {
        return this.tryFallbackGet<T>(key);
      }
      
      throw error;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.currentAdapter.set(key, value);
      this.recordOperation('set', startTime, true);
      this.emitEvent('set', key, { key, value });
    } catch (error) {
      this.recordOperation('set', startTime, false);
      
      if (this.config.fallbackEnabled) {
        await this.tryFallbackSet(key, value);
        return;
      }
      
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.currentAdapter.delete(key);
      this.recordOperation('delete', startTime, true);
      this.emitEvent('delete', key, { key });
    } catch (error) {
      this.recordOperation('delete', startTime, false);
      throw error;
    }
  }

  async clear(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.currentAdapter.clear();
      this.recordOperation('clear', startTime, true);
      this.emitEvent('clear', undefined, {});
    } catch (error) {
      this.recordOperation('clear', startTime, false);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    return this.currentAdapter.keys();
  }

  async getStorageInfo(): Promise<StorageInfo> {
    return this.currentAdapter.getStorageInfo();
  }

  private async tryFallbackGet<T>(key: string): Promise<T | null> {
    const currentStrategy = await this.selectBestStrategy();
    
    for (const fallbackType of currentStrategy.adapters.fallback) {
      const fallbackAdapter = this.adapters.get(fallbackType);
      if (fallbackAdapter && fallbackAdapter.isAvailable) {
        try {
          return await fallbackAdapter.get<T>(key);
        } catch (error) {
          console.warn(`Fallback get failed on ${fallbackType}:`, error);
        }
      }
    }
    
    return null;
  }

  private async tryFallbackSet<T>(key: string, value: T): Promise<void> {
    const currentStrategy = await this.selectBestStrategy();
    
    for (const fallbackType of currentStrategy.adapters.fallback) {
      const fallbackAdapter = this.adapters.get(fallbackType);
      if (fallbackAdapter && fallbackAdapter.isAvailable) {
        try {
          await fallbackAdapter.set(key, value);
          this.emitEvent('set', key, { key, value, fallbackAdapter: fallbackType });
          return;
        } catch (error) {
          console.warn(`Fallback set failed on ${fallbackType}:`, error);
        }
      }
    }
    
    throw new Error('All storage adapters failed');
  }

  private recordOperation(type: string, startTime: number, success: boolean): void {
    const duration = Date.now() - startTime;
    
    this.metrics.totalOperations++;
    
    if (success) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalOperations - 1) + duration) / 
        this.metrics.totalOperations;
    }
    
    this.metrics.successRate = 
      (this.metrics.successRate * (this.metrics.totalOperations - 1) + (success ? 100 : 0)) / 
      this.metrics.totalOperations;
      
    this.metrics.errorRate = 100 - this.metrics.successRate;
    
    const adapterName = this.currentAdapter.name as StorageAdapterType;
    this.metrics.adapterUsage[adapterName] = (this.metrics.adapterUsage[adapterName] || 0) + 1;
  }

  private emitEvent(type: StorageEventType, key: string | undefined, data: any): void {
    const event: StorageEvent = {
      type,
      key,
      adapter: this.currentAdapter.name as StorageAdapterType,
      timestamp: Date.now(),
      source: 'AdaptiveStorageSystem',
      ...data
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in storage event listener:`, error);
        }
      });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event management
  addEventListener(eventType: StorageEventType, callback: (event: StorageEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  removeEventListener(eventType: StorageEventType, callback: (event: StorageEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // Getters
  getCurrentAdapter(): StorageAdapter {
    return this.currentAdapter;
  }

  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  getAvailableAdapters(): StorageAdapterType[] {
    return Array.from(this.adapters.keys()).filter(type => 
      this.adapters.get(type)?.isAvailable
    ) as StorageAdapterType[];
  }

  // Cleanup
  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.eventListeners.clear();
  }
}