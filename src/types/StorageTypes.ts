export interface StorageAdapter {
  name: string;
  isAvailable: boolean;
  maxStorageSize?: number;
  currentUsage?: number;
  
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  
  // Batch operations
  getMultiple<T>(keys: string[]): Promise<(T | null)[]>;
  setMultiple<T>(entries: Array<{ key: string; value: T }>): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
  
  // Storage info
  size(): Promise<number>;
  getStorageInfo(): Promise<StorageInfo>;
}

export interface StorageInfo {
  available: number;
  used: number;
  quota?: number;
  percentage: number;
  canStore: boolean;
}

export interface StorageConfig {
  primaryAdapter: StorageAdapterType;
  fallbackAdapters: StorageAdapterType[];
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  cachingEnabled: boolean;
  maxCacheSize: number;
  syncEnabled: boolean;
  conflictResolution: ConflictResolutionStrategy;
}

export type StorageAdapterType = 
  | 'localStorage' 
  | 'sessionStorage' 
  | 'indexedDB' 
  | 'webSQL' 
  | 'memory' 
  | 'cloud' 
  | 'file';

export type ConflictResolutionStrategy = 
  | 'lastWriteWins' 
  | 'firstWriteWins' 
  | 'merge' 
  | 'prompt';

export interface LocalStorageAdapter extends StorageAdapter {
  name: 'localStorage';
}

export interface SessionStorageAdapter extends StorageAdapter {
  name: 'sessionStorage';
}

export interface IndexedDBAdapter extends StorageAdapter {
  name: 'indexedDB';
  dbName: string;
  version: number;
  objectStores: IndexedDBObjectStore[];
  
  createTransaction(stores: string[], mode: 'readonly' | 'readwrite'): Promise<IDBTransaction>;
  query<T>(storeName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]>;
  count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number>;
}

export interface IndexedDBObjectStore {
  name: string;
  keyPath: string | string[];
  autoIncrement: boolean;
  indexes: IndexedDBIndex[];
}

export interface IndexedDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

export interface MemoryAdapter extends StorageAdapter {
  name: 'memory';
  maxSize: number;
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO';
}

export interface CloudAdapter extends StorageAdapter {
  name: 'cloud';
  endpoint: string;
  apiKey?: string;
  authentication: CloudAuthConfig;
  syncInterval: number;
  retryConfig: RetryConfig;
}

export interface CloudAuthConfig {
  type: 'apiKey' | 'oauth' | 'jwt' | 'none';
  credentials: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface FileAdapter extends StorageAdapter {
  name: 'file';
  baseDirectory: string;
  fileExtension: string;
  compression: boolean;
}

export interface StorageOperation {
  id: string;
  type: 'get' | 'set' | 'delete' | 'clear' | 'batch';
  key?: string;
  keys?: string[];
  value?: any;
  adapter: StorageAdapterType;
  timestamp: number;
  duration?: number;
  success: boolean;
  error?: string;
  retryCount: number;
}

export interface StorageMetrics {
  totalOperations: number;
  successRate: number;
  averageResponseTime: number;
  adapterUsage: Record<StorageAdapterType, number>;
  errorRate: number;
  lastSync?: number;
  cacheHitRate: number;
  storageUtilization: Record<StorageAdapterType, StorageInfo>;
}

export interface StorageEvent {
  type: StorageEventType;
  key?: string;
  oldValue?: any;
  newValue?: any;
  adapter: StorageAdapterType;
  timestamp: number;
  source?: string;
}

export type StorageEventType = 
  | 'set' 
  | 'delete' 
  | 'clear' 
  | 'sync' 
  | 'conflict' 
  | 'error' 
  | 'quota_exceeded' 
  | 'adapter_switched';

export interface StorageConflict {
  key: string;
  localValue: any;
  remoteValue: any;
  lastModified: {
    local: number;
    remote: number;
  };
  strategy: ConflictResolutionStrategy;
  resolution?: 'local' | 'remote' | 'merged' | 'manual';
  resolvedValue?: any;
}

export interface CompressionOptions {
  algorithm: 'gzip' | 'lz4' | 'brotli' | 'none';
  level: number;
  threshold: number; // minimum size to compress
}

export interface EncryptionOptions {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2' | 'Argon2id';
  saltLength: number;
  iterations: number;
}

export interface CacheOptions {
  maxSize: number;
  ttl: number; // time to live in milliseconds
  evictionPolicy: 'LRU' | 'LFU' | 'TTL';
  persistToDisk: boolean;
}

export interface SyncOptions {
  enabled: boolean;
  interval: number;
  conflictResolution: ConflictResolutionStrategy;
  retryConfig: RetryConfig;
  batchSize: number;
}

export interface StorageStrategy {
  name: string;
  description: string;
  adapters: {
    primary: StorageAdapterType;
    fallback: StorageAdapterType[];
  };
  conditions: StorageCondition[];
  priority: number;
}

export interface StorageCondition {
  type: 'storage_available' | 'quota_available' | 'adapter_healthy' | 'network_available';
  adapter?: StorageAdapterType;
  threshold?: number;
  operator: '>' | '<' | '>=' | '<=' | '===' | '!==';
  value: any;
}

export interface AdaptiveStorageConfig {
  strategies: StorageStrategy[];
  evaluationInterval: number;
  fallbackEnabled: boolean;
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
  migrationEnabled: boolean;
}

export interface StorageMigration {
  id: string;
  from: StorageAdapterType;
  to: StorageAdapterType;
  keys: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface BackupConfig {
  enabled: boolean;
  interval: number;
  maxBackups: number;
  compression: boolean;
  encryption: boolean;
  storageAdapter: StorageAdapterType;
  includeUserData: boolean;
  includeSystemData: boolean;
}

export interface BackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  checksum: string;
  version: string;
  dataTypes: string[];
  compressed: boolean;
  encrypted: boolean;
}