# P&ID Smart Digitizer 데이터베이스 스키마 요약서

## 📋 개요

P&ID Smart Digitizer의 데이터베이스 스키마를 한눈에 파악할 수 있도록 정리한 빠른 참조 문서입니다. 19개 핵심 테이블의 구조, 관계, 주요 인덱스 및 데이터 플로우를 간단명료하게 제시합니다.

---

## 📊 테이블 구조 요약

### **1. 사용자 관리**

#### **USERS** - 사용자 기본 정보
```
PK: user_id
- username, email, display_name, avatar_url
- role (admin, engineer, reviewer, viewer, guest)
- status (active, inactive, suspended)
- preferences (JSONB), workspace_settings (JSONB)
- created_at, updated_at, last_login_at
```

#### **USER_PERMISSIONS** - 사용자별 세부 권한
```
PK: (user_id, permission_name)
FK: user_id → USERS
- permission_value (BOOLEAN)
- granted_by, granted_at
```

### **2. 프로젝트 관리**

#### **PROJECTS** - 프로젝트 기본 정보
```
PK: project_id
FK: owner_id → USERS
- name, description, category, status, priority
- pdf_filename, pdf_filesize, pdf_page_count, pdf_checksum
- patterns, tolerances, color_settings (JSONB)
- completion_percentage, total_items, processed_items
- created_at, updated_at
```

#### **PROJECT_COLLABORATORS** - 프로젝트 협업자
```
PK: collaboration_id
FK: project_id → PROJECTS, user_id → USERS
- role (owner, admin, editor, reviewer, viewer)
- permissions (JSONB)
- assigned_pages (INTEGER[]), assigned_categories (TEXT[])
- joined_at, last_active_at
```

### **3. 세션 관리**

#### **USER_SESSIONS** - 사용자 세션
```
PK: session_id
FK: user_id → USERS, project_id → PROJECTS
- display_name, is_active, is_primary
- workspace_state (JSONB), ui_state (JSONB)
- created_at, last_accessed_at, expires_at
```

#### **SESSION_SNAPSHOTS** - 세션 백업
```
PK: snapshot_id
FK: session_id → USER_SESSIONS
- snapshot_type (manual, auto, milestone, backup)
- workspace_snapshot (BYTEA), ui_snapshot (BYTEA)
- original_size, compressed_size
- created_at, expires_at
```

### **4. 프로젝트 데이터**

#### **RAW_TEXT_ITEMS** - PDF 원본 텍스트
```
PK: raw_text_id
FK: project_id → PROJECTS
FK: converted_to_tag_id → TAGS, merged_into_id → RAW_TEXT_ITEMS
- text, page_number
- bbox_x1, bbox_y1, bbox_x2, bbox_y2
- extraction_method (pdf-js, ocr, manual)
- processing_status (extracted, processed, converted, deleted)
- predicted_category, category_confidence
- extracted_at, processed_at
```

#### **TAGS** - 태그 정보
```
PK: tag_id
FK: project_id → PROJECTS
- text, category, page_number
- bbox_x1, bbox_y1, bbox_x2, bbox_y2
- is_reviewed, confidence_score
- source_raw_text_ids (VARCHAR[])
- metadata (JSONB)
- created_by, created_at, updated_by, updated_at
```

#### **RELATIONSHIPS** - 태그 간 관계
```
PK: relationship_id
FK: project_id → PROJECTS
FK: from_tag_id → TAGS, to_tag_id → TAGS
- relationship_type (Connection, Installation, Annotation, Note, etc.)
- metadata (JSONB), visual_properties (JSONB)
- opc_status, opc_group, opc_count
- created_by, created_at, updated_by, updated_at
```

#### **DESCRIPTIONS** - 설명/노트
```
PK: description_id
FK: project_id → PROJECTS
- text, description_type (Note, Hold), scope (General, Specific)
- number_sequence, page_number
- bbox_x1, bbox_y1, bbox_x2, bbox_y2
- metadata (JSONB), source_items (JSONB)
- created_by, created_at, updated_by, updated_at
```

### **5. 협업 기능**

#### **COMMENTS** - 댓글 시스템
```
PK: comment_id
FK: project_id → PROJECTS
FK: parent_comment_id → COMMENTS
FK: author_id → USERS, resolved_by → USERS
- target_id, target_type (tag, description, relationship, loop)
- content, priority (low, medium, high)
- status (open, resolved, closed)
- thread_level, mentions (JSONB), reactions (JSONB)
- created_at, updated_at, resolved_at
```

#### **ACTIVITY_LOGS** - 활동 로그
```
PK: log_id
FK: project_id → PROJECTS, user_id → USERS
FK: session_id → USER_SESSIONS
- action_type, entity_type, entity_id
- before_value (JSONB), after_value (JSONB)
- change_summary, metadata (JSONB)
- batch_id, created_at
```

### **6. 동기화 시스템**

#### **SYNC_EVENTS** - 동기화 이벤트
```
PK: event_id
FK: project_id → PROJECTS
- event_type (change, conflict, resolution, merge)
- source_session_id, target_sessions (VARCHAR[])
- entity_type, entity_id, operation
- event_data (JSONB), sync_status
- created_at, synced_at
```

#### **CONFLICTS** - 충돌 관리
```
PK: conflict_id
FK: project_id → PROJECTS
FK: local_user_id → USERS, remote_user_id → USERS
FK: resolved_by → USERS
- conflict_type, severity, entity_type, entity_id
- local_value (JSONB), remote_value (JSONB)
- status, resolution_strategy, resolved_value (JSONB)
- detected_at, resolved_at
```

### **7. 협업 및 작업 관리**

#### **WORK_ASSIGNMENTS** - 작업 할당 관리
```
PK: assignment_id
FK: project_id → PROJECTS, assigned_to → USERS
- assignment_type (pages, categories, tags, relationships, reviews)
- assignment_scope (JSONB), status (assigned, in_progress, completed, reviewed, integrated)
- priority (low, normal, high), progress_percentage
- total_items, completed_items
- assigned_at, started_at, completed_at
```

#### **INTEGRATION_HISTORY** - 프로젝트 통합 이력
```
PK: integration_id
FK: project_id → PROJECTS, source_user_id → USERS
- integration_type (merge, import, sync), target_version
- source_data (BYTEA), merged_data (BYTEA), conflict_data (JSONB)
- items_added, items_updated, items_deleted
- conflicts_detected, conflicts_resolved
- status (pending, processing, completed, failed, rolled_back)
- started_at, completed_at, processing_duration
```

#### **MERGE_CONFLICTS** - 병합 충돌 관리
```
PK: conflict_id
FK: integration_id → INTEGRATION_HISTORY
- conflict_type (duplicate_tag, overlapping_relationship, conflicting_edit, data_inconsistency)
- entity_type (tag, relationship, description, comment), entity_identifier
- source_value (JSONB), target_value (JSONB), suggested_resolution (JSONB)
- page_number, bbox_area (JSONB)
- resolution_status (pending, auto_resolved, manual_resolved, ignored)
- resolution_strategy (keep_source, keep_target, merge_both, create_new, ignore)
- conflict_severity (low, medium, high, critical)
- detected_at, resolved_at
```

### **8. 캐시 및 성능 최적화**

#### **CACHE_ENTRIES** - 캐시 관리
```
PK: cache_key
- cache_namespace, cache_value (BYTEA)
- original_size, compressed_size
- expires_at, ttl_seconds, hit_count
- tags (VARCHAR[]), created_at, last_accessed_at
```

---

## 🔗 테이블 관계도

### **핵심 관계**

```
USERS (1) ←→ (N) USER_SESSIONS
USERS (1) ←→ (N) PROJECT_COLLABORATORS  
USERS (1) ←→ (N) COMMENTS
USERS (1) ←→ (N) ACTIVITY_LOGS
USERS (1) ←→ (N) WORK_ASSIGNMENTS

PROJECTS (1) ←→ (N) USER_SESSIONS
PROJECTS (1) ←→ (N) PROJECT_COLLABORATORS
PROJECTS (1) ←→ (N) RAW_TEXT_ITEMS
PROJECTS (1) ←→ (N) TAGS
PROJECTS (1) ←→ (N) RELATIONSHIPS
PROJECTS (1) ←→ (N) DESCRIPTIONS
PROJECTS (1) ←→ (N) COMMENTS
PROJECTS (1) ←→ (N) ACTIVITY_LOGS
PROJECTS (1) ←→ (N) WORK_ASSIGNMENTS
PROJECTS (1) ←→ (N) INTEGRATION_HISTORY

USER_SESSIONS (1) ←→ (N) SESSION_SNAPSHOTS
USER_SESSIONS (1) ←→ (N) SYNC_EVENTS

RAW_TEXT_ITEMS (1) ←→ (1) TAGS [converted_to_tag_id]
RAW_TEXT_ITEMS (1) ←→ (1) RAW_TEXT_ITEMS [merged_into_id]

TAGS (1) ←→ (N) RELATIONSHIPS [from_tag_id, to_tag_id]
TAGS (N) ←→ (N) RAW_TEXT_ITEMS [source_raw_text_ids]

COMMENTS (1) ←→ (N) COMMENTS [parent_comment_id] (스레드형)

WORK_ASSIGNMENTS (1) ←→ (1) PROJECT_COLLABORATORS [work_assignment_id]
INTEGRATION_HISTORY (1) ←→ (N) MERGE_CONFLICTS
```

### **참조 관계 (다형성)**

```
COMMENTS.target_id → TAGS.tag_id
                   → DESCRIPTIONS.description_id
                   → RELATIONSHIPS.relationship_id

ACTIVITY_LOGS.entity_id → TAGS.tag_id
                        → RELATIONSHIPS.relationship_id
                        → DESCRIPTIONS.description_id
                        → COMMENTS.comment_id

SYNC_EVENTS.entity_id → TAGS.tag_id
                      → RELATIONSHIPS.relationship_id
                      → DESCRIPTIONS.description_id

CONFLICTS.entity_id → TAGS.tag_id
                    → RELATIONSHIPS.relationship_id
                    → DESCRIPTIONS.description_id

MERGE_CONFLICTS.entity_identifier → TAGS.text
                                  → RELATIONSHIPS.relationship_id
                                  → DESCRIPTIONS.description_id
                                  → COMMENTS.comment_id
```

---

## 📊 데이터 플로우

### **1. PDF 처리 플로우**
```
PDF Upload → RAW_TEXT_ITEMS → AI Classification → TAGS → RELATIONSHIPS
```

### **2. 세션 관리 플로우**
```
User Login → USER_SESSIONS → Workspace State → SESSION_SNAPSHOTS (백업)
```

### **3. 협업 플로우 (현재 구현)**
```
Work Assignment → Individual Work → Export Data → Merge Process → Final Integration
```

### **4. 병합 및 충돌 해결 플로우**
```
Data Import → INTEGRATION_HISTORY → Conflict Detection → MERGE_CONFLICTS → Resolution → Final Merge
```

### **5. 향후 확장: 실시간 협업 플로우**
```
User Action → ACTIVITY_LOGS → SYNC_EVENTS → 다른 세션에 전파
```

---

## 🗂️ 주요 인덱스

### **성능 최적화 인덱스**
- `TAGS`: project_id, page_number, category, bbox_spatial
- `RAW_TEXT_ITEMS`: project_id, page_number, processing_status
- `RELATIONSHIPS`: project_id, from_tag_id, to_tag_id
- `COMMENTS`: project_id, target_type, target_id, status
- `ACTIVITY_LOGS`: project_id, user_id, created_at (파티셔닝)
- `WORK_ASSIGNMENTS`: project_id, assigned_to, status, assignment_type
- `INTEGRATION_HISTORY`: project_id, source_user_id, integration_type, status
- `MERGE_CONFLICTS`: integration_id, conflict_type, resolution_status, conflict_severity

### **전문 검색 인덱스 (GIN)**
- `TAGS.text`, `RAW_TEXT_ITEMS.text`, `DESCRIPTIONS.text`
- `COMMENTS.content`
- 모든 JSONB 필드 (metadata, preferences, settings, assignment_scope, conflict_data 등)

---

## 🎯 핵심 특징

### **1. 확장성**
- 파티셔닝: ACTIVITY_LOGS (월별), TAGS (해시)
- JSONB: 유연한 메타데이터 저장
- 배열 타입: 다중 참조 관계

### **2. 성능**
- 복합 인덱스: 자주 조회되는 컬럼 조합
- 부분 인덱스: 조건부 최적화
- 압축: BYTEA 압축으로 70% 용량 절약

### **3. 무결성**
- 외래키 제약조건
- CHECK 제약조건 (좌표, 점수 범위 등)
- 논리적 제약조건 (상태 일관성)

### **4. 감사**
- 모든 중요 테이블에 생성/수정 추적
- ACTIVITY_LOGS로 변경 이력 완전 추적
- 자동 트리거로 감사 로그 생성