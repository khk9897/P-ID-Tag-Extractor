# P&ID Smart Digitizer 리팩토링 TODO 관리서

## 📋 개요

P&ID Smart Digitizer의 8주 리팩토링 계획을 기반으로 한 세부 TODO 목록입니다. 각 Phase별 구체적인 작업 항목과 체크포인트를 제공하여 체계적인 리팩토링을 지원합니다.

---

## 🗓️ **8주 리팩토링 로드맵**

```
Week 1-2: Phase 1 - Store 아키텍처 구축
Week 3-4: Phase 2 - 핵심 기능 마이그레이션
Week 5-6: Phase 3 - 고급 기능 및 협업 시스템
Week 7-8: Phase 4 - 최적화 및 통합 테스트
```

---

## 🚀 **Phase 1: Store 아키텍처 구축 (Week 1-2)**

### **1.1 개발 환경 설정**
- [ ] **Zustand 설치 및 설정**
  ```bash
  npm install zustand immer
  npm install --save-dev @types/node
  ```
- [ ] **MobX 설치 (고급 기능용)**
  ```bash
  npm install mobx mobx-react-lite
  ```
- [ ] **폴더 구조 생성**
  ```
  src/stores/
  src/services/
  src/types/
  src/hooks/
  ```

### **1.2 기본 Store 구조 생성**

#### **1.2.1 TagStore 생성 (우선순위: 🔴 Critical)**
- [ ] **TagStore 인터페이스 설계**
  ```typescript
  interface TagStore {
    // State
    tags: Map<string, Tag>;
    selectedTagIds: Set<string>;
    
    // Actions
    createTag: (data: CreateTagRequest) => void;
    updateTag: (id: string, data: Partial<Tag>) => void;
    deleteTag: (id: string) => void;
    
    // Selectors
    getTagsByPage: (page: number) => Tag[];
    getTagsByCategory: (category: CategoryType) => Tag[];
  }
  ```
- [ ] **TagStore 기본 구현**
- [ ] **Tag CRUD 기능 구현**
- [ ] **선택 상태 관리**
- [ ] **페이지별 필터링**
- [ ] **카테고리별 필터링**

#### **1.2.2 RelationshipStore 생성 (우선순위: 🔴 Critical)**
- [ ] **RelationshipStore 인터페이스**
- [ ] **관계 생성/수정/삭제**
- [ ] **관계 타입별 필터링**
- [ ] **태그 간 연결 관리**

#### **1.2.3 PDFStore 생성 (우선순위: 🔴 Critical)**
- [ ] **PDF 로드 상태 관리**
- [ ] **현재 페이지 관리**
- [ ] **스케일/회전 상태**
- [ ] **뷰포트 좌표 관리**

#### **1.2.4 기본 Settings Store**
- [ ] **패턴/공차 설정 관리**
- [ ] **가시성 설정 관리**
- [ ] **색상 설정 관리**
- [ ] **사용자 환경 설정**

### **1.3 Store 테스트 및 검증**
- [ ] **각 Store 단위 테스트 작성**
- [ ] **Store 간 상호작용 테스트**
- [ ] **메모리 누수 검사**
- [ ] **성능 벤치마크 (기준점 설정)**

### **1.4 Phase 1 완료 체크포인트**
- [ ] ✅ 모든 기본 Store 동작 확인
- [ ] ✅ App.tsx와 Store 병행 운영 확인
- [ ] ✅ 기존 기능 동작 보장
- [ ] ✅ 테스트 커버리지 80% 이상

---

## 🔄 **Phase 2: 핵심 기능 마이그레이션 (Week 3-4)**

### **2.1 PDF 처리 로직 분리**

#### **2.1.1 PDFService 리팩토링**
- [ ] **PDF 로드 로직을 PDFStore로 이전**
  ```typescript
  // AS-IS: App.tsx
  const handleFileSelect = async (file: File) => { /* 200줄 */ };
  
  // TO-BE: PDFStore
  class PDFStore {
    async loadPDF(file: File) { /* Store 메서드 */ }
  }
  ```
- [ ] **청크 기반 페이지 처리**
- [ ] **메모리 최적화 (대용량 PDF 지원)**
- [ ] **에러 처리 및 복구**

#### **2.1.2 TaggingService 통합**
- [ ] **taggingService.ts를 TagStore와 연동**
- [ ] **4-Pass 추출 로직 최적화**
- [ ] **실시간 진행률 표시**
- [ ] **중단/재개 기능**

### **2.2 Tag 관리 시스템 완전 이전**

#### **2.2.1 App.tsx → TagStore 마이그레이션**
- [ ] **handleCreateTag 로직 이전** (120줄 → Store 메서드)
- [ ] **handleUpdateTagText 로직 이전** (80줄 → Store 메서드)
- [ ] **handleDeleteTags 로직 이전** (60줄 → Store 메서드)
- [ ] **handleToggleReview 로직 이전** (40줄 → Store 메서드)

#### **2.2.2 선택 및 상호작용 관리**
- [ ] **다중 선택 로직 이전**
- [ ] **드래그 선택 지원**
- [ ] **키보드 단축키 연동**
- [ ] **컨텍스트 메뉴 통합**

#### **2.2.3 검색 및 필터링 고도화**
- [ ] **텍스트 검색 최적화**
- [ ] **정규식 검색 지원**
- [ ] **복합 필터 (페이지 + 카테고리 + 검토상태)**
- [ ] **검색 결과 하이라이트**

### **2.3 Relationship 관리 시스템**

#### **2.3.1 관계 생성 최적화**
- [ ] **관계 생성 UI 개선** (현재 10초 → 목표 1초)
- [ ] **시각적 피드백 강화**
- [ ] **자동 관계 제안 시스템**
- [ ] **관계 검증 로직 추가**

#### **2.3.2 OPC 관계 특별 처리**
- [ ] **OffPageConnector 태그 감지**
- [ ] **OPC 관계 자동 연결**
- [ ] **OPC 그룹 관리**
- [ ] **OPC 상태 표시 (connected/invalid/single)**

### **2.4 Phase 2 완료 체크포인트**
- [ ] ✅ App.tsx 코드 1,500줄 → 800줄 이하로 감소
- [ ] ✅ 페이지 전환 속도 10초 → 3초 이하
- [ ] ✅ 태그 생성/수정 속도 50% 개선
- [ ] ✅ 기존 모든 기능 정상 작동

---

## 🎯 **Phase 3: 고급 기능 및 협업 시스템 (Week 5-6)**

### **3.1 고급 기능 Store 생성**

#### **3.1.1 CommentStore**
- [ ] **댓글 CRUD 기능**
- [ ] **우선순위별 필터링**
- [ ] **해결 상태 관리**
- [ ] **대상 엔티티별 댓글 조회**
- [ ] **스레드형 댓글 지원**

#### **3.1.2 DescriptionStore**  
- [ ] **Note & Hold 관리**
- [ ] **페이지별 번호 관리**
- [ ] **자동 링크 기능**
- [ ] **Description 타입별 분류**

#### **3.1.3 LoopStore**
- [ ] **Loop 자동 생성 알고리즘**
- [ ] **Loop 검증 로직**
- [ ] **Loop 시각화**
- [ ] **Loop 분석 리포트**

### **3.2 다중 사용자 협업 시스템**

#### **3.2.1 사용자 인증 시스템**
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

#### **3.2.2 프로젝트 관리 시스템**
- [ ] **ProjectDashboard 컴포넌트**
- [ ] **프로젝트 생성/선택**
- [ ] **프로젝트 목록 (개인/공유 구분)**
- [ ] **프로젝트 권한 관리**

#### **3.2.3 작업 할당 시스템**
- [ ] **WorkAssignmentPanel 컴포넌트**
- [ ] **페이지별 작업 할당**
- [ ] **카테고리별 작업 할당**
- [ ] **작업 진행률 추적**
- [ ] **완료 상태 관리**

### **3.3 프로젝트 병합 시스템**

#### **3.3.1 ProjectMerger 개발**
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

#### **3.3.2 Export/Import 확장**
- [ ] **작업 영역별 부분 Export**
- [ ] **메타데이터 포함 Export**
- [ ] **버전 호환성 확인**
- [ ] **Import 사전 검증**

### **3.4 Phase 3 완료 체크포인트**
- [ ] ✅ 다중 사용자 로그인 시스템 동작
- [ ] ✅ 프로젝트 생성/선택 기능 완료
- [ ] ✅ 작업 할당 및 진행률 추적 가능
- [ ] ✅ 프로젝트 병합 기본 기능 동작

---

## ⚡ **Phase 4: 최적화 및 통합 테스트 (Week 7-8)**

### **4.1 성능 최적화**

#### **4.1.1 렌더링 최적화** 
- [ ] **좌표 변환 캐싱 시스템**
  ```typescript
  const transformCache = useMemo(() => {
    const cache = new Map();
    currentTags.forEach(tag => {
      const key = `${tag.id}-${scale}`;
      cache.set(key, transformCoordinates(tag.bbox));
    });
    return cache;
  }, [currentTags, scale]);
  ```
- [ ] **관계 렌더링 최적화** (현재 완료: Connection/Installation만 계산)
- [ ] **조건부 TagHighlight 렌더링**
- [ ] **SVG 가상화 (뷰포트 기반)**

#### **4.1.2 메모리 최적화**
- [ ] **페이지 변경 시 캐시 정리**
- [ ] **불필요한 선택 상태 정리**
- [ ] **가비지 컬렉션 최적화**
- [ ] **메모리 누수 모니터링**

#### **4.1.3 useMemo 의존성 최적화**
- [ ] **과도한 의존성 배열 정리**
- [ ] **계산 비용 높은 로직 최적화**
- [ ] **불필요한 재계산 방지**

### **4.2 UI/UX 개선**

#### **4.2.1 컴포넌트 리팩토링**
- [ ] **Header.tsx 간소화** (30+ props → 5개 이하)
- [ ] **SidePanel.tsx 분할** (2,000줄 → 도메인별 분리)
- [ ] **PdfViewer.tsx 최적화** (비즈니스 로직 분리)
- [ ] **반응형 디자인 개선**

#### **4.2.2 사용자 경험 향상**
- [ ] **로딩 상태 표시 개선**
- [ ] **에러 처리 및 복구 가이드**
- [ ] **키보드 단축키 확장**
- [ ] **도움말 및 튜토리얼**

### **4.3 통합 테스트**

#### **4.3.1 기능 테스트**
- [ ] **전체 워크플로우 테스트**
  - [ ] PDF 업로드 → 태그 추출 → 관계 생성 → Excel 내보내기
  - [ ] 다중 사용자 협업 → 작업 할당 → 결과 병합
  - [ ] 프로젝트 저장/불러오기 → 설정 복원

#### **4.3.2 성능 테스트**
- [ ] **대용량 PDF 테스트** (150페이지 이상)
- [ ] **다량 태그 테스트** (5,000개 이상)
- [ ] **다중 관계 테스트** (1,000개 이상)
- [ ] **브라우저 호환성 테스트**

#### **4.3.3 사용자 수용 테스트**
- [ ] **실제 사용자 시나리오 테스트**
- [ ] **사용성 피드백 수집**
- [ ] **성능 체감 평가**
- [ ] **버그 리포트 및 수정**

### **4.4 최종 정리**

#### **4.4.1 코드 정리**
- [ ] **App.tsx 최종 정리** (목표: 150줄 이하)
- [ ] **사용하지 않는 코드 제거**
- [ ] **타입 정의 정리 및 최적화**
- [ ] **주석 및 문서화**

#### **4.4.2 배포 준비**
- [ ] **빌드 설정 최적화**
- [ ] **번들 크기 최적화**
- [ ] **환경별 설정 구분**
- [ ] **배포 스크립트 작성**

### **4.5 Phase 4 완료 체크포인트**
- [ ] ✅ **성능 목표 달성**
  - 페이지 전환: 10초 → 1-2초
  - 메모리 사용: 50MB → 20MB
  - DOM 노드: 10,000개 → 3,000개
- [ ] ✅ **코드 품질 목표 달성**
  - App.tsx: 1,500줄 → 150줄 (90% 감소)
  - 테스트 커버리지: 80% 이상
- [ ] ✅ **기능 완전성 보장**
  - 모든 기존 기능 정상 동작
  - 새로운 협업 기능 동작
- [ ] ✅ **사용자 만족도**
  - 기존 UX와 동일하거나 개선
  - 새로운 협업 기능 사용 가능

---

## 📊 **일별 세부 스케줄**

### **Week 1: Store 기반 구축**
- **Day 1-2**: 개발환경 + TagStore 기본 구조
- **Day 3-4**: RelationshipStore + PDFStore
- **Day 4-5**: SettingsStore + Store 간 연동 테스트

### **Week 2: Store 완성 및 검증**
- **Day 6-7**: Store 단위 테스트 작성
- **Day 8-9**: App.tsx와 Store 병행 운영 설정
- **Day 10**: Phase 1 완료 검증 및 체크포인트

### **Week 3: PDF 처리 및 Tag 시스템**
- **Day 11-12**: PDF 처리 로직 Store 이전
- **Day 13-14**: Tag CRUD 완전 마이그레이션  
- **Day 15**: Tag 관련 기능 테스트 및 최적화

### **Week 4: Relationship 시스템 완성**
- **Day 16-17**: Relationship 생성/관리 최적화
- **Day 18-19**: OPC 관계 특별 처리 구현
- **Day 20**: Phase 2 완료 검증

### **Week 5: 고급 기능 Store**
- **Day 21-22**: CommentStore + DescriptionStore
- **Day 23-24**: LoopStore + 자동 생성 알고리즘
- **Day 25**: 고급 기능 통합 테스트

### **Week 6: 다중 사용자 시스템**
- **Day 26-27**: 사용자 인증 + 프로젝트 관리
- **Day 28-29**: 작업 할당 + 병합 시스템 기본
- **Day 30**: Phase 3 완료 검증

### **Week 7: 성능 최적화**
- **Day 31-32**: 렌더링 + 메모리 최적화
- **Day 33-34**: UI 컴포넌트 리팩토링
- **Day 35**: 성능 테스트 및 벤치마크

### **Week 8: 통합 테스트 및 배포**
- **Day 36-37**: 전체 기능 통합 테스트
- **Day 38-39**: 사용자 수용 테스트 + 버그 수정
- **Day 40**: 최종 정리 + 배포 준비

---

## 🎯 **성공 지표**

### **정량적 지표**
- **코드 품질**: App.tsx 90% 축소 (1,500줄 → 150줄)
- **성능**: 페이지 전환 시간 80% 단축 (10초 → 2초)
- **메모리**: 사용량 60% 감소 (50MB → 20MB)
- **테스트**: 커버리지 80% 이상

### **정성적 지표**
- **기능 완전성**: 모든 기존 기능 정상 작동
- **사용자 경험**: 기존과 동일하거나 개선된 UX  
- **확장성**: 새 기능 추가 시간 50% 단축
- **유지보수성**: 코드 복잡도 대폭 감소

### **협업 기능 지표**
- **다중 사용자**: 로그인/프로젝트 관리 시스템 동작
- **작업 분담**: 페이지별/카테고리별 할당 가능
- **결과 통합**: 지능적 병합 및 충돌 해결 가능

---

## ⚠️ **리스크 관리**

### **높은 리스크**
1. **기능 손실**: 리팩토링 중 기존 기능 손실 위험
   - **대응**: 단계별 검증, 병행 운영
2. **성능 저하**: Store 오버헤드로 인한 성능 저하
   - **대응**: 지속적인 성능 모니터링, 최적화

### **중간 리스크**  
1. **일정 지연**: 복잡한 로직 이전 시 예상보다 시간 소요
   - **대응**: 버퍼 시간 확보, 우선순위 조정
2. **사용자 적응**: 새로운 UI/UX 적응 시간 필요
   - **대응**: 점진적 변화, 사용자 가이드 제공

### **낮은 리스크**
1. **기술적 문제**: Zustand/MobX 기술 이슈
   - **대응**: 대체 기술 스택 준비
2. **브라우저 호환성**: 새로운 기능의 호환성 이슈  
   - **대응**: 폴리필, 점진적 향상

---

이 TODO 목록은 **살아있는 문서**로, 개발 진행에 따라 지속적으로 업데이트되며 각 항목의 완료 상태를 실시간으로 추적합니다.