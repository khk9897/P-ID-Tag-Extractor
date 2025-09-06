export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  preferences: UserPreferences;
  profile: UserProfile;
  createdAt: number;
  lastActiveAt: number;
}

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface UserProfile {
  firstName: string;
  lastName: string;
  company?: string;
  department?: string;
  role?: string;
  timezone: string;
  locale: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'ko' | 'en';
  notifications: NotificationSettings;
  display: DisplaySettings;
  shortcuts: KeyboardShortcuts;
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds
}

export interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  sessionInvites: boolean;
  conflictAlerts: boolean;
  systemUpdates: boolean;
  mentionAlerts: boolean;
}

export interface DisplaySettings {
  defaultZoom: number;
  showLineNumbers: boolean;
  showGrid: boolean;
  tagOpacity: number;
  relationshipOpacity: number;
  highlightColor: string;
  selectionColor: string;
  commentColors: Record<string, string>; // priority -> color
}

export interface KeyboardShortcuts {
  createTag: string;
  deleteTag: string;
  editTag: string;
  createRelationship: string;
  toggleMode: string;
  nextPage: string;
  prevPage: string;
  zoomIn: string;
  zoomOut: string;
  fitToWidth: string;
  fitToPage: string;
  save: string;
  export: string;
  undo: string;
  redo: string;
  search: string;
  toggleComments: string;
  toggleSidebar: string;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  projectId: string;
  joinedAt: number;
  lastActivityAt: number;
  cursor?: UserCursor;
  selections: UserSelection[];
  locks: string[]; // entity IDs
  isActive: boolean;
}

export interface UserCursor {
  x: number;
  y: number;
  page: number;
  lastUpdated: number;
}

export interface UserSelection {
  id: string;
  type: 'tag' | 'relationship' | 'text' | 'area';
  entityId?: string;
  coordinates: {
    page: number;
    bbox: number[];
  };
  timestamp: number;
}

export interface UserActivity {
  userId: string;
  sessionId: string;
  type: UserActivityType;
  entityType?: 'tag' | 'relationship' | 'description' | 'comment';
  entityId?: string;
  details: any;
  timestamp: number;
}

export type UserActivityType =
  | 'joined_session'
  | 'left_session'
  | 'created_tag'
  | 'updated_tag'
  | 'deleted_tag'
  | 'created_relationship'
  | 'updated_relationship'
  | 'deleted_relationship'
  | 'created_comment'
  | 'updated_comment'
  | 'deleted_comment'
  | 'changed_page'
  | 'changed_zoom'
  | 'exported_data'
  | 'imported_data'
  | 'resolved_conflict';

export interface UserCollaboration {
  sessionId: string;
  participants: UserSession[];
  activeUsers: number;
  totalActions: number;
  conflictCount: number;
  syncStatus: 'active' | 'syncing' | 'error' | 'paused';
  lastSyncAt: number;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: number;
  expiresAt?: number;
}

export type NotificationType =
  | 'session_invite'
  | 'conflict_detected'
  | 'user_joined'
  | 'user_left'
  | 'mention'
  | 'system_update'
  | 'error'
  | 'warning'
  | 'info';

export interface UserRole {
  id: string;
  name: string;
  permissions: RolePermissions;
  isSystem: boolean;
}

export interface RolePermissions {
  sessions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    invite: boolean;
    manage: boolean;
  };
  tags: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    bulk_operations: boolean;
  };
  relationships: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  comments: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    resolve: boolean;
  };
  exports: {
    excel: boolean;
    json: boolean;
    bulk: boolean;
  };
  admin: {
    user_management: boolean;
    system_settings: boolean;
    analytics: boolean;
  };
}

export interface UserTeam {
  id: string;
  name: string;
  description?: string;
  members: UserTeamMember[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface UserTeamMember {
  userId: string;
  roleId: string;
  joinedAt: number;
  invitedBy: string;
  status: 'active' | 'invited' | 'suspended';
}