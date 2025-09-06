# P&ID Smart Digitizer 서비스 아키텍처 개요

## 📋 문서 목적

P&ID Smart Digitizer의 전체 서비스 아키텍처를 정의하고, Frontend/Backend/Database의 역할과 상호작용, 그리고 SSR(Server-Side Rendering) 전환 계획을 제시합니다.

---

## 🏗️ **전체 아키텍처 구조**

### **현재 구조 (AS-IS)**
```
┌─────────────────────────────────────────┐
│           Client Browser                │
├─────────────────────────────────────────┤
│  React 19 SPA (Vite)                   │
│  - PDF.js (Client-side PDF 처리)       │
│  - localStorage (데이터 저장)           │
│  - 모든 로직이 클라이언트에서 실행      │
└─────────────────────────────────────────┘
```

### **목표 구조 (TO-BE: CSR)**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Web    │◄──►│   Backend API    │◄──►│  PostgreSQL DB  │
│                 │    │                  │    │                 │
│ React SPA (CSR) │    │ Node.js/Express  │    │ 19 Tables       │
│ - 클라이언트 렌더│    │ - API Routes     │    │ - 사용자 관리   │
│ - 상태 관리     │    │ - 인증/인가      │    │ - 프로젝트 데이터│
│ - PDF 뷰어      │    │ - 파일 처리      │    │ - 협업 시스템   │
│ - 실시간 업데이트│    │ - 실시간 동기화  │    │ - 성능 최적화   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 💻 **Frontend 아키텍처 (React CSR)**

### **기술 스택**
- **Framework**: React 19 (기존 유지)
- **번들러**: Vite (빠른 개발 서버)
- **렌더링**: Client-Side Rendering
- **상태관리**: Zustand + tRPC (서버 상태)
- **데이터 직렬화**: MessagePack (70% 크기 절약)
- **스타일링**: Tailwind CSS
- **PDF 처리**: PDF.js (Client-side)

### **주요 역할**
1. **클라이언트 렌더링**
   - 브라우저에서 초기 로딩 후 렌더링
   - SPA 방식으로 페이지 전환
   - 빠른 상호작용 및 반응성

2. **상태 관리**
   - PDF 뷰어 및 태그 시각화
   - 실시간 편집 기능
   - 드래그앤드롭, 키보드 단축키

3. **API 통신**
   ```typescript
   // CSR + API State 관리
   interface AppState {
     // Server State (API 동기화)
     user: User | null;
     projects: Project[];
     collaborators: User[];
     
     // Client State (로컬 상호작용)
     currentPage: number;
     selectedTags: Set<string>;
     zoomLevel: number;
   }
   ```

### **페이지 구조**
```
src/
├── pages/
│   ├── LoginPage.tsx            # 로그인 (CSR)
│   ├── RegisterPage.tsx         # 회원가입 (CSR)
│   ├── DashboardPage.tsx        # 프로젝트 대시보드 (CSR)
│   └── WorkspacePage.tsx        # 작업공간 (CSR)
├── components/
│   ├── auth/                    # 인증 컴포넌트
│   ├── dashboard/               # 대시보드 컴포넌트
│   └── workspace/               # 작업공간 컴포넌트
├── stores/                      # Zustand stores (16개 완성)
│   ├── appStore.js              # 앱 초기화 및 글로벌 상태
│   ├── tagStore.js              # 태그 CRUD 및 선택 관리
│   ├── relationshipStore.js     # 관계 생성/삭제 및 연결
│   ├── pdfStore.js              # PDF 문서 상태 및 처리
│   ├── viewerStore.js           # PDF 뷰어 상태 관리
│   ├── uiStore.js               # UI 상태 및 키보드 핸들러
│   ├── settingsStore.js         # 앱 설정 및 localStorage
│   ├── projectStore.js          # Export/Import 및 Excel
│   ├── autoLinkingStore.js      # Auto-linking 로직 통합
│   ├── commentStore.js          # 댓글 CRUD 및 우선순위
│   ├── descriptionStore.js      # Description/Note/Hold 관리
│   ├── equipmentShortSpecStore.js # Equipment Short Spec
│   ├── rawTextStore.js          # Raw text 관리 및 공간 분석
│   ├── loopStore.js             # Loop 관리 전담
│   ├── contentStore.js          # 레거시 호환성 (DEPRECATED)
│   └── sidePanelStore.js        # 사이드 패널 상태
├── services/                    # API 서비스
└── hooks/                       # Custom hooks
```

---

## ⚙️ **Backend API 아키텍처**

### **기술 스택**
- **Runtime**: Node.js 18+
- **Framework**: tRPC + Express.js
- **인증**: JWT + Refresh Token
- **파일 처리**: Multer + Sharp (이미지 최적화)
- **실시간 통신**: tRPC subscriptions

### **주요 역할**

#### **1. 인증 및 사용자 관리**
```typescript
// tRPC 라우터
const authRouter = t.router({
  login: t.procedure.input(LoginSchema).mutation(...),
  register: t.procedure.input(RegisterSchema).mutation(...),
  refresh: t.procedure.mutation(...),
  getProfile: t.procedure.query(...),
  updateProfile: t.procedure.input(ProfileSchema).mutation(...)
});
```

#### **2. 프로젝트 관리**
```typescript
const projectRouter = t.router({
  getProjects: t.procedure.query(...),           // 사용자별 프로젝트 목록
  createProject: t.procedure.input(...).mutation(...), // 프로젝트 생성
  getProject: t.procedure.input(...).query(...), // 프로젝트 상세
  updateProject: t.procedure.input(...).mutation(...), // 프로젝트 업데이트
  deleteProject: t.procedure.input(...).mutation(...), // 프로젝트 삭제
  
  uploadPDF: t.procedure.input(...).mutation(...), // PDF 업로드
  getCollaborators: t.procedure.input(...).query(...), // 협업자 목록
  inviteCollaborator: t.procedure.input(...).mutation(...) // 협업자 초대
});
```

#### **3. 프로젝트 데이터 관리**
```typescript
GET    /api/projects/{id}/tags          # 태그 목록
POST   /api/projects/{id}/tags          # 태그 생성
PUT    /api/projects/{id}/tags/{tagId}  # 태그 수정
DELETE /api/projects/{id}/tags/{tagId}  # 태그 삭제

GET    /api/projects/{id}/relationships # 관계 목록  
POST   /api/projects/{id}/relationships # 관계 생성
PUT    /api/projects/{id}/relationships/{relId}  # 관계 수정
DELETE /api/projects/{id}/relationships/{relId}  # 관계 삭제

GET    /api/projects/{id}/comments      # 댓글 목록
POST   /api/projects/{id}/comments      # 댓글 생성
PUT    /api/projects/{id}/comments/{commentId}   # 댓글 수정
```

#### **4. 협업 및 병합 시스템**
```typescript
GET    /api/projects/{id}/assignments   # 작업 할당 목록
POST   /api/projects/{id}/assignments   # 작업 할당
PUT    /api/projects/{id}/assignments/{assignmentId} # 할당 업데이트

POST   /api/projects/{id}/merge         # 프로젝트 병합 요청
GET    /api/projects/{id}/merge/conflicts # 병합 충돌 목록
POST   /api/projects/{id}/merge/resolve   # 충돌 해결
```

#### **5. 파일 및 내보내기**
```typescript
GET    /api/projects/{id}/export/excel  # Excel 내보내기
GET    /api/projects/{id}/export/json   # JSON 내보내기
POST   /api/projects/{id}/import        # 프로젝트 가져오기
```

### **서버 아키텍처 패턴**

#### **레이어드 아키텍처**
```typescript
┌─────────────────────┐
│   API Routes        │  # Express Routes
├─────────────────────┤
│   Controllers       │  # 요청 처리 로직
├─────────────────────┤  
│   Services          │  # 비즈니스 로직
├─────────────────────┤
│   Repositories      │  # 데이터 접근 계층
├─────────────────────┤
│   Database Models   │  # PostgreSQL 스키마
└─────────────────────┘
```

#### **주요 서비스 컴포넌트**
```typescript
// 예시: 프로젝트 서비스
class ProjectService {
  async createProject(userId: string, data: CreateProjectRequest) {
    // 1. 권한 확인
    // 2. PDF 업로드 처리
    // 3. 초기 데이터 구조 생성
    // 4. 데이터베이스 저장
  }
  
  async mergeProjects(projectId: string, mergeData: ProjectMergeRequest) {
    // 1. 충돌 탐지
    // 2. 자동 해결 시도
    // 3. 수동 해결 필요 항목 반환
    // 4. 최종 병합 실행
  }
}
```

---

## 🗄️ **Database 아키텍처 (PostgreSQL)**

### **스키마 구조** (19개 테이블)

#### **핵심 엔티티**
1. **사용자 관리** (2개): `users`, `user_permissions`
2. **프로젝트 관리** (2개): `projects`, `project_collaborators`  
3. **세션 관리** (2개): `user_sessions`, `session_snapshots`
4. **프로젝트 데이터** (4개): `raw_text_items`, `tags`, `relationships`, `descriptions`
5. **협업 기능** (2개): `comments`, `activity_logs`
6. **동기화** (2개): `sync_events`, `conflicts`
7. **작업 관리** (3개): `work_assignments`, `integration_history`, `merge_conflicts`
8. **시스템** (2개): `cache_entries`, (추가 관리 테이블)

#### **주요 관계**
```sql
-- 핵심 관계 구조
USERS ─┬─ PROJECT_COLLABORATORS ─ PROJECTS
       ├─ USER_SESSIONS ─ SESSION_SNAPSHOTS
       ├─ WORK_ASSIGNMENTS
       └─ COMMENTS

PROJECTS ─┬─ RAW_TEXT_ITEMS ─ TAGS ─┬─ RELATIONSHIPS
          ├─ DESCRIPTIONS           │
          ├─ COMMENTS              │
          └─ INTEGRATION_HISTORY ─ MERGE_CONFLICTS
```

#### **성능 최적화**
- **파티셔닝**: `activity_logs` (월별), `tags` (해시)
- **인덱싱**: 복합 인덱스, GIN 인덱스 (JSONB)
- **캐싱**: `cache_entries` 테이블 + Redis (선택)

---

## 🔄 **데이터 흐름 및 상호작용**

### **1. 사용자 인증 플로우**
```
1. 브라우저 → React SPA → JWT 검증 (localStorage)
2. React → Backend API → 사용자 정보 조회
3. Backend → PostgreSQL → 사용자 데이터
4. PostgreSQL → Backend → React → 브라우저 (CSR)
```

### **2. 프로젝트 작업 플로우**
```
1. PDF 업로드: Client → Backend → 파일 저장
2. 태그 추출: Client (PDF.js) → Backend API → DB 저장
3. 실시간 편집: Client State ↔ Backend API ↔ DB
4. 협업자 동기화: WebSocket/Polling → 상태 업데이트
```

### **3. 프로젝트 병합 플로우**  
```
1. 병합 요청: Client → Backend API
2. 충돌 탐지: Backend → PostgreSQL (비교 쿼리)
3. 자동 해결: Backend 로직
4. 수동 해결: Client UI ← Backend API
5. 최종 병합: Backend → PostgreSQL (트랜잭션)
```

---

## 🚀 **CSR 백엔드 연동 단계별 계획**

### **Phase 1: 백엔드 API 구축 (Week 1-2)**
- [ ] Node.js/Express 서버 설정
- [ ] PostgreSQL 연결 및 스키마 생성
- [ ] JWT 인증 시스템
- [ ] 기본 CRUD API 구현

### **Phase 2: React CSR 연동 (Week 3-4)**
- [ ] 기존 Vite + React 앱 유지
- [ ] TanStack Query 설치 및 설정
- [ ] API 서비스 레이어 구축
- [ ] 인증 상태 관리 (localStorage + Zustand)

### **Phase 3: 고급 기능 구현 (Week 5-6)**
- [ ] 실시간 협업 기능 (WebSocket/Polling)
- [ ] 파일 업로드/다운로드
- [ ] 프로젝트 병합 시스템
- [ ] 성능 최적화

### **Phase 4: 배포 및 운영 (Week 7-8)**
- [ ] Docker 컨테이너화
- [ ] CI/CD 파이프라인
- [ ] 모니터링 및 로깅
- [ ] 보안 강화

---

## 📊 **기술적 고려사항**

### **성능**
- **CSR**: 초기 로딩 후 빠른 페이지 전환
- **Code Splitting**: React.lazy()로 페이지별 번들 분할
- **Caching**: TanStack Query + Redis + PostgreSQL 최적화
- **CDN**: 정적 자산 배포 (Vite 빌드)

### **보안**
- **인증**: JWT + Refresh Token + CSRF 보호
- **권한**: 역할 기반 접근 제어 (RBAC)
- **파일 업로드**: 바이러스 스캔, 크기 제한
- **API**: Rate Limiting, Input Validation

### **확장성**
- **Database**: 읽기 복제본, 커넥션 풀링
- **Backend**: 로드 밸런서, 클러스터링
- **Frontend**: Edge Computing, Static Generation

### **모니터링**
- **APM**: Application Performance Monitoring
- **로깅**: 구조화된 로그, 중앙 집중식 관리
- **알림**: 에러 추적, 성능 임계값 모니터링

---

## 🎯 **마이그레이션 전략**

### **점진적 전환**
1. **Backend API 먼저 구축** → 기존 SPA에서 API 호출 테스트
2. **React CSR 점진적 연동** → localStorage에서 API로 데이터 이전
3. **기능별 단계적 연동** → 인증 → 프로젝트 관리 → 협업 기능
4. **최종 통합** → localStorage 제거, 완전한 백엔드 연동

### **데이터 마이그레이션**
- **현재**: localStorage 기반 프로젝트 데이터
- **전환**: 마이그레이션 도구로 PostgreSQL 이전
- **호환성**: 기존 JSON 형식과 새 DB 스키마 매핑

---

## 📝 **정리**

이 아키텍처 문서는 P&ID Smart Digitizer의 **현재 Client-only SPA에서 Backend API + CSR 구조로의 전환**을 위한 전체 청사진을 제공합니다.

### **핵심 장점**
- **기존 React/Vite 앱 유지** → 개발 생산성 보장
- **점진적 백엔드 연동** → 위험 최소화
- **다중 사용자 협업** → 작업 분담 및 병합 시스템
- **확장 가능한 아키텍처** → 향후 기능 추가 용이