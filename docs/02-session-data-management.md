# 세션 데이터 관리 시스템 설계서

## 📋 개요

P&ID Tag Extractor의 다중 사용자 및 다중 프로젝트 지원을 위한 세션 데이터 관리 시스템 설계 문서입니다. 기존 단일 사용자/단일 프로젝트 구조를 확장하여 **협업 환경과 대규모 작업**을 지원하는 것이 목표입니다.

---

## 🎯 주요 요구사항

### 1. **다중 프로젝트 시나리오**
- **동시 프로젝트 작업**: 엔지니어가 여러 P&ID 도면을 동시에 검토
- **프로젝트 간 전환**: 빠른 컨텍스트 스위칭 지원
- **프로젝트별 설정**: 각 프로젝트의 독립적인 패턴, 공차 설정
- **작업 상태 보존**: 프로젝트 전환 시 작업 상태 완전 복원

### 2. **다중 사용자 시나리오**
- **역할 기반 접근**: Admin, Engineer, Reviewer, Viewer 권한
- **협업 기능**: 실시간 댓글, 태그 검토 상태 공유
- **개인화**: 사용자별 UI 설정, 키보드 단축키, 작업 환경
- **충돌 해결**: 동시 편집 시 지능적 병합 및 충돌 해결

### 3. **세션 관리**
- **자동 복구**: 브라우저 크래시, 탭 종료 시 작업 상태 복원
- **탭 동기화**: 같은 프로젝트의 여러 탭 간 실시간 동기화
- **오프라인 지원**: 네트워크 연결 없이도 작업 계속 가능
- **성능 최적화**: 대용량 데이터 효율적 처리

---

## 🏗️ 아키텍처 설계

### 1. **파일 구조**

```
src/
├── stores/
│   ├── session/
│   │   ├── SessionStore.ts              # Zustand 세션 스토어
│   │   ├── SessionManager.ts            # 세션 생명주기 관리
│   │   ├── SessionPersistence.ts        # 세션 저장/복원
│   │   ├── SessionRecovery.ts           # 세션 복구 서비스
│   │   └── types/
│   │       ├── SessionTypes.ts          # 세션 타입 정의
│   │       ├── UserTypes.ts             # 사용자 타입 정의
│   │       └── StorageTypes.ts          # 저장소 인터페이스
│   ├── project/
│   │   ├── ProjectStore.ts              # 프로젝트별 상태 관리
│   │   ├── ProjectSwitcher.ts           # 프로젝트 전환 로직
│   │   ├── ProjectRepository.ts         # 프로젝트 CRUD 작업
│   │   └── ProjectCollaborator.ts       # 협업 기능
│   └── user/
│       ├── UserStore.ts                 # 사용자 상태 관리
│       ├── UserPreferences.ts           # 개인설정 관리
│       ├── UserAuthentication.ts        # 인증 (선택사항)
│       └── UserProfile.ts               # 프로필 관리
├── services/
│   ├── storage/
│   │   ├── SessionStorage.ts            # 저장소 추상화
│   │   ├── LocalStorageAdapter.ts       # localStorage 구현
│   │   ├── IndexedDBAdapter.ts          # IndexedDB 구현
│   │   ├── CloudStorageAdapter.ts       # 클라우드 저장소 (향후)
│   │   └── CompressionService.ts        # 데이터 압축/해제
│   ├── synchronization/
│   │   ├── SessionSynchronizer.ts       # 탭 간 동기화
│   │   ├── ConflictResolver.ts          # 충돌 해결
│   │   ├── ChangeTracker.ts             # 변경사항 추적
│   │   └── EventBroadcaster.ts          # 이벤트 브로드캐스트
│   └── migration/
│       ├── SessionMigration.ts          # 세션 데이터 마이그레이션
│       └── VersionCompatibility.ts      # 버전 호환성
└── components/
    ├── session/
    │   ├── SessionSwitcher.tsx          # 세션 전환 UI
    │   ├── ProjectTabs.tsx              # 프로젝트 탭 인터페이스
    │   ├── UserMenu.tsx                 # 사용자 메뉴
    │   └── ConflictResolutionModal.tsx  # 충돌 해결 UI
    └── collaboration/
        ├── UserIndicator.tsx            # 활성 사용자 표시
        ├── SharedCursor.tsx             # 공유 커서 (향후)
        └── ActivityFeed.tsx             # 활동 피드
```

---

## 📊 데이터 구조 설계

### 1. **세션 식별자**

```typescript
export interface SessionIdentifier {
  sessionId: string;           // UUID v4 (36자 → 22자 Base64 압축)
  userId: string;              // 사용자 고유 ID
  projectId: string;           // 프로젝트 고유 ID
  createdAt: number;           // 세션 생성 타임스탬프
  lastAccessedAt: number;      // 마지막 접근 시간
  version: string;             // 세션 데이터 버전
}

export interface SessionMetadata {
  identifier: SessionIdentifier;
  displayName: string;         // 사용자 지정 세션 이름
  description?: string;        // 세션 설명
  tags: string[];             // 세션 태그 (검색용)
  isStarred: boolean;         // 즐겨찾기 여부
  autoSaveEnabled: boolean;    // 자동 저장 활성화
  syncEnabled: boolean;       // 동기화 활성화
}
```

### 2. **세션 작업공간 상태**

```typescript
export interface WorkspaceSession {
  // PDF 뷰어 상태
  viewer: {
    currentPage: number;
    scale: number;
    viewMode: ViewMode;
    viewport: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    rotation: number;           // PDF 회전 각도
  };

  // 선택 및 상호작용 상태
  selection: {
    selectedItems: SelectedItem[];
    selectionMode: SelectionMode;
    multiSelectEnabled: boolean;
    lastSelectedId?: string;
    selectionBounds?: BoundingBox;
  };

  // 편집 상태
  editing: {
    mode: EditMode;
    activeToolId?: string;
    relationshipStartTag?: string;
    clipboardData?: ClipboardData;
    dragState?: DragState;
  };

  // 실행 취소/다시 실행
  history: {
    undoStack: UndoAction[];
    redoStack: RedoAction[];
    maxHistorySize: number;
    currentVersion: number;
  };

  // 필터 및 검색
  filters: {
    tagFilters: TagFilterState;
    relationshipFilters: RelationshipFilterState;
    pageFilter: PageFilterState;
    searchQuery: string;
    searchResults: SearchResult[];
  };
}

export interface SelectedItem {
  id: string;
  type: 'tag' | 'relationship' | 'description' | 'rawText';
  page: number;
  bbox: BoundingBox;
  metadata?: Record<string, any>;
}

export type SelectionMode = 'single' | 'multiple' | 'area' | 'lasso';
export type EditMode = 'select' | 'create' | 'connect' | 'annotate';
```

### 3. **UI 상태 관리**

```typescript
export interface UISession {
  // 패널 및 레이아웃
  layout: {
    sidePanelVisible: boolean;
    sidePanelWidth: number;
    sidePanelPosition: 'left' | 'right';
    headerCollapsed: boolean;
    footerVisible: boolean;
  };

  // 탭 및 내비게이션
  navigation: {
    activeTabId: string;
    openTabs: TabState[];
    tabHistory: string[];
    breadcrumbs: BreadcrumbItem[];
  };

  // 모달 및 다이얼로그
  modals: {
    openModals: ModalState[];
    modalStack: string[];
    backdropVisible: boolean;
  };

  // 알림 및 피드백
  notifications: {
    activeNotifications: Notification[];
    toastQueue: ToastMessage[];
    progressIndicators: ProgressState[];
  };

  // 사용자 인터페이스 설정
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'ko' | 'en';
    density: 'compact' | 'normal' | 'comfortable';
    animations: boolean;
    soundEnabled: boolean;
  };
}

export interface TabState {
  id: string;
  title: string;
  icon?: string;
  isActive: boolean;
  isDirty: boolean;
  isPinned: boolean;
  canClose: boolean;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  actions?: NotificationAction[];
  isRead: boolean;
}
```

### 4. **임시 상태 (메모리 전용)**

```typescript
export interface TemporarySession {
  // 실시간 상태 (저장하지 않음)
  realtime: {
    mousePosition: { x: number; y: number };
    keyboardState: KeyboardState;
    activeCursor: CursorState;
    hoverState: HoverState;
    focusState: FocusState;
  };

  // 로딩 상태
  loading: {
    globalLoading: boolean;
    componentLoading: Map<string, boolean>;
    progressStates: Map<string, ProgressState>;
    errorStates: Map<string, ErrorState>;
  };

  // 네트워크 상태
  network: {
    isOnline: boolean;
    connectionType: string;
    lastSyncTime: number;
    pendingSyncActions: SyncAction[];
  };

  // 성능 메트릭 (디버그용)
  performance: {
    renderTimes: RenderMetric[];
    memoryUsage: MemoryMetric[];
    operationTimes: OperationMetric[];
  };
}

export interface KeyboardState {
  pressedKeys: Set<string>;
  modifierKeys: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
  lastKeyPress: number;
}
```

---

## 👥 다중 사용자 지원

### 1. **사용자 프로필 시스템**

```typescript
export interface UserProfile {
  // 기본 정보
  userId: string;              // 고유 사용자 ID
  username: string;            // 사용자명 (영숫자, 4-20자)
  displayName: string;         // 표시명 (한글 포함)
  email?: string;              // 이메일 (선택사항)
  avatar?: string;             // 아바타 이미지 URL
  
  // 역할 및 권한
  role: UserRole;
  permissions: UserPermissions;
  
  // 계정 상태
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
  
  // 개인 설정
  preferences: UserPreferences;
  workspaceSettings: WorkspaceSettings;
  
  // 통계 정보
  statistics: UserStatistics;
}

export type UserRole = 'admin' | 'engineer' | 'reviewer' | 'viewer' | 'guest';

export interface UserPermissions {
  // 프로젝트 관련
  canCreateProject: boolean;
  canDeleteProject: boolean;
  canShareProject: boolean;
  canExportProject: boolean;
  
  // 데이터 편집
  canEditTags: boolean;
  canEditRelationships: boolean;
  canEditDescriptions: boolean;
  canDeleteData: boolean;
  
  // 시스템 설정
  canChangeSettings: boolean;
  canManageUsers: boolean;
  canAccessDeveloperTools: boolean;
  
  // 협업 기능
  canAddComments: boolean;
  canResolveComments: boolean;
  canAssignTasks: boolean;
  canApproveChanges: boolean;
}

export interface UserStatistics {
  totalProjects: number;
  totalTags: number;
  totalRelationships: number;
  totalComments: number;
  lastActiveDate: number;
  averageSessionDuration: number;
  productivityScore: number;
}
```

### 2. **사용자 개인 설정**

```typescript
export interface UserPreferences {
  // 언어 및 지역화
  language: 'ko' | 'en' | 'ja' | 'zh';
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';
  timeFormat: '12h' | '24h';
  
  // 테마 및 UI
  theme: 'light' | 'dark' | 'system' | 'high-contrast';
  colorScheme: ColorScheme;
  fontFamily: string;
  fontSize: number;
  uiDensity: 'compact' | 'normal' | 'comfortable';
  
  // 동작 및 상호작용
  animations: boolean;
  soundEffects: boolean;
  haptiFeedback: boolean;
  keyboardShortcuts: KeyboardShortcuts;
  mouseSettings: MouseSettings;
  
  // 자동화 설정
  autoSave: {
    enabled: boolean;
    interval: number;          // 초 단위
    maxBackups: number;
  };
  
  autoSync: {
    enabled: boolean;
    conflicts: 'merge' | 'overwrite' | 'ask';
  };
  
  // 알림 설정
  notifications: NotificationSettings;
}

export interface KeyboardShortcuts {
  [action: string]: string[];   // 액션 -> 단축키 조합들
  // 예: 'createTag': ['Ctrl+N', 'Cmd+N']
  //     'selectAll': ['Ctrl+A']
  //     'undo': ['Ctrl+Z']
}

export interface MouseSettings {
  sensitivity: number;
  doubleClickSpeed: number;
  wheelScrollLines: number;
  gesturesEnabled: boolean;
}

export interface NotificationSettings {
  desktop: boolean;
  sound: boolean;
  email: boolean;
  
  // 알림 타입별 설정
  projectShared: boolean;
  commentAdded: boolean;
  tagReviewed: boolean;
  systemUpdate: boolean;
  
  // 방해금지 모드
  doNotDisturb: {
    enabled: boolean;
    schedule: {
      start: string;    // "22:00"
      end: string;      // "08:00"
      days: number[];   // 0=일요일, 1=월요일, ...
    };
  };
}
```

### 3. **작업공간 설정**

```typescript
export interface WorkspaceSettings {
  // PDF 뷰어 기본값
  defaultViewer: {
    scale: number;
    viewMode: ViewMode;
    showGrid: boolean;
    snapToGrid: boolean;
    gridSize: number;
  };
  
  // 태그 및 라벨링
  defaultPatterns: PatternConfig;
  defaultTolerances: ToleranceConfig;
  defaultColors: ColorSettings;
  
  // 필터 및 검색
  defaultFilters: {
    showReviewedTags: boolean;
    showUnreviewedTags: boolean;
    showCommentsWithPriority: CommentPriority[];
    defaultPageFilter: 'all' | 'current';
  };
  
  // 내보내기 설정
  exportSettings: {
    defaultFormat: 'excel' | 'csv' | 'json';
    includeComments: boolean;
    includeDescriptions: boolean;
    includeRelationships: boolean;
    compression: boolean;
  };
  
  // 성능 최적화
  performance: {
    maxUndoSteps: number;
    renderBatchSize: number;
    lazyLoadThreshold: number;
    cacheSize: number;          // MB
  };
  
  // 개발자 도구
  developer: {
    debugMode: boolean;
    showPerformanceMetrics: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    enableExperimentalFeatures: boolean;
  };
}
```

---

## 🗂️ 프로젝트 관리 시스템

### 1. **프로젝트 데이터 구조**

```typescript
export interface ProjectData {
  // 프로젝트 메타데이터
  metadata: ProjectMetadata;
  
  // 핵심 데이터 (영구 저장)
  persistent: {
    tags: Tag[];
    relationships: Relationship[];
    descriptions: Description[];
    equipmentShortSpecs: EquipmentShortSpec[];
    comments: Comment[];
    loops: Loop[];
  };
  
  // 프로젝트 설정
  settings: ProjectSettings;
  
  // 협업 정보
  collaboration: ProjectCollaboration;
  
  // 버전 관리
  version: ProjectVersion;
}

export interface ProjectMetadata {
  projectId: string;
  name: string;
  description?: string;
  category: ProjectCategory;
  tags: string[];
  
  // 파일 정보
  pdfFileName: string;
  pdfFileSize: number;
  pdfPageCount: number;
  pdfChecksum: string;         // 파일 무결성 검증
  
  // 생성/수정 정보
  createdBy: string;
  createdAt: number;
  lastModifiedBy: string;
  lastModifiedAt: number;
  
  // 상태 정보
  status: ProjectStatus;
  progress: ProjectProgress;
  priority: ProjectPriority;
}

export type ProjectCategory = 
  | 'process-flow'           // 공정 흐름도
  | 'piping-instrumentation' // P&ID
  | 'electrical'             // 전기 계통도  
  | 'mechanical'             // 기계 도면
  | 'architecture'           // 건축 도면
  | 'other';

export type ProjectStatus = 
  | 'draft'                  // 초안
  | 'in-progress'            // 진행 중
  | 'review'                 // 검토 중
  | 'approved'               // 승인됨
  | 'archived';              // 보관됨

export type ProjectPriority = 'low' | 'normal' | 'high' | 'critical';

export interface ProjectProgress {
  totalItems: number;        // 전체 아이템 수
  processedItems: number;    // 처리된 아이템 수
  reviewedItems: number;     // 검토된 아이템 수
  approvedItems: number;     // 승인된 아이템 수
  
  completionPercentage: number;
  estimatedCompletionDate?: number;
  
  milestones: ProjectMilestone[];
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  targetDate: number;
  completedDate?: number;
  status: 'pending' | 'completed' | 'overdue';
}
```

### 2. **프로젝트 설정**

```typescript
export interface ProjectSettings {
  // 패턴 및 인식 설정
  patterns: PatternConfig;
  tolerances: ToleranceConfig;
  
  // 시각화 설정
  colors: ColorSettings;
  visibility: VisibilitySettings;
  
  // 자동화 설정
  automation: {
    autoGenerateLoops: boolean;
    autoRemoveWhitespace: boolean;
    autoLinkDescriptions: boolean;
    autoLinkEquipmentSpecs: boolean;
    
    // 배치 처리 설정
    batchSize: number;
    processingTimeout: number;
  };
  
  // 검증 규칙
  validation: {
    requireTagReview: boolean;
    allowDuplicateTags: boolean;
    enforceNamingConventions: boolean;
    mandatoryFields: string[];
    customValidationRules: ValidationRule[];
  };
  
  // 백업 및 복구
  backup: {
    autoBackupEnabled: boolean;
    backupInterval: number;      // 분 단위
    maxBackupFiles: number;
    backupLocation: 'local' | 'cloud';
  };
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'pattern' | 'length' | 'required' | 'custom';
  targetFields: string[];
  rule: string | RegExp | Function;
  severity: 'error' | 'warning' | 'info';
  isActive: boolean;
}
```

### 3. **협업 관리**

```typescript
export interface ProjectCollaboration {
  // 소유권 및 권한
  ownership: {
    ownerId: string;
    ownerPermissions: ProjectPermissions;
    transferHistory: OwnershipTransfer[];
  };
  
  // 협업자 관리
  collaborators: ProjectCollaborator[];
  invitations: ProjectInvitation[];
  
  // 공유 설정
  sharing: {
    isPublic: boolean;
    publicUrl?: string;
    allowAnonymousView: boolean;
    requirePasswordForAccess: boolean;
    accessPassword?: string;
    expirationDate?: number;
  };
  
  // 활동 추적
  activity: {
    recentActivities: ActivityRecord[];
    activitySummary: ActivitySummary;
    auditLog: AuditLogEntry[];
  };
  
  // 실시간 협업
  realtime: {
    activeSessions: ActiveSession[];
    broadcastChannel: string;
    conflictResolutionPolicy: ConflictResolutionPolicy;
  };
}

export interface ProjectCollaborator {
  userId: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermissions;
  joinedAt: number;
  lastActiveAt: number;
  invitedBy: string;
  
  // 작업 할당
  assignedAreas: AssignedArea[];
  completedTasks: number;
  totalTasks: number;
  
  // 개인 노트 (다른 협업자에게 비공개)
  privateNotes: string;
}

export type CollaboratorRole = 
  | 'owner'        // 전체 권한
  | 'admin'        // 관리 권한 (사용자 관리 제외)
  | 'editor'       // 편집 권한
  | 'reviewer'     // 검토 권한 (편집 불가)
  | 'viewer';      // 보기 전용

export interface AssignedArea {
  areaId: string;
  areaName: string;
  pageNumbers: number[];
  tagCategories: CategoryType[];
  assignedAt: number;
  dueDate?: number;
  status: 'assigned' | 'in-progress' | 'completed' | 'overdue';
}

export interface ActivityRecord {
  id: string;
  userId: string;
  action: ActivityAction;
  timestamp: number;
  details: ActivityDetails;
  affectedEntities: EntityReference[];
}

export type ActivityAction = 
  | 'tag-created' | 'tag-updated' | 'tag-deleted'
  | 'relationship-created' | 'relationship-updated' | 'relationship-deleted'
  | 'comment-added' | 'comment-resolved'
  | 'project-shared' | 'user-invited'
  | 'settings-changed' | 'backup-created';

export interface ActiveSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  lastHeartbeat: number;
  currentPage: number;
  cursorPosition?: { x: number; y: number };
  isIdle: boolean;
}
```

---

## 💾 저장소 전략

### 1. **적응형 저장소 시스템**

```typescript
export interface StorageStrategy {
  // 기본 CRUD 연산
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // 배치 연산
  saveMultiple<T>(entries: Map<string, T>): Promise<void>;
  loadMultiple<T>(keys: string[]): Promise<Map<string, T>>;
  deleteMultiple(keys: string[]): Promise<void>;
  
  // 메타데이터
  getSize(key: string): Promise<number>;
  getLastModified(key: string): Promise<number>;
  list(prefix?: string): Promise<string[]>;
  
  // 정리 및 최적화
  cleanup(olderThan: number): Promise<void>;
  optimize(): Promise<void>;
  getStorageInfo(): Promise<StorageInfo>;
}

export interface StorageInfo {
  totalSize: number;
  availableSize: number;
  itemCount: number;
  oldestItem: { key: string; timestamp: number };
  largestItem: { key: string; size: number };
  compressionRatio: number;
}

// 크기 기반 자동 전환 저장소
export class AdaptiveStorage implements StorageStrategy {
  private localStorage = new LocalStorageAdapter();
  private indexedDB = new IndexedDBAdapter();
  private cloudStorage = new CloudStorageAdapter();
  
  // 저장소 선택 기준
  private readonly LOCAL_STORAGE_LIMIT = 5 * 1024 * 1024;     // 5MB
  private readonly INDEXED_DB_LIMIT = 100 * 1024 * 1024;     // 100MB
  
  async save<T>(key: string, data: T): Promise<void> {
    const serialized = await this.serialize(data);
    const size = new Blob([serialized]).size;
    
    if (size < this.LOCAL_STORAGE_LIMIT) {
      // 작은 데이터: localStorage (빠른 접근)
      await this.localStorage.save(key, data);
      
    } else if (size < this.INDEXED_DB_LIMIT) {
      // 중간 데이터: IndexedDB (대용량 지원)
      await this.indexedDB.save(key, data);
      
    } else {
      // 대용량 데이터: 클라우드 저장소
      await this.cloudStorage.save(key, data);
    }
    
    // 메타데이터는 항상 localStorage에
    await this.localStorage.save(`${key}:meta`, {
      size,
      location: this.getStorageLocation(size),
      lastModified: Date.now(),
      checksum: await this.calculateChecksum(serialized)
    });
  }
  
  async load<T>(key: string): Promise<T | null> {
    const metadata = await this.localStorage.load<StorageMetadata>(`${key}:meta`);
    if (!metadata) return null;
    
    switch (metadata.location) {
      case 'localStorage':
        return await this.localStorage.load<T>(key);
      case 'indexedDB':
        return await this.indexedDB.load<T>(key);
      case 'cloudStorage':
        return await this.cloudStorage.load<T>(key);
      default:
        throw new Error(`Unknown storage location: ${metadata.location}`);
    }
  }
}
```

### 2. **압축 및 직렬화**

```typescript
export interface CompressionService {
  compress(data: string): Promise<Uint8Array>;
  decompress(compressed: Uint8Array): Promise<string>;
  getCompressionRatio(original: string, compressed: Uint8Array): number;
}

// MessagePack + GZIP 압축
export class MessagePackCompression implements CompressionService {
  async compress(data: string): Promise<Uint8Array> {
    // 1. JSON → MessagePack 변환 (타입 최적화)
    const obj = JSON.parse(data);
    const packed = msgpack.encode(obj);
    
    // 2. GZIP 압축
    const compressed = await this.gzipCompress(packed);
    
    return compressed;
  }
  
  async decompress(compressed: Uint8Array): Promise<string> {
    // 1. GZIP 해제
    const packed = await this.gzipDecompress(compressed);
    
    // 2. MessagePack → JSON 변환
    const obj = msgpack.decode(packed);
    
    return JSON.stringify(obj);
  }
  
  // 추가 최적화: 중복 문자열 제거
  private optimizeStrings(obj: any): any {
    const stringMap = new Map<string, number>();
    let stringIndex = 0;
    
    // 1차 순회: 문자열 매핑 생성
    this.traverseObject(obj, (value) => {
      if (typeof value === 'string' && value.length > 10) {
        if (!stringMap.has(value)) {
          stringMap.set(value, stringIndex++);
        }
      }
    });
    
    // 2차 순회: 문자열을 인덱스로 치환
    const optimized = this.replaceStrings(obj, stringMap);
    
    return {
      data: optimized,
      stringTable: Array.from(stringMap.keys())
    };
  }
}
```

### 3. **캐시 관리**

```typescript
export interface CacheManager {
  // 캐시 CRUD
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // 캐시 정책
  setDefaultTTL(seconds: number): void;
  setMaxSize(bytes: number): void;
  setEvictionPolicy(policy: EvictionPolicy): void;
  
  // 캐시 상태
  getStats(): Promise<CacheStats>;
  
  // 배치 연산
  setMultiple<T>(entries: Map<string, CacheEntry<T>>): Promise<void>;
  getMultiple<T>(keys: string[]): Promise<Map<string, T>>;
}

export interface CacheEntry<T> {
  value: T;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export type EvictionPolicy = 'LRU' | 'LFU' | 'FIFO' | 'TTL';

export interface CacheStats {
  totalSize: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  hitRatio: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

// 다층 캐시 시스템
export class MultiLevelCache implements CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private diskCache: StorageStrategy;
  
  constructor(
    private readonly memoryLimit: number = 50 * 1024 * 1024,  // 50MB
    private readonly diskLimit: number = 500 * 1024 * 1024     // 500MB
  ) {
    this.diskCache = new IndexedDBAdapter();
  }
  
  async get<T>(key: string): Promise<T | null> {
    // L1: 메모리 캐시 확인
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiry > Date.now()) {
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.value;
    }
    
    // L2: 디스크 캐시 확인
    const diskEntry = await this.diskCache.load<CacheEntry<T>>(`cache:${key}`);
    if (diskEntry && diskEntry.expiry > Date.now()) {
      // 메모리로 승격
      this.promoteToMemory(key, diskEntry);
      return diskEntry.value;
    }
    
    return null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiry: Date.now() + ttl * 1000,
      accessCount: 1,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    };
    
    // 메모리 용량 확인
    if (entry.size < this.memoryLimit * 0.1) {  // 메모리 한도의 10% 미만만 메모리에
      await this.ensureMemorySpace(entry.size);
      this.memoryCache.set(key, entry);
    }
    
    // 항상 디스크에도 저장
    await this.diskCache.save(`cache:${key}`, entry);
  }
}
```

---

## 🔄 동기화 및 충돌 해결

### 1. **실시간 동기화**

```typescript
export interface SynchronizationService {
  // 동기화 제어
  enableSync(projectId: string): Promise<void>;
  disableSync(projectId: string): Promise<void>;
  pauseSync(projectId: string): Promise<void>;
  resumeSync(projectId: string): Promise<void>;
  
  // 변경사항 전파
  broadcastChange(change: ChangeEvent): Promise<void>;
  subscribeToChanges(callback: ChangeHandler): () => void;
  
  // 충돌 관리
  detectConflicts(localState: any, remoteState: any): Conflict[];
  resolveConflict(conflict: Conflict, resolution: ConflictResolution): Promise<void>;
  
  // 동기화 상태
  getSyncStatus(projectId: string): Promise<SyncStatus>;
  getSyncHistory(projectId: string): Promise<SyncEvent[]>;
}

export interface ChangeEvent {
  id: string;
  projectId: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  
  operation: 'create' | 'update' | 'delete';
  before?: any;
  after?: any;
  
  metadata: {
    source: 'user' | 'system' | 'import';
    reason: string;
    batchId?: string;
  };
}

export type ChangeType = 
  | 'tag-change' | 'relationship-change' | 'description-change'
  | 'comment-change' | 'setting-change' | 'ui-change';

export type EntityType = 
  | 'tag' | 'relationship' | 'description' | 'equipment-spec'
  | 'comment' | 'loop' | 'raw-text' | 'setting';

// 브로드캐스트 채널 기반 탭 동기화
export class TabSynchronizer implements SynchronizationService {
  private channels = new Map<string, BroadcastChannel>();
  private changeBuffer = new Map<string, ChangeEvent[]>();
  private conflictQueue = new Map<string, Conflict[]>();
  
  async enableSync(projectId: string): Promise<void> {
    const channelName = `pid-project-${projectId}`;
    const channel = new BroadcastChannel(channelName);
    
    channel.addEventListener('message', (event) => {
      this.handleRemoteChange(event.data);
    });
    
    this.channels.set(projectId, channel);
    
    // 기존 탭들에게 새 참가자 알림
    await this.broadcastChange({
      id: generateId(),
      projectId,
      sessionId: getCurrentSessionId(),
      userId: getCurrentUserId(),
      timestamp: Date.now(),
      type: 'system-change',
      entityType: 'setting',
      entityId: 'sync-status',
      operation: 'update',
      after: { action: 'sync-enabled' },
      metadata: {
        source: 'system',
        reason: 'sync-initialization'
      }
    });
  }
  
  async broadcastChange(change: ChangeEvent): Promise<void> {
    const channel = this.channels.get(change.projectId);
    if (!channel) return;
    
    // 변경사항을 버퍼에 저장 (중복 제거 및 배치 처리)
    this.addToBuffer(change);
    
    // 즉시 전송 (중요한 변경사항) 또는 배치 전송
    if (this.isHighPriority(change)) {
      channel.postMessage(change);
    } else {
      // 100ms 후 배치 전송
      setTimeout(() => this.flushBuffer(change.projectId), 100);
    }
  }
  
  private handleRemoteChange(change: ChangeEvent): void {
    // 자신이 보낸 변경사항은 무시
    if (change.sessionId === getCurrentSessionId()) return;
    
    // 충돌 검사
    const conflicts = this.detectConflicts(change);
    
    if (conflicts.length > 0) {
      // 충돌을 큐에 추가하고 사용자에게 알림
      this.conflictQueue.set(change.projectId, [
        ...this.conflictQueue.get(change.projectId) || [],
        ...conflicts
      ]);
      
      this.notifyConflict(conflicts);
    } else {
      // 충돌 없음: 변경사항 적용
      this.applyRemoteChange(change);
    }
  }
}
```

### 2. **충돌 해결 시스템**

```typescript
export interface ConflictResolver {
  // 충돌 감지
  detectConflicts(localChanges: ChangeEvent[], remoteChanges: ChangeEvent[]): Conflict[];
  
  // 충돌 해결 전략
  resolveAutomatic(conflict: Conflict, strategy: ConflictStrategy): ConflictResolution;
  resolveManual(conflict: Conflict, userChoice: UserResolution): ConflictResolution;
  
  // 해결 전략 관리
  setDefaultStrategy(entityType: EntityType, strategy: ConflictStrategy): void;
  getRecommendedStrategy(conflict: Conflict): ConflictStrategy;
}

export interface Conflict {
  id: string;
  projectId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  
  // 충돌 대상
  entityType: EntityType;
  entityId: string;
  fieldPath: string;
  
  // 충돌 내용
  localValue: any;
  remoteValue: any;
  commonAncestor?: any;
  
  // 충돌 발생 정보
  localChange: ChangeEvent;
  remoteChange: ChangeEvent;
  detectedAt: number;
  
  // 해결 정보
  status: ConflictStatus;
  resolution?: ConflictResolution;
  resolvedAt?: number;
  resolvedBy?: string;
}

export type ConflictType = 
  | 'edit-edit'          // 같은 필드를 동시 편집
  | 'edit-delete'        // 편집 vs 삭제
  | 'delete-delete'      // 이미 삭제된 것을 삭제
  | 'move-move'          // 같은 객체를 다른 위치로 이동
  | 'constraint'         // 비즈니스 규칙 위반
  | 'dependency';        // 종속성 충돌

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ConflictStatus = 'detected' | 'resolving' | 'resolved' | 'ignored';

export type ConflictStrategy = 
  | 'last-write-wins'    // 마지막 변경사항 우선
  | 'first-write-wins'   // 첫 번째 변경사항 우선
  | 'merge-fields'       // 필드별 병합
  | 'merge-semantic'     // 의미적 병합
  | 'user-choice'        // 사용자 선택
  | 'create-variant'     // 변형 생성
  | 'reject-change';     // 변경 거부

// 지능형 충돌 해결기
export class IntelligentConflictResolver implements ConflictResolver {
  private strategies = new Map<string, ConflictStrategy>();
  private patterns = new ConflictPatternMatcher();
  
  detectConflicts(localChanges: ChangeEvent[], remoteChanges: ChangeEvent[]): Conflict[] {
    const conflicts: Conflict[] = [];
    
    for (const local of localChanges) {
      for (const remote of remoteChanges) {
        const conflict = this.checkConflict(local, remote);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }
  
  private checkConflict(local: ChangeEvent, remote: ChangeEvent): Conflict | null {
    // 같은 엔티티에 대한 변경인지 확인
    if (local.entityType !== remote.entityType || local.entityId !== remote.entityId) {
      return null;
    }
    
    // 시간적 겹침 확인
    if (Math.abs(local.timestamp - remote.timestamp) > 30000) { // 30초 이상 차이
      return null;
    }
    
    // 충돌 유형 판단
    const conflictType = this.determineConflictType(local, remote);
    if (!conflictType) return null;
    
    const severity = this.assessSeverity(local, remote, conflictType);
    
    return {
      id: generateId(),
      projectId: local.projectId,
      type: conflictType,
      severity,
      entityType: local.entityType,
      entityId: local.entityId,
      fieldPath: this.getConflictedFieldPath(local, remote),
      localValue: local.after,
      remoteValue: remote.after,
      commonAncestor: this.findCommonAncestor(local, remote),
      localChange: local,
      remoteChange: remote,
      detectedAt: Date.now(),
      status: 'detected'
    };
  }
  
  resolveAutomatic(conflict: Conflict, strategy: ConflictStrategy): ConflictResolution {
    switch (strategy) {
      case 'merge-semantic':
        return this.performSemanticMerge(conflict);
        
      case 'merge-fields':
        return this.performFieldMerge(conflict);
        
      case 'last-write-wins':
        return {
          type: 'replace',
          result: conflict.remoteChange.timestamp > conflict.localChange.timestamp 
            ? conflict.remoteValue 
            : conflict.localValue,
          strategy,
          confidence: 0.7
        };
        
      default:
        throw new Error(`Unsupported automatic resolution strategy: ${strategy}`);
    }
  }
  
  private performSemanticMerge(conflict: Conflict): ConflictResolution {
    // 태그 텍스트 병합: "ABC-101" + "ABC-102" → 충돌 (불가능)
    if (conflict.entityType === 'tag' && conflict.fieldPath === 'text') {
      return {
        type: 'conflict',
        result: null,
        strategy: 'merge-semantic',
        confidence: 0.0,
        reason: 'Tag text cannot be semantically merged'
      };
    }
    
    // 설명 텍스트 병합: 두 설명을 합치기
    if (conflict.entityType === 'description' && conflict.fieldPath === 'text') {
      const mergedText = this.mergeDescriptionTexts(
        conflict.localValue, 
        conflict.remoteValue
      );
      
      return {
        type: 'merge',
        result: mergedText,
        strategy: 'merge-semantic',
        confidence: 0.9
      };
    }
    
    // 기본값: 필드 병합으로 폴백
    return this.performFieldMerge(conflict);
  }
  
  private mergeDescriptionTexts(local: string, remote: string): string {
    // 중복 제거하며 병합
    const localSentences = local.split(/[.!?]\s+/).filter(s => s.trim());
    const remoteSentences = remote.split(/[.!?]\s+/).filter(s => s.trim());
    
    const merged = new Set([...localSentences, ...remoteSentences]);
    return Array.from(merged).join('. ') + '.';
  }
}

export interface ConflictResolution {
  type: 'replace' | 'merge' | 'split' | 'conflict';
  result: any;
  strategy: ConflictStrategy;
  confidence: number;           // 0.0 ~ 1.0
  reason?: string;
  alternatives?: any[];
}
```

---

## 🧪 테스트 및 마이그레이션

### 1. **데이터 마이그레이션**

```typescript
export interface MigrationService {
  // 마이그레이션 실행
  migrate(fromVersion: string, toVersion: string): Promise<MigrationResult>;
  
  // 마이그레이션 계획
  createMigrationPlan(currentVersion: string, targetVersion: string): MigrationPlan;
  
  // 롤백
  rollback(migrationId: string): Promise<void>;
  
  // 검증
  validateMigration(migrationId: string): Promise<ValidationResult>;
}

export interface MigrationPlan {
  id: string;
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  estimatedDuration: number;
  backupRequired: boolean;
  risks: RiskAssessment[];
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  type: 'data-transform' | 'schema-change' | 'cleanup' | 'validation';
  transformer: DataTransformer;
  rollbackTransformer?: DataTransformer;
  estimatedDuration: number;
}

export interface DataTransformer {
  transform(data: any): Promise<any>;
  validate(data: any): Promise<boolean>;
  getSchema(): Schema;
}

// 세션 데이터 마이그레이션 예시
export class SessionDataMigrator implements MigrationService {
  private migrations = new Map<string, DataTransformer>();
  
  constructor() {
    this.registerMigrations();
  }
  
  private registerMigrations(): void {
    // v1.0 → v2.0: 세션 구조 분리
    this.migrations.set('1.0->2.0', new SessionStructureMigrator());
    
    // v2.0 → v2.1: 사용자 프로필 추가
    this.migrations.set('2.0->2.1', new UserProfileMigrator());
    
    // v2.1 → v3.0: 다중 프로젝트 지원
    this.migrations.set('2.1->3.0', new MultiProjectMigrator());
  }
  
  async migrate(fromVersion: string, toVersion: string): Promise<MigrationResult> {
    const plan = this.createMigrationPlan(fromVersion, toVersion);
    const backup = await this.createBackup();
    
    try {
      for (const step of plan.steps) {
        await this.executeStep(step);
      }
      
      const validation = await this.validateMigration(plan.id);
      if (!validation.success) {
        throw new Error(`Migration validation failed: ${validation.errors.join(', ')}`);
      }
      
      return {
        success: true,
        migrationId: plan.id,
        duration: Date.now() - plan.startTime,
        itemsProcessed: validation.itemsProcessed
      };
      
    } catch (error) {
      // 마이그레이션 실패: 자동 롤백
      await this.restoreBackup(backup);
      throw error;
    }
  }
}

// v1.0 → v2.0 마이그레이션: 단일 세션 → 다중 세션 구조
export class SessionStructureMigrator implements DataTransformer {
  async transform(oldData: any): Promise<any> {
    // 기존 단일 세션 데이터를 새로운 구조로 변환
    const sessionId = generateSessionId();
    const userId = oldData.userId || 'default-user';
    const projectId = oldData.projectId || generateProjectId();
    
    const newSessionData: SessionData = {
      identifier: {
        sessionId,
        userId,
        projectId,
        createdAt: oldData.createdAt || Date.now(),
        lastAccessedAt: Date.now(),
        version: '2.0'
      },
      
      workspace: {
        viewer: {
          currentPage: oldData.currentPage || 1,
          scale: oldData.scale || 1.0,
          viewMode: oldData.mode || 'select',
          viewport: oldData.viewport || { x: 0, y: 0, width: 800, height: 600 },
          rotation: 0
        },
        
        selection: {
          selectedItems: this.convertSelectedItems(oldData.selectedTags || []),
          selectionMode: 'single',
          multiSelectEnabled: true
        },
        
        editing: {
          mode: oldData.mode || 'select',
          relationshipStartTag: oldData.relationshipStartTag?.id
        },
        
        history: {
          undoStack: [],
          redoStack: [],
          maxHistorySize: 100,
          currentVersion: 1
        },
        
        filters: this.convertFilters(oldData)
      },
      
      ui: {
        layout: {
          sidePanelVisible: oldData.isSidePanelVisible !== false,
          sidePanelWidth: oldData.sidePanelWidth || 400,
          sidePanelPosition: 'right',
          headerCollapsed: false,
          footerVisible: true
        },
        
        navigation: {
          activeTabId: 'main',
          openTabs: [{
            id: 'main',
            title: 'Main Project',
            isActive: true,
            isDirty: false,
            isPinned: true,
            canClose: false
          }],
          tabHistory: ['main'],
          breadcrumbs: []
        },
        
        modals: {
          openModals: [],
          modalStack: [],
          backdropVisible: false
        },
        
        notifications: {
          activeNotifications: [],
          toastQueue: [],
          progressIndicators: []
        },
        
        preferences: {
          theme: 'system',
          language: 'ko',
          density: 'normal',
          animations: true,
          soundEnabled: false
        }
      },
      
      temp: {
        realtime: {
          mousePosition: { x: 0, y: 0 },
          keyboardState: {
            pressedKeys: new Set(),
            modifierKeys: { ctrl: false, shift: false, alt: false, meta: false },
            lastKeyPress: 0
          },
          activeCursor: { type: 'default' },
          hoverState: {},
          focusState: {}
        },
        
        loading: {
          globalLoading: false,
          componentLoading: new Map(),
          progressStates: new Map(),
          errorStates: new Map()
        },
        
        network: {
          isOnline: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType || 'unknown',
          lastSyncTime: Date.now(),
          pendingSyncActions: []
        },
        
        performance: {
          renderTimes: [],
          memoryUsage: [],
          operationTimes: []
        }
      }
    };
    
    return {
      sessionData: newSessionData,
      projectData: this.extractProjectData(oldData),
      userData: this.extractUserData(oldData)
    };
  }
  
  private convertSelectedItems(oldSelectedTags: any[]): SelectedItem[] {
    return oldSelectedTags.map(tag => ({
      id: tag.id,
      type: 'tag',
      page: tag.page,
      bbox: tag.bbox,
      metadata: { category: tag.category }
    }));
  }
  
  private convertFilters(oldData: any): any {
    return {
      tagFilters: {
        showReviewed: oldData.showReviewed !== false,
        showUnreviewed: oldData.showUnreviewed !== false,
        categories: Object.keys(oldData.visibilitySettings?.tags || {})
          .filter(key => oldData.visibilitySettings.tags[key])
      },
      
      relationshipFilters: {
        types: Object.keys(oldData.visibilitySettings?.relationships || {})
          .filter(key => oldData.visibilitySettings.relationships[key])
      },
      
      pageFilter: {
        mode: 'all',
        pages: []
      },
      
      searchQuery: '',
      searchResults: []
    };
  }
}
```

### 2. **테스트 전략**

```typescript
// 세션 데이터 통합 테스트
export class SessionIntegrationTest {
  async testMultiProjectSession(): Promise<void> {
    const sessionManager = new SessionManager();
    const userId = 'test-user-001';
    
    // 시나리오 1: 다중 프로젝트 생성
    const project1Id = await this.createTestProject('project-1.pdf');
    const project2Id = await this.createTestProject('project-2.pdf');
    
    const session1Id = await sessionManager.createSession(userId, project1Id);
    const session2Id = await sessionManager.createSession(userId, project2Id);
    
    // 시나리오 2: 프로젝트 간 전환
    await sessionManager.switchSession(session1Id);
    const currentSession = sessionManager.getActiveSession();
    assert(currentSession.identifier.projectId === project1Id);
    
    await sessionManager.switchSession(session2Id);
    const newCurrentSession = sessionManager.getActiveSession();
    assert(newCurrentSession.identifier.projectId === project2Id);
    
    // 시나리오 3: 동시 편집 충돌 테스트
    await this.testConcurrentEditing(session1Id, session2Id);
    
    // 시나리오 4: 복구 테스트
    await this.testSessionRecovery(session1Id);
  }
  
  async testConcurrentEditing(session1Id: string, session2Id: string): Promise<void> {
    // 같은 태그를 두 세션에서 동시 편집
    const tagId = 'test-tag-001';
    
    // Session 1에서 태그 텍스트 변경
    const change1: ChangeEvent = {
      id: generateId(),
      projectId: 'test-project',
      sessionId: session1Id,
      userId: 'user-1',
      timestamp: Date.now(),
      type: 'tag-change',
      entityType: 'tag',
      entityId: tagId,
      operation: 'update',
      before: { text: 'ABC-101' },
      after: { text: 'ABC-101A' },
      metadata: { source: 'user', reason: 'manual-edit' }
    };
    
    // Session 2에서 같은 태그의 카테고리 변경 (동시)
    const change2: ChangeEvent = {
      id: generateId(),
      projectId: 'test-project',
      sessionId: session2Id,
      userId: 'user-2',
      timestamp: Date.now() + 100, // 100ms 후
      type: 'tag-change',
      entityType: 'tag',
      entityId: tagId,
      operation: 'update',
      before: { category: 'Equipment' },
      after: { category: 'Instrument' },
      metadata: { source: 'user', reason: 'category-change' }
    };
    
    // 충돌 해결 테스트
    const conflictResolver = new IntelligentConflictResolver();
    const conflicts = conflictResolver.detectConflicts([change1], [change2]);
    
    // 필드별 병합이 가능해야 함 (다른 필드 변경)
    assert(conflicts.length === 0, 'Different field changes should not conflict');
    
    // 같은 필드 변경으로 충돌 생성
    change2.before = { text: 'ABC-101' };
    change2.after = { text: 'ABC-101B' };
    
    const realConflicts = conflictResolver.detectConflicts([change1], [change2]);
    assert(realConflicts.length === 1, 'Same field changes should create conflict');
    
    const resolution = conflictResolver.resolveAutomatic(
      realConflicts[0], 
      'last-write-wins'
    );
    assert(resolution.result === 'ABC-101B', 'Later change should win');
  }
}

// 성능 벤치마크 테스트
export class SessionPerformanceBenchmark {
  async benchmarkStoragePerformance(): Promise<BenchmarkResult> {
    const adaptiveStorage = new AdaptiveStorage();
    const testSizes = [1024, 10240, 102400, 1024000, 10240000]; // 1KB ~ 10MB
    const iterations = 100;
    
    const results: BenchmarkResult = {
      storage: {},
      compression: {},
      synchronization: {}
    };
    
    for (const size of testSizes) {
      const testData = this.generateTestSessionData(size);
      
      // 저장 성능 테스트
      const saveStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await adaptiveStorage.save(`test-${i}`, testData);
      }
      const saveEnd = performance.now();
      
      // 로드 성능 테스트  
      const loadStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await adaptiveStorage.load(`test-${i}`);
      }
      const loadEnd = performance.now();
      
      results.storage[size] = {
        saveTime: (saveEnd - saveStart) / iterations,
        loadTime: (loadEnd - loadStart) / iterations,
        throughput: size / ((saveEnd - saveStart + loadEnd - loadStart) / iterations / 2)
      };
    }
    
    return results;
  }
  
  private generateTestSessionData(targetSize: number): SessionData {
    // 지정된 크기의 테스트 세션 데이터 생성
    const baseData = this.createMinimalSessionData();
    
    // 크기 조정을 위해 더미 데이터 추가
    while (JSON.stringify(baseData).length < targetSize) {
      baseData.temp.performance.renderTimes.push({
        component: `test-component-${Math.random()}`,
        duration: Math.random() * 100,
        timestamp: Date.now()
      });
    }
    
    return baseData;
  }
}

export interface BenchmarkResult {
  storage: { [size: number]: PerformanceMetric };
  compression: { [algorithm: string]: CompressionMetric };
  synchronization: { [scenario: string]: SyncMetric };
}

export interface PerformanceMetric {
  saveTime: number;      // ms
  loadTime: number;      // ms  
  throughput: number;    // bytes/ms
}
```

---

## 📋 구현 계획

### **Phase 1: 기반 구조 (2주)**
1. **타입 정의** (3일)
   - `SessionTypes.ts`, `UserTypes.ts`, `StorageTypes.ts` 생성
   - 기존 타입과의 호환성 확인

2. **저장소 시스템** (4일)
   - `AdaptiveStorage` 구현
   - `CompressionService` 구현
   - 성능 테스트 및 최적화

3. **기본 세션 관리** (7일)
   - `SessionManager` 핵심 기능 구현
   - 세션 생성/전환/저장/복원
   - 단위 테스트 작성

### **Phase 2: 다중 프로젝트 지원 (2주)**
1. **프로젝트 관리** (5일)
   - `ProjectStore`, `ProjectSwitcher` 구현
   - 프로젝트 메타데이터 관리
   - 프로젝트 간 데이터 격리

2. **UI 컴포넌트** (4일)
   - `SessionSwitcher`, `ProjectTabs` 구현
   - 프로젝트 전환 인터페이스
   - 반응형 탭 시스템

3. **통합 테스트** (5일)
   - 다중 프로젝트 시나리오 테스트
   - 성능 벤치마크
   - 사용성 테스트

### **Phase 3: 다중 사용자 지원 (2주)**
1. **사용자 관리** (6일)
   - `UserStore`, `UserProfile` 구현
   - 권한 시스템 구축
   - 개인설정 관리

2. **협업 기능** (4일)
   - 실시간 활동 표시
   - 사용자별 커서/선택 표시
   - 협업 UI 컴포넌트

3. **보안 및 검증** (4일)
   - 권한 검증 시스템
   - 데이터 액세스 제어
   - 보안 테스트

### **Phase 4: 동기화 시스템 (1주)**
1. **실시간 동기화** (3일)
   - `TabSynchronizer` 구현
   - BroadcastChannel 기반 탭 동기화
   - 변경사항 전파 시스템

2. **충돌 해결** (2일)
   - `ConflictResolver` 구현
   - 자동 병합 알고리즘
   - 충돌 해결 UI

3. **최종 통합** (2일)
   - 전체 시스템 통합 테스트
   - 성능 최적화
   - 문서화 완료

---

## 🎯 예상 성과

### **1. 확장성**
- ✅ **무제한 프로젝트**: 메모리 효율적인 세션 전환
- ✅ **다중 사용자**: 역할 기반 협업 환경  
- ✅ **대용량 데이터**: 적응형 저장소로 GB급 프로젝트 지원

### **2. 성능**
- ⚡ **70% 저장공간 절약**: MessagePack + 압축
- ⚡ **5-15배 빠른 로딩**: 지능형 캐시 시스템
- ⚡ **실시간 동기화**: 100ms 이하 지연시간

### **3. 사용자 경험**
- 🚀 **즉시 프로젝트 전환**: 상태 보존된 빠른 전환
- 🚀 **개인화**: 사용자별 맞춤 작업환경
- 🚀 **협업**: 실시간 공유 및 충돌 해결

### **4. 안정성**
- 🛡️ **자동 복구**: 크래시 시 작업 상태 복원
- 🛡️ **데이터 무결성**: 체크섬 기반 검증
- 🛡️ **충돌 방지**: 지능적 병합 시스템

---

이 설계서는 P&ID Tag Extractor를 **엔터프라이즈급 협업 도구**로 발전시키는 로드맵을 제시합니다. 단계적 구현을 통해 기존 기능을 유지하면서도 확장성과 협업 기능을 대폭 강화할 수 있습니다.