export interface SessionId {
  id: string;
  userId: string;
  projectId: string;
  timestamp: number;
}

export interface SessionData {
  id: SessionId;
  metadata: SessionMetadata;
  state: SessionState;
  history: SessionHistory;
  locks: SessionLocks;
}

export interface SessionMetadata {
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  version: string;
  owner: string;
  collaborators: string[];
  isActive: boolean;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
}

export interface SessionState {
  currentPage: number;
  scale: number;
  mode: 'view' | 'select';
  selection: {
    startPage: number;
    endPage: number;
    text: string;
    bbox: number[];
  } | null;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filters: {
    pageFilter: number | null;
    showReviewed: boolean;
    showNotReviewed: boolean;
    showWithComments: boolean;
    showWithoutComments: boolean;
  };
  sidebarWidth: number;
  visibilitySettings: Record<string, boolean>;
}

export interface SessionHistory {
  actions: HistoryAction[];
  currentIndex: number;
  maxHistory: number;
}

export interface HistoryAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'bulk';
  entityType: 'tag' | 'relationship' | 'description' | 'comment';
  entityId: string | string[];
  data: any;
  timestamp: number;
  userId: string;
}

export interface SessionLocks {
  entityLocks: Record<string, EntityLock>;
  globalLocks: GlobalLock[];
}

export interface EntityLock {
  entityType: 'tag' | 'relationship' | 'description' | 'comment';
  entityId: string;
  userId: string;
  lockType: 'read' | 'write';
  timestamp: number;
  expiresAt: number;
}

export interface GlobalLock {
  type: 'export' | 'import' | 'bulk_operation';
  userId: string;
  timestamp: number;
  expiresAt: number;
  description?: string;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  userId: string;
  timestamp: number;
  data: any;
}

export type SessionEventType = 
  | 'session_created'
  | 'session_joined'
  | 'session_left'
  | 'state_changed'
  | 'entity_locked'
  | 'entity_unlocked'
  | 'conflict_detected'
  | 'sync_completed'
  | 'error_occurred';

export interface SessionConflict {
  id: string;
  entityType: 'tag' | 'relationship' | 'description' | 'comment';
  entityId: string;
  conflictType: 'concurrent_edit' | 'delete_conflict' | 'version_mismatch';
  localVersion: any;
  remoteVersion: any;
  timestamp: number;
  users: string[];
}

export interface SessionSyncRequest {
  sessionId: string;
  userId: string;
  lastSyncTimestamp: number;
  changes: HistoryAction[];
}

export interface SessionSyncResponse {
  success: boolean;
  conflicts: SessionConflict[];
  remoteChanges: HistoryAction[];
  newSyncTimestamp: number;
  error?: string;
}

export interface SessionPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManage: boolean;
  isOwner: boolean;
}

export interface SessionInvitation {
  id: string;
  sessionId: string;
  inviterId: string;
  inviteeId: string;
  permissions: SessionPermissions;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
}