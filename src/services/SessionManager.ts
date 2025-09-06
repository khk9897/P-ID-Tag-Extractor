import { 
  SessionData, 
  SessionId, 
  SessionMetadata, 
  SessionState, 
  SessionHistory, 
  SessionLocks,
  SessionEvent,
  SessionEventType,
  SessionConflict,
  SessionSyncRequest,
  SessionSyncResponse,
  SessionPermissions,
  SessionInvitation,
  HistoryAction,
  EntityLock,
  GlobalLock
} from '../types/SessionTypes';
import { User, UserSession, UserActivity } from '../types/UserTypes';
import { StorageAdapter } from '../types/StorageTypes';

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData> = new Map();
  private userSessions: Map<string, UserSession[]> = new Map(); // userId -> sessions
  private eventListeners: Map<SessionEventType, Set<(event: SessionEvent) => void>> = new Map();
  private storageAdapter: StorageAdapter;
  private syncInterval: number = 30000; // 30 seconds
  private maxHistorySize: number = 1000;
  private lockTimeout: number = 300000; // 5 minutes

  private constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter;
    this.initializeEventTypes();
    this.startPeriodicSync();
    this.startLockCleanup();
  }

  public static getInstance(storageAdapter?: StorageAdapter): SessionManager {
    if (!SessionManager.instance) {
      if (!storageAdapter) {
        throw new Error('StorageAdapter required for first initialization');
      }
      SessionManager.instance = new SessionManager(storageAdapter);
    }
    return SessionManager.instance;
  }

  private initializeEventTypes(): void {
    const eventTypes: SessionEventType[] = [
      'session_created', 'session_joined', 'session_left', 'state_changed',
      'entity_locked', 'entity_unlocked', 'conflict_detected', 'sync_completed', 'error_occurred'
    ];
    
    eventTypes.forEach(type => {
      this.eventListeners.set(type, new Set());
    });
  }

  // Session lifecycle management
  async createSession(userId: string, projectId: string, metadata: Partial<SessionMetadata>): Promise<SessionData> {
    const sessionId: SessionId = {
      id: this.generateUniqueId(),
      userId,
      projectId,
      timestamp: Date.now()
    };

    const session: SessionData = {
      id: sessionId,
      metadata: {
        name: metadata.name || `Session ${sessionId.id}`,
        description: metadata.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        version: '1.0.0',
        owner: userId,
        collaborators: [userId],
        isActive: true,
        syncStatus: 'synced',
        ...metadata
      },
      state: this.createDefaultState(),
      history: {
        actions: [],
        currentIndex: -1,
        maxHistory: this.maxHistorySize
      },
      locks: {
        entityLocks: {},
        globalLocks: []
      }
    };

    this.sessions.set(sessionId.id, session);
    await this.persistSession(session);
    
    this.emitEvent('session_created', sessionId.id, userId, { sessionId: sessionId.id });
    
    return session;
  }

  async joinSession(sessionId: string, userId: string): Promise<UserSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const userSession: UserSession = {
      userId,
      sessionId,
      projectId: session.id.projectId,
      joinedAt: Date.now(),
      lastActivityAt: Date.now(),
      selections: [],
      locks: [],
      isActive: true
    };

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, []);
    }
    this.userSessions.get(userId)!.push(userSession);

    // Add to collaborators if not already present
    if (!session.metadata.collaborators.includes(userId)) {
      session.metadata.collaborators.push(userId);
      session.metadata.updatedAt = Date.now();
      await this.persistSession(session);
    }

    this.emitEvent('session_joined', sessionId, userId, { userId });
    
    return userSession;
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const userSessions = this.userSessions.get(userId) || [];
    const sessionIndex = userSessions.findIndex(s => s.sessionId === sessionId);
    
    if (sessionIndex >= 0) {
      userSessions[sessionIndex].isActive = false;
      
      // Release all locks held by this user
      await this.releaseAllUserLocks(sessionId, userId);
      
      this.emitEvent('session_left', sessionId, userId, { userId });
    }
  }

  // State management
  async updateSessionState(sessionId: string, userId: string, stateUpdate: Partial<SessionState>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const oldState = { ...session.state };
    session.state = { ...session.state, ...stateUpdate };
    session.metadata.updatedAt = Date.now();
    session.metadata.lastAccessedAt = Date.now();

    await this.persistSession(session);
    
    this.emitEvent('state_changed', sessionId, userId, { 
      oldState, 
      newState: session.state,
      changes: stateUpdate 
    });
  }

  // History management
  async addHistoryAction(sessionId: string, action: Omit<HistoryAction, 'id' | 'timestamp'>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const historyAction: HistoryAction = {
      id: this.generateUniqueId(),
      timestamp: Date.now(),
      ...action
    };

    // Remove any actions after current index (for redo functionality)
    session.history.actions = session.history.actions.slice(0, session.history.currentIndex + 1);
    
    // Add new action
    session.history.actions.push(historyAction);
    session.history.currentIndex = session.history.actions.length - 1;

    // Limit history size
    if (session.history.actions.length > session.history.maxHistory) {
      const excess = session.history.actions.length - session.history.maxHistory;
      session.history.actions.splice(0, excess);
      session.history.currentIndex -= excess;
    }

    session.metadata.updatedAt = Date.now();
    await this.persistSession(session);
  }

  async undo(sessionId: string, userId: string): Promise<HistoryAction | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.history.currentIndex < 0) {
      return null;
    }

    const action = session.history.actions[session.history.currentIndex];
    session.history.currentIndex--;
    session.metadata.updatedAt = Date.now();
    
    await this.persistSession(session);
    return action;
  }

  async redo(sessionId: string, userId: string): Promise<HistoryAction | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.history.currentIndex >= session.history.actions.length - 1) {
      return null;
    }

    session.history.currentIndex++;
    const action = session.history.actions[session.history.currentIndex];
    session.metadata.updatedAt = Date.now();
    
    await this.persistSession(session);
    return action;
  }

  // Lock management
  async acquireLock(sessionId: string, entityType: string, entityId: string, userId: string, lockType: 'read' | 'write'): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const lockKey = `${entityType}:${entityId}`;
    const existingLock = session.locks.entityLocks[lockKey];

    // Check if lock is available
    if (existingLock) {
      if (existingLock.userId === userId) {
        // User already has the lock, extend it
        existingLock.expiresAt = Date.now() + this.lockTimeout;
        await this.persistSession(session);
        return true;
      } else if (existingLock.expiresAt > Date.now()) {
        // Lock is held by another user and still valid
        return false;
      }
    }

    // Acquire new lock
    const lock: EntityLock = {
      entityType: entityType as any,
      entityId,
      userId,
      lockType,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.lockTimeout
    };

    session.locks.entityLocks[lockKey] = lock;
    
    // Add to user's lock list
    const userSessions = this.userSessions.get(userId) || [];
    const userSession = userSessions.find(s => s.sessionId === sessionId);
    if (userSession && !userSession.locks.includes(entityId)) {
      userSession.locks.push(entityId);
    }

    session.metadata.updatedAt = Date.now();
    await this.persistSession(session);
    
    this.emitEvent('entity_locked', sessionId, userId, { entityType, entityId, lockType });
    
    return true;
  }

  async releaseLock(sessionId: string, entityType: string, entityId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const lockKey = `${entityType}:${entityId}`;
    const existingLock = session.locks.entityLocks[lockKey];

    if (existingLock && existingLock.userId === userId) {
      delete session.locks.entityLocks[lockKey];
      
      // Remove from user's lock list
      const userSessions = this.userSessions.get(userId) || [];
      const userSession = userSessions.find(s => s.sessionId === sessionId);
      if (userSession) {
        userSession.locks = userSession.locks.filter(id => id !== entityId);
      }

      session.metadata.updatedAt = Date.now();
      await this.persistSession(session);
      
      this.emitEvent('entity_unlocked', sessionId, userId, { entityType, entityId });
    }
  }

  private async releaseAllUserLocks(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const locksToRelease: string[] = [];
    
    // Find all locks held by this user
    Object.entries(session.locks.entityLocks).forEach(([lockKey, lock]) => {
      if (lock.userId === userId) {
        locksToRelease.push(lockKey);
      }
    });

    // Release all locks
    locksToRelease.forEach(lockKey => {
      delete session.locks.entityLocks[lockKey];
    });

    // Clear user's lock list
    const userSessions = this.userSessions.get(userId) || [];
    const userSession = userSessions.find(s => s.sessionId === sessionId);
    if (userSession) {
      userSession.locks = [];
    }

    if (locksToRelease.length > 0) {
      session.metadata.updatedAt = Date.now();
      await this.persistSession(session);
    }
  }

  // Event management
  addEventListener(eventType: SessionEventType, callback: (event: SessionEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }
  }

  removeEventListener(eventType: SessionEventType, callback: (event: SessionEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emitEvent(type: SessionEventType, sessionId: string, userId: string, data: any): void {
    const event: SessionEvent = {
      id: this.generateUniqueId(),
      sessionId,
      type,
      userId,
      timestamp: Date.now(),
      data
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }
  }

  // Utility methods
  private createDefaultState(): SessionState {
    return {
      currentPage: 1,
      scale: 1,
      mode: 'view',
      selection: null,
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      filters: {
        pageFilter: null,
        showReviewed: true,
        showNotReviewed: true,
        showWithComments: true,
        showWithoutComments: true
      },
      sidebarWidth: 400,
      visibilitySettings: {}
    };
  }

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async persistSession(session: SessionData): Promise<void> {
    try {
      await this.storageAdapter.set(`session:${session.id.id}`, session);
    } catch (error) {
      console.error('Failed to persist session:', error);
      this.emitEvent('error_occurred', session.id.id, session.metadata.owner, { error: error.message });
    }
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      this.syncAllSessions().catch(error => {
        console.error('Periodic sync failed:', error);
      });
    }, this.syncInterval);
  }

  private startLockCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredLocks().catch(error => {
        console.error('Lock cleanup failed:', error);
      });
    }, 60000); // Run every minute
  }

  private async syncAllSessions(): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.metadata.isActive) {
        await this.persistSession(session);
      }
    }
  }

  private async cleanupExpiredLocks(): Promise<void> {
    const now = Date.now();
    
    for (const session of this.sessions.values()) {
      let hasExpiredLocks = false;
      
      // Clean up expired entity locks
      Object.entries(session.locks.entityLocks).forEach(([lockKey, lock]) => {
        if (lock.expiresAt <= now) {
          delete session.locks.entityLocks[lockKey];
          hasExpiredLocks = true;
          
          this.emitEvent('entity_unlocked', session.id.id, lock.userId, {
            entityType: lock.entityType,
            entityId: lock.entityId,
            reason: 'expired'
          });
        }
      });

      // Clean up expired global locks
      session.locks.globalLocks = session.locks.globalLocks.filter(lock => {
        if (lock.expiresAt <= now) {
          hasExpiredLocks = true;
          return false;
        }
        return true;
      });

      if (hasExpiredLocks) {
        session.metadata.updatedAt = Date.now();
        await this.persistSession(session);
      }
    }
  }

  // Public getters
  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  getUserSessions(userId: string): UserSession[] {
    return this.userSessions.get(userId) || [];
  }

  getActiveSessions(): SessionData[] {
    return Array.from(this.sessions.values()).filter(session => session.metadata.isActive);
  }

  isLocked(sessionId: string, entityType: string, entityId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const lockKey = `${entityType}:${entityId}`;
    const lock = session.locks.entityLocks[lockKey];
    
    return lock ? lock.expiresAt > Date.now() : false;
  }

  getLockOwner(sessionId: string, entityType: string, entityId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const lockKey = `${entityType}:${entityId}`;
    const lock = session.locks.entityLocks[lockKey];
    
    return lock && lock.expiresAt > Date.now() ? lock.userId : null;
  }
}