# P&ID Smart Digitizer 리팩토링 TODO 관리서

## 📋 개요

P&ID Smart Digitizer의 리팩토링 프로젝트 관리서입니다. App.tsx 파일을 ~2,019줄에서 150줄 이하로 축소하여 유지보수성과 확장성을 극대화하는 것이 목표입니다.

---

# Section 1: 📊 **전반적인 현황**

## **🎯 프로젝트 목표**
- **App.tsx 축소**: ~2,019줄 → **150줄 이하** (92% 축소)
- **도메인별 Store 분리**: 모든 비즈니스 로직을 전문화된 Store로 이전
- **Props Drilling 제거**: 컴포넌트가 직접 Store를 사용하도록 변경
- **유지보수성 극대화**: 새 기능 추가 시 해당 Store만 수정하면 되도록

## **📈 현재 진행 상황 (2025-09-06)**

### **App.tsx 현재 상태**
- **현재**: **1,284줄** (원본 ~2,019줄에서 **735줄 축소** 완료)
- **축소율**: **36.4%** 완료 
- **목표까지**: **1,134줄 더 축소** 필요 (목표 150줄)

### **함수 마이그레이션 현황**
- **원본 handle 함수**: ~39개
- **마이그레이션 완료**: **23개** 함수
- **남은 함수**: **16개** 함수
- **완료율**: **59%**

### **Store 아키텍처 현황**
**✅ 완성된 11개 전문화 Store** - **총 2,473 lines**
- **TagStore**: 276줄 - 핵심 태그 CRUD, 선택, 검토 관리
- **RawTextStore**: 125줄 - Raw text 관리 및 공간 분석
- **RelationshipStore**: 141줄 - 관계 생성/삭제 및 연결 관리
- **CommentStore**: 165줄 - 댓글 CRUD, 우선순위, 해결상태 관리
- **DescriptionStore**: 305줄 - Description & Note/Hold 관리 전담
- **EquipmentShortSpecStore**: 298줄 - Equipment Short Spec 관리 전담
- **AutoLinkingStore**: 309줄 - 모든 Auto-linking 로직 통합
- **ProjectStore**: 301줄 - Export/Import & Excel 내보내기 전담
- **ContentStore**: 47줄 - 레거시 호환성 프록시 (DEPRECATED)
- **PDFStore**: 177줄 - PDF 문서 상태 및 뷰어 제어
- **SettingsStore**: 329줄 - 모든 앱 설정 및 localStorage 통합

## **🗓️ 리팩토링 로드맵**

```
✅ Phase 1 (Week 1-2): Store 아키텍처 구축 (완료)
✅ Phase 2 (Week 3-4): 고급 Store 시스템 구축 (완료)
✅ Phase 3 (Week 5-6): 핵심 비즈니스 로직 마이그레이션 (완료)
✅ Phase 4 (Week 7-8): Auto-linking & Export/Import 마이그레이션 (완료)
✅ Phase 5 (Week 9): Tag/RawText 프록시 함수 완전 제거 (완료)
✅ Phase 6 (Week 10): Description/Equipment 프록시 함수 완전 제거 (완료)
📅 Phase 7+ (Week 11+): 나머지 16개 함수 마이그레이션 (진행 예정)
```

**초고속 진행**: 원래 8주 계획을 **10주만에 6개 Phase 완료** 🚀

---

# Section 2: ✅ **완료된 작업들**

## **🎉 Phase 8 완료! (최신)**
**Comment Store 마이그레이션으로 40줄 추가 축소**

### **제거된 5개 함수 (~40 lines)**
- ✅ `handleCreateComment` (9 lines) → CommentStore 직접 사용
- ✅ `handleUpdateComment` (8 lines) → CommentStore 직접 사용  
- ✅ `handleDeleteComment` (6 lines) → CommentStore 직접 사용
- ✅ `handleDeleteCommentsForTarget` (7 lines) → CommentStore 직접 사용
- ✅ `getCommentsForTarget` (3 lines) → CommentStore 직접 사용

### **컴포넌트 업데이트**
- ✅ **Workspace.tsx에 CommentStore 추가**: 직접 Comment 함수 사용
- ✅ **App.tsx에서 Comment 관련 props 제거**: 더 이상 props drilling 없음
- ✅ **빌드/개발 서버 테스트 완료**: 오류 없이 작동

**결과: App.tsx 1,077줄 → 1,037줄 (40줄 감소)**

## **🎉 Phase 7 완료!**
**Loop Store 마이그레이션으로 207줄 추가 축소**

### **제거된 7개 함수 (~207 lines)**
- ✅ `parseInstrumentTag` (24 lines) → LoopStore 직접 사용
- ✅ `generateLoopId` (30 lines) → LoopStore 직접 사용
- ✅ `autoGenerateLoops` (38 lines) → LoopStore 직접 사용
- ✅ `handleAutoGenerateLoops` (52 lines) → LoopStore 직접 사용
- ✅ `handleManualCreateLoop` (34 lines) → LoopStore 직접 사용
- ✅ `handleDeleteLoops` (13 lines) → LoopStore 직접 사용
- ✅ `handleUpdateLoop` (16 lines) → LoopStore 직접 사용

### **LoopStore.js 완전 구현** (293줄)
- ✅ **복잡한 Instrument Tag 파싱 알고리즘** 구현
- ✅ **자동 Loop 생성 로직** 완전 이식
- ✅ **수동 Loop 생성 및 관리** 기능
- ✅ **Confirmation 시스템** 통합

**결과: App.tsx 1,284줄 → 1,077줄 (207줄 감소)**

## **🎉 Phase 6 완료!**
**Description/Equipment Store 마이그레이션으로 115줄 추가 축소**

### **제거된 7개 함수 (~107 lines)**
- ✅ `handleCreateDescription` (12 lines) → DescriptionStore 직접 사용
- ✅ `handleCreateHoldDescription` (3 lines) → DescriptionStore 직접 사용
- ✅ `handleCreateEquipmentShortSpec` (11 lines) → EquipmentShortSpecStore 직접 사용
- ✅ `handleDeleteEquipmentShortSpecs` (28 lines) → EquipmentShortSpecStore 직접 사용
- ✅ `handleUpdateEquipmentShortSpec` (9 lines) → EquipmentShortSpecStore 직접 사용
- ✅ `handleDeleteDescriptions` (39 lines) → DescriptionStore 직접 사용
- ✅ `handleUpdateDescription` (5 lines) → DescriptionStore 직접 사용

### **WorkspaceProps 정리**
- ✅ **7개 불필요한 함수 props 제거** (총 15개 props 제거)
- ✅ **Workspace.tsx에 필요 Store 추가**: DescriptionStore, EquipmentShortSpecStore, ContentStore

## **🏆 전체 완료 내역 (Phase 1-6)**

### **Phase 1-2: Store 아키텍처 구축**
- ✅ **11개 전문화된 Store 완전 구축** (2,473 lines)
- ✅ **Zustand + Immer 기반 상태 관리** 시스템 구축
- ✅ **기존 useState와 완벽 호환** 동기화 시스템

### **Phase 3: 핵심 복잡 비즈니스 로직 마이그레이션**
- ✅ **handleCreateDescription 마이그레이션** → ContentStore의 `createDescriptionFromItems`
- ✅ **handleCreateEquipmentShortSpec 마이그레이션** → ContentStore의 `createEquipmentShortSpecFromItems`
- ✅ **복잡한 자동 링킹 로직** 280줄 완전 구현
- ✅ **React 무한 루프 오류 해결** 및 안정성 확보

### **Phase 4: Auto-linking & Export/Import 마이그레이션**
- ✅ **AutoLinkingStore 생성** (309줄) - 모든 Auto-linking 로직 통합
- ✅ **ProjectStore 생성** (301줄) - Export/Import & Excel 내보내기 전담
- ✅ **4개 Auto-linking 함수 마이그레이션**:
  - `handleAutoLinkDescriptions` → AutoLinkingStore
  - `handleAutoLinkNotesAndHolds` → AutoLinkingStore  
  - `handleAutoLinkEquipmentShortSpecs` → AutoLinkingStore
  - `handleAutoLinkAll` → AutoLinkingStore
- ✅ **4개 Export/Import 함수 마이그레이션**:
  - `handleExportProject` → ProjectStore
  - `handleImportProject` → ProjectStore
  - `handleExportExcel` → ProjectStore
  - `loadProjectData` → ProjectStore

### **Phase 5: Tag/RawText 프록시 함수 완전 제거**
- ✅ **8개 Tag/RawText 프록시 함수 제거** (87줄 축소):
  - `handleCreateTag` → TagStore 직접 사용
  - `handleCreateManualTag` → TagStore 직접 사용
  - `handleDeleteTags` → TagStore 직접 사용
  - `handleUpdateTagText` → TagStore 직접 사용
  - `handleToggleReviewStatus` → TagStore 직접 사용
  - `handleMergeRawTextItems` → RawTextStore 직접 사용
  - `handleDeleteRawTextItems` → RawTextStore 직접 사용
  - `handleUpdateRawTextItemText` → RawTextStore 직접 사용
- ✅ **Workspace.tsx에 TagStore, RawTextStore 직접 통합**
- ✅ **8개 WorkspaceProps 제거** (인터페이스 정리)

### **Phase 6: Description/Equipment 프록시 함수 완전 제거**
- ✅ **7개 Description/Equipment 프록시 함수 제거** (115줄 축소)
- ✅ **Workspace.tsx에 DescriptionStore, EquipmentShortSpecStore 직접 통합**
- ✅ **7개 WorkspaceProps 제거** (총 15개 props 제거)

## **📊 누적 성과 (6개 Phase 완료)**
- **App.tsx**: 2,019줄 → **1,284줄** (**735줄 축소**, 36.4% 완료)
- **함수 마이그레이션**: 39개 → **16개** (23개 완료, 59% 완료)
- **Store 시스템**: **11개 전문화된 Store**, 총 2,473 lines
- **Props 정리**: **총 15개 불필요한 props 제거**
- **안정성**: 모든 Phase에서 빌드 성공, 개발 서버 정상 작동

---

# Section 3: 📋 **아직 해야 할 일들**

## **🎯 남은 16개 Handle 함수**

### **우선순위 1: Settings Store Migration (2함수, ~59 lines)**
- [ ] `handleSaveSettingsOnly` (13 lines) → SettingsStore 직접 사용
- [ ] `handleSaveSettingsAndRescan` (46 lines) → SettingsStore 직접 사용

**예상 효과**: 59줄 축소, 설정 관련 통합

### **우선순위 2: 기타 함수들 (6함수, ~60 lines)**
- [ ] `handleRemoveWhitespace` (27 lines) → 적절한 Store로 이전
- [ ] `handleFileSelect` (28 lines) → PDFStore로 이전 고려
- [ ] `handleReset` (15 lines) → 여러 Store 초기화 통합
- [ ] `handleGlobalKeyDown`, `handleCloseConfirmation`, `handleConfirm` 등

## **🔧 필요한 새로운 작업**

### **새 Store 생성 필요**
- [ ] **LoopStore 생성**: Loop 관리 전담 (예상 150+ 줄)
  - Loop 자동 생성 알고리즘
  - 수동 Loop 생성/편집
  - Loop 삭제/업데이트
  - Instrument 태그 파싱 로직

### **기존 Store 확장**
- [ ] **CommentStore**: 이미 구현됨, Workspace.tsx 통합만 필요
- [ ] **SettingsStore**: 이미 구현됨, 설정 저장 함수 추가 필요
- [ ] **PDFStore**: PDF 처리 관련 함수 추가 고려

### **인터페이스 정리**
- [ ] **WorkspaceProps에서 추가 props 제거**: 16개 → 0-5개 목표
- [ ] **Header 컴포넌트 props 정리**: 30+ props → 5개 이하
- [ ] **불필요한 useState 제거**: Store로 완전 대체

### **성능 및 UI/UX 최적화 (지속적 개선)**

#### **성능 최적화**
- [ ] **React.memo 최적화**
- [ ] **useMemo/useCallback 의존성 최적화**
- [ ] **페이지 변경 시 캐시 정리**
- [ ] **불필요한 선택 상태 정리**
- [ ] **가비지 컬렉션 최적화**
- [ ] **메모리 누수 모니터링**

#### **컴포넌트 리팩토링**
- [ ] **Header.tsx 간소화** (30+ props → 5개 이하)
- [x] **SidePanel.tsx 분할** ✅ **완료** (502줄 + 6개 도메인별 Panel로 완벽 분리)
- [ ] **PdfViewer.tsx 최적화** (비즈니스 로직 분리)
- [ ] **반응형 디자인 개선**

#### **분리된 Panel 최적화**
- [ ] **TagsPanel.tsx 최적화** (940줄 → 성능 개선, 가상화 검토)
- [ ] **DescriptionsPanel.tsx 최적화** (333줄 → Store 직접 사용, props 정리)
- [ ] **EquipmentShortSpecsPanel.tsx 최적화** (303줄 → Store 직접 사용)
- [ ] **RelationshipsPanel.tsx 최적화** (272줄 → 렌더링 성능 개선)
- [ ] **LoopsPanel.tsx 최적화** (255줄 → LoopStore 직접 사용 예정)
- [ ] **CommentsPanel.tsx 최적화** (238줄 → CommentStore 직접 사용)

#### **사용자 경험 향상**
- [ ] **로딩 상태 표시 개선**
- [ ] **에러 처리 및 복구 가이드**
- [ ] **키보드 단축키 확장**
- [ ] **도움말 및 튜토리얼**

## **🔮 미래 확장 계획 (현재 기본 기능 완성 후)**

### **다중 사용자 협업 시스템**

#### **사용자 인증 시스템**
- [ ] **LoginForm 컴포넌트 생성**
  ```typescript
  interface AuthStore {
    currentUser: User | null;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    register: (userData: RegisterData) => Promise<void>;
  }
  ```
- [ ] **회원가입 폼**
- [ ] **프로필 관리**
- [ ] **세션 관리 (JWT)**

#### **프로젝트 관리 시스템**
- [ ] **ProjectDashboard 컴포넌트**
- [ ] **프로젝트 생성/선택**
- [ ] **프로젝트 목록 (개인/공유 구분)**
- [ ] **프로젝트 권한 관리**

#### **작업 할당 시스템**
- [ ] **WorkAssignmentPanel 컴포넌트**
- [ ] **페이지별 작업 할당**
- [ ] **카테고리별 작업 할당**
- [ ] **작업 진행률 추적**
- [ ] **완료 상태 관리**

### **프로젝트 병합 시스템**

#### **ProjectMerger 개발**
- [ ] **지능적 충돌 탐지**
  ```typescript
  interface ConflictDetector {
    detectTagConflicts: (source: Tag[], target: Tag[]) => ConflictItem[];
    detectRelationshipConflicts: (source: Relationship[], target: Relationship[]) => ConflictItem[];
    calculateConflictSeverity: (conflict: ConflictItem) => 'low' | 'medium' | 'high' | 'critical';
  }
  ```
- [ ] **자동 해결 알고리즘**
- [ ] **수동 해결 UI (MergeConflictModal)**
- [ ] **병합 결과 검증**
- [ ] **롤백 기능**

#### **Export/Import 확장**
- [ ] **작업 영역별 부분 Export**
- [ ] **메타데이터 포함 Export**
- [ ] **버전 호환성 확인**
- [ ] **Import 사전 검증**


### **통합 테스트 및 품질 보증**

#### **기능 테스트**
- [ ] **전체 워크플로우 테스트**
  - [ ] PDF 업로드 → 태그 추출 → 관계 생성 → Excel 내보내기
  - [ ] 다중 사용자 협업 → 작업 할당 → 결과 병합
  - [ ] 프로젝트 저장/불러오기 → 설정 복원

#### **성능 테스트**
- [ ] **대용량 PDF 테스트** (150페이지 이상)
- [ ] **다량 태그 테스트** (5,000개 이상)
- [ ] **다중 관계 테스트** (1,000개 이상)
- [ ] **브라우저 호환성 테스트**

#### **사용자 수용 테스트**
- [ ] **실제 사용자 시나리오 테스트**
- [ ] **사용성 피드백 수집**
- [ ] **성능 체감 평가**
- [ ] **버그 리포트 및 수정**

#### **배포 준비**
- [ ] **빌드 설정 최적화**
- [ ] **번들 크기 최적화**
- [ ] **환경별 설정 구분**
- [ ] **배포 스크립트 작성**

## **🎯 최종 목표 (Phase 7+ 완료 시)**

### **App.tsx 최종 축소**
- **현재**: 1,284줄
- **목표**: **150줄 이하**  
- **필요**: **1,134줄 더 축소** (91% 추가 축소)

### **완전한 Store 생태계**
- **현재**: 11개 Store (2,473 lines)
- **목표**: 12개 Store (LoopStore 추가)
- **예상 총 라인**: 2,600+ lines

### **아키텍처 완성**
- **Props Drilling 완전 제거**: 모든 컴포넌트가 직접 Store 사용
- **도메인별 완전 분리**: 각 기능이 독립적인 Store에서 관리
- **유지보수성 극대화**: 새 기능 추가 시 해당 Store만 수정
- **테스트 가능성**: Store별 독립적 단위 테스트

## **📅 다음 Phase 7 계획**

**추천**: **Loop Store Migration**부터 시작
- 최대 라인 축소 효과 (107줄)
- 명확한 도메인 경계
- 복잡한 비즈니스 로직 분리
- 독립적 기능으로 테스트 용이

**예상 완료 후**: 1,284줄 → 1,177줄 (추가 107줄 축소)

---

# Section 4: ⚠️ **리스크 관리 및 품질 확보**

## **품질 관리**
- **빌드 검증**: 모든 Phase에서 `npm run build` 성공 확인
- **개발 서버**: `npm run dev` 정상 작동 확인
- **타입 안전성**: TypeScript 오류 없음
- **기능 보장**: 모든 기존 기능 정상 작동

## **리스크 요소**
- **기능 손실**: 리팩토링 중 기존 기능 손실 → 단계별 검증으로 대응
- **성능 저하**: Store 오버헤드 → 지속적 모니터링
- **복잡성 증가**: 너무 많은 Store → 도메인별 명확한 분리 유지

---

**이 문서는 실시간 업데이트되며, 각 Phase 완료 시마다 Section 2(완료)와 Section 3(미완료)가 업데이트됩니다.**