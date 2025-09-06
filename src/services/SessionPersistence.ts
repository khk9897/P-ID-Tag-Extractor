import { 
  StorageAdapter, 
  StorageConfig, 
  StorageAdapterType,
  CompressionOptions,
  EncryptionOptions,
  BackupConfig,
  BackupMetadata
} from '../types/StorageTypes';
import { SessionData, SessionId } from '../types/SessionTypes';
import { User } from '../types/UserTypes';

export class SessionPersistence {
  private primaryAdapter: StorageAdapter;
  private fallbackAdapters: StorageAdapter[];
  private config: StorageConfig;
  private compressionEnabled: boolean;
  private encryptionEnabled: boolean;
  private backupConfig: BackupConfig;

  constructor(
    primaryAdapter: StorageAdapter,
    fallbackAdapters: StorageAdapter[] = [],
    config: Partial<StorageConfig> = {}
  ) {
    this.primaryAdapter = primaryAdapter;
    this.fallbackAdapters = fallbackAdapters;
    this.config = {
      primaryAdapter: primaryAdapter.name as StorageAdapterType,
      fallbackAdapters: fallbackAdapters.map(a => a.name as StorageAdapterType),
      compressionEnabled: false,
      encryptionEnabled: false,
      cachingEnabled: true,
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      syncEnabled: false,
      conflictResolution: 'lastWriteWins',
      ...config
    };
    
    this.compressionEnabled = this.config.compressionEnabled;
    this.encryptionEnabled = this.config.encryptionEnabled;
    this.backupConfig = {
      enabled: false,
      interval: 3600000, // 1 hour
      maxBackups: 24,
      compression: true,
      encryption: false,
      storageAdapter: 'indexedDB',
      includeUserData: true,
      includeSystemData: true
    };

    this.initializeBackupSystem();
  }

  // Core persistence methods
  async saveSession(session: SessionData): Promise<void> {
    const key = this.getSessionKey(session.id.id);
    const data = await this.processDataForStorage(session);
    
    try {
      await this.primaryAdapter.set(key, data);
    } catch (error) {
      console.warn('Primary storage failed, trying fallback:', error);
      await this.saveThroughFallback(key, data);
    }

    // Update access time
    await this.updateAccessTime(session.id.id);
  }

  async loadSession(sessionId: string): Promise<SessionData | null> {
    const key = this.getSessionKey(sessionId);
    
    try {
      const data = await this.primaryAdapter.get<any>(key);
      if (data) {
        const session = await this.processDataFromStorage(data);
        await this.updateAccessTime(sessionId);
        return session;
      }
    } catch (error) {
      console.warn('Primary storage failed, trying fallback:', error);
    }

    // Try fallback adapters
    for (const adapter of this.fallbackAdapters) {
      try {
        const data = await adapter.get<any>(key);
        if (data) {
          const session = await this.processDataFromStorage(data);
          await this.updateAccessTime(sessionId);
          return session;
        }
      } catch (error) {
        console.warn(`Fallback adapter ${adapter.name} failed:`, error);
      }
    }

    return null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = this.getSessionKey(sessionId);
    
    // Delete from all adapters
    const deletePromises = [this.primaryAdapter, ...this.fallbackAdapters].map(async adapter => {
      try {
        await adapter.delete(key);
      } catch (error) {
        console.warn(`Failed to delete from ${adapter.name}:`, error);
      }
    });

    await Promise.allSettled(deletePromises);
    
    // Clean up related metadata
    await this.cleanupSessionMetadata(sessionId);
  }

  async listSessions(userId?: string): Promise<SessionId[]> {
    const keys = await this.primaryAdapter.keys();
    const sessionKeys = keys.filter(key => key.startsWith('session:'));
    const sessions: SessionId[] = [];

    for (const key of sessionKeys) {
      try {
        const data = await this.primaryAdapter.get<any>(key);
        if (data && data.id) {
          if (!userId || data.id.userId === userId) {
            sessions.push(data.id);
          }
        }
      } catch (error) {
        console.warn(`Failed to load session metadata for ${key}:`, error);
      }
    }

    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  // User data persistence
  async saveUser(user: User): Promise<void> {
    const key = this.getUserKey(user.id);
    const data = await this.processDataForStorage(user);
    
    try {
      await this.primaryAdapter.set(key, data);
    } catch (error) {
      console.warn('Failed to save user:', error);
      await this.saveThroughFallback(key, data);
    }
  }

  async loadUser(userId: string): Promise<User | null> {
    const key = this.getUserKey(userId);
    
    try {
      const data = await this.primaryAdapter.get<any>(key);
      return data ? await this.processDataFromStorage(data) : null;
    } catch (error) {
      console.warn('Failed to load user:', error);
      
      // Try fallback adapters
      for (const adapter of this.fallbackAdapters) {
        try {
          const data = await adapter.get<any>(key);
          if (data) {
            return await this.processDataFromStorage(data);
          }
        } catch (fallbackError) {
          console.warn(`Fallback adapter ${adapter.name} failed:`, fallbackError);
        }
      }
    }
    
    return null;
  }

  // Batch operations
  async saveBatch(items: Array<{ key: string; value: any }>): Promise<void> {
    const processedItems = await Promise.all(
      items.map(async item => ({
        key: item.key,
        value: await this.processDataForStorage(item.value)
      }))
    );

    try {
      if (this.primaryAdapter.setMultiple) {
        await this.primaryAdapter.setMultiple(processedItems);
      } else {
        // Fallback to individual sets
        await Promise.all(
          processedItems.map(item => this.primaryAdapter.set(item.key, item.value))
        );
      }
    } catch (error) {
      console.warn('Batch save failed:', error);
      
      // Try fallback adapters
      for (const adapter of this.fallbackAdapters) {
        try {
          if (adapter.setMultiple) {
            await adapter.setMultiple(processedItems);
          } else {
            await Promise.all(
              processedItems.map(item => adapter.set(item.key, item.value))
            );
          }
          break;
        } catch (fallbackError) {
          console.warn(`Fallback batch save failed on ${adapter.name}:`, fallbackError);
        }
      }
    }
  }

  async loadBatch(keys: string[]): Promise<(any | null)[]> {
    try {
      if (this.primaryAdapter.getMultiple) {
        const data = await this.primaryAdapter.getMultiple(keys);
        return Promise.all(
          data.map(item => item ? this.processDataFromStorage(item) : null)
        );
      } else {
        // Fallback to individual gets
        const promises = keys.map(key => this.primaryAdapter.get(key));
        const data = await Promise.all(promises);
        return Promise.all(
          data.map(item => item ? this.processDataFromStorage(item) : null)
        );
      }
    } catch (error) {
      console.warn('Batch load failed:', error);
      
      // Try fallback adapters
      for (const adapter of this.fallbackAdapters) {
        try {
          if (adapter.getMultiple) {
            const data = await adapter.getMultiple(keys);
            return Promise.all(
              data.map(item => item ? this.processDataFromStorage(item) : null)
            );
          } else {
            const promises = keys.map(key => adapter.get(key));
            const data = await Promise.all(promises);
            return Promise.all(
              data.map(item => item ? this.processDataFromStorage(item) : null)
            );
          }
        } catch (fallbackError) {
          console.warn(`Fallback batch load failed on ${adapter.name}:`, fallbackError);
        }
      }
    }
    
    return keys.map(() => null);
  }

  // Storage management
  async getStorageInfo() {
    const info = await this.primaryAdapter.getStorageInfo();
    const size = await this.primaryAdapter.size();
    
    return {
      ...info,
      totalSize: size,
      adapter: this.primaryAdapter.name,
      fallbackAdapters: this.fallbackAdapters.map(a => a.name)
    };
  }

  async clearStorage(): Promise<void> {
    const adapters = [this.primaryAdapter, ...this.fallbackAdapters];
    
    await Promise.all(adapters.map(async adapter => {
      try {
        await adapter.clear();
      } catch (error) {
        console.warn(`Failed to clear ${adapter.name}:`, error);
      }
    }));
  }

  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoffTime = Date.now() - maxAge;
    const keys = await this.primaryAdapter.keys();
    
    const keysToDelete: string[] = [];
    
    for (const key of keys) {
      if (key.startsWith('session:') || key.startsWith('user:')) {
        try {
          const data = await this.primaryAdapter.get<any>(key);
          if (data && data.metadata && data.metadata.lastAccessedAt < cutoffTime) {
            keysToDelete.push(key);
          }
        } catch (error) {
          console.warn(`Failed to check cleanup candidate ${key}:`, error);
        }
      }
    }

    if (keysToDelete.length > 0) {
      if (this.primaryAdapter.deleteMultiple) {
        await this.primaryAdapter.deleteMultiple(keysToDelete);
      } else {
        await Promise.all(keysToDelete.map(key => this.primaryAdapter.delete(key)));
      }
      
      console.log(`Cleaned up ${keysToDelete.length} expired items`);
    }
  }

  // Backup system
  async createBackup(): Promise<BackupMetadata> {
    if (!this.backupConfig.enabled) {
      throw new Error('Backup system is not enabled');
    }

    const backupId = this.generateBackupId();
    const timestamp = Date.now();
    const keys = await this.primaryAdapter.keys();
    
    const backupData: Record<string, any> = {};
    
    for (const key of keys) {
      if (this.shouldIncludeInBackup(key)) {
        try {
          const data = await this.primaryAdapter.get(key);
          if (data) {
            backupData[key] = data;
          }
        } catch (error) {
          console.warn(`Failed to backup ${key}:`, error);
        }
      }
    }

    let finalData: any = backupData;
    let compressed = false;
    let encrypted = false;

    // Compression
    if (this.backupConfig.compression) {
      finalData = await this.compressData(finalData);
      compressed = true;
    }

    // Encryption
    if (this.backupConfig.encryption) {
      finalData = await this.encryptData(finalData);
      encrypted = true;
    }

    const backupKey = `backup:${backupId}`;
    await this.primaryAdapter.set(backupKey, finalData);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      size: JSON.stringify(finalData).length,
      checksum: await this.calculateChecksum(finalData),
      version: '1.0.0',
      dataTypes: Object.keys(backupData).map(key => key.split(':')[0]),
      compressed,
      encrypted
    };

    await this.primaryAdapter.set(`backup:meta:${backupId}`, metadata);
    
    // Clean up old backups
    await this.cleanupOldBackups();
    
    return metadata;
  }

  async restoreBackup(backupId: string): Promise<void> {
    const metadataKey = `backup:meta:${backupId}`;
    const metadata = await this.primaryAdapter.get<BackupMetadata>(metadataKey);
    
    if (!metadata) {
      throw new Error(`Backup metadata not found for ${backupId}`);
    }

    const backupKey = `backup:${backupId}`;
    let backupData = await this.primaryAdapter.get<any>(backupKey);
    
    if (!backupData) {
      throw new Error(`Backup data not found for ${backupId}`);
    }

    // Decrypt if needed
    if (metadata.encrypted) {
      backupData = await this.decryptData(backupData);
    }

    // Decompress if needed
    if (metadata.compressed) {
      backupData = await this.decompressData(backupData);
    }

    // Restore data
    for (const [key, value] of Object.entries(backupData)) {
      try {
        await this.primaryAdapter.set(key, value);
      } catch (error) {
        console.warn(`Failed to restore ${key}:`, error);
      }
    }
  }

  // Private methods
  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  private async saveThroughFallback(key: string, data: any): Promise<void> {
    for (const adapter of this.fallbackAdapters) {
      try {
        await adapter.set(key, data);
        return;
      } catch (error) {
        console.warn(`Fallback adapter ${adapter.name} failed:`, error);
      }
    }
    throw new Error('All storage adapters failed');
  }

  private async processDataForStorage(data: any): Promise<any> {
    let processedData = data;

    if (this.compressionEnabled) {
      processedData = await this.compressData(processedData);
    }

    if (this.encryptionEnabled) {
      processedData = await this.encryptData(processedData);
    }

    return processedData;
  }

  private async processDataFromStorage(data: any): Promise<any> {
    let processedData = data;

    if (this.encryptionEnabled) {
      processedData = await this.decryptData(processedData);
    }

    if (this.compressionEnabled) {
      processedData = await this.decompressData(processedData);
    }

    return processedData;
  }

  private async compressData(data: any): Promise<string> {
    // Simplified compression - in production, use proper compression library
    return JSON.stringify(data);
  }

  private async decompressData(data: string): Promise<any> {
    // Simplified decompression - in production, use proper compression library
    return JSON.parse(data);
  }

  private async encryptData(data: any): Promise<string> {
    // Simplified encryption - in production, use proper encryption library
    const jsonString = JSON.stringify(data);
    return btoa(jsonString);
  }

  private async decryptData(data: string): Promise<any> {
    // Simplified decryption - in production, use proper encryption library
    const jsonString = atob(data);
    return JSON.parse(jsonString);
  }

  private async updateAccessTime(sessionId: string): Promise<void> {
    const metaKey = `session:meta:${sessionId}`;
    try {
      await this.primaryAdapter.set(metaKey, { lastAccessedAt: Date.now() });
    } catch (error) {
      console.warn('Failed to update access time:', error);
    }
  }

  private async cleanupSessionMetadata(sessionId: string): Promise<void> {
    const metaKey = `session:meta:${sessionId}`;
    try {
      await this.primaryAdapter.delete(metaKey);
    } catch (error) {
      console.warn('Failed to cleanup session metadata:', error);
    }
  }

  private shouldIncludeInBackup(key: string): boolean {
    if (!this.backupConfig.includeUserData && key.startsWith('user:')) {
      return false;
    }
    
    if (!this.backupConfig.includeSystemData && key.startsWith('system:')) {
      return false;
    }

    return true;
  }

  private generateBackupId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async calculateChecksum(data: any): Promise<string> {
    // Simplified checksum - in production, use proper hash function
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async cleanupOldBackups(): Promise<void> {
    const keys = await this.primaryAdapter.keys();
    const backupMetaKeys = keys.filter(key => key.startsWith('backup:meta:'));
    
    if (backupMetaKeys.length <= this.backupConfig.maxBackups) {
      return;
    }

    // Get all backup metadata
    const backups: Array<{ key: string; metadata: BackupMetadata }> = [];
    
    for (const key of backupMetaKeys) {
      try {
        const metadata = await this.primaryAdapter.get<BackupMetadata>(key);
        if (metadata) {
          backups.push({ key, metadata });
        }
      } catch (error) {
        console.warn(`Failed to load backup metadata ${key}:`, error);
      }
    }

    // Sort by timestamp (oldest first)
    backups.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

    // Delete oldest backups
    const backupsToDelete = backups.slice(0, backups.length - this.backupConfig.maxBackups);
    
    for (const backup of backupsToDelete) {
      try {
        await this.primaryAdapter.delete(backup.key);
        await this.primaryAdapter.delete(`backup:${backup.metadata.id}`);
      } catch (error) {
        console.warn(`Failed to delete backup ${backup.metadata.id}:`, error);
      }
    }
  }

  private initializeBackupSystem(): void {
    if (this.backupConfig.enabled && this.backupConfig.interval > 0) {
      setInterval(() => {
        this.createBackup().catch(error => {
          console.error('Automatic backup failed:', error);
        });
      }, this.backupConfig.interval);
    }
  }
}