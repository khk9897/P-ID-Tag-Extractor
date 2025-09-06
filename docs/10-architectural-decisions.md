# P&ID Smart Digitizer 아키텍처 결정 기록 (ADR)

## 📋 개요

P&ID Smart Digitizer 리팩토링을 위한 핵심 아키텍처 결정사항들을 기록합니다. 각 결정의 배경, 고려사항, 그리고 예상되는 영향을 문서화하여 향후 개발 과정에서 일관성을 유지합니다.

---

## 🎯 **결정 요약**

| 영역 | 선택된 기술/방식 | 대안들 | 주요 이유 |
|-----|----------------|-------|----------|
| **ID 체계** | 내부 숫자 ID | String UUID, Short ID | 70% 파일 크기 절약 |
| **상태 관리** | Zustand | Redux Toolkit, Jotai | 단순함 + 충분한 기능 |
| **직렬화** | MessagePack | JSON+gzip, ProtoBuf | 바이너리 성능 + 70% 절약 |
| **API 설계** | tRPC | REST, GraphQL | TypeScript 타입 안전성 |
| **데이터베이스** | PostgreSQL + JSONB | 순수 관계형, MongoDB | 안정성 + 유연성 |
| **동기화** | Hybrid 전략 | Optimistic, Server-First | 성능 + 데이터 안전성 |

---

## 🔍 **상세 결정사항**

### **ADR-001: ID 체계 - 성능 우선 접근**

**결정**: 내부 숫자 ID 시스템 도입, 기존 파일 마이그레이션 필수

#### **배경**
- 현재: `"tag-12345-67890-abcdef"` (36자 UUID)
- 문제: 5000개 태그 × 36자 = 180KB ID 오버헤드
- 목표: 파일 크기 대폭 절감

#### **선택된 방식**
```typescript
// 내부 저장: 숫자 ID
interface CompactTag {
  id: number;          // 4 bytes
  text: string;
  category: number;    // enum으로 변환
  page: number;
  bbox: number[];      // [x1,y1,x2,y2]
}

// 마이그레이션 도구
class LegacyMigrator {
  convertProject(oldData: LegacyProjectData): ProjectData {
    // UUID → 숫자 매핑 테이블 생성
    // 모든 참조 관계 업데이트
  }
}
```

#### **예상 효과**
- ✅ 파일 크기 70% 절감
- ✅ 메모리 사용량 대폭 감소  
- ✅ 처리 속도 향상
- ⚠️ 기존 파일 마이그레이션 필요
- ⚠️ 디버깅시 ID가 직관적이지 않음

---

### **ADR-002: 상태 관리 - Zustand 채택**

**결정**: Zustand를 메인 상태 관리 라이브러리로 채택

#### **배경**
- 현재: 거대한 App.tsx에 모든 상태 혼재
- 필요: 도메인별 분리 + 간단한 사용법

#### **선택된 방식**
```typescript
// 도메인별 Store 분리
export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  selectedTagIds: [],
  
  createTag: (data) => set((state) => ({
    tags: [...state.tags, createTagFromData(data)]
  })),
  
  getTagsByPage: (page) => 
    get().tags.filter(tag => tag.page === page)
}));

export const useProjectStore = create<ProjectStore>((set) => ({
  currentPage: 1,
  scale: 1.0,
  setCurrentPage: (page) => set({ currentPage: page })
}));
```

#### **예상 효과**
- ✅ 학습 곡선 낮음
- ✅ 보일러플레이트 최소
- ✅ TypeScript 지원 우수
- ✅ 성능 최적화 쉬움
- ⚠️ 대규모 애플리케이션에서 검증 부족

---

### **ADR-003: 직렬화 - MessagePack 바이너리**

**결정**: MessagePack을 데이터 직렬화 형식으로 채택

#### **배경**
- 현재: `JSON.stringify(data, null, 2)` (Pretty print로 30% 크기 증가)
- 문제: 50MB 파일도 일괄 로딩
- 목표: 저장/로딩 속도 개선

#### **선택된 방식**
```typescript
import * as msgpack from '@msgpack/msgpack';

class DataSerializer {
  static serialize(data: ProjectData): Uint8Array {
    return msgpack.encode(data);
  }
  
  static deserialize(buffer: Uint8Array): ProjectData {
    return msgpack.decode(buffer) as ProjectData;
  }
  
  static getCompressionRatio(originalData: any): number {
    const jsonSize = JSON.stringify(originalData).length;
    const msgpackSize = msgpack.encode(originalData).length;
    return (jsonSize - msgpackSize) / jsonSize;
  }
}
```

#### **예상 효과**
- ✅ 파일 크기 70% 절감
- ✅ 직렬화 속도 5-10배 향상
- ✅ 메모리 효율성 개선
- ⚠️ 바이너리라 디버깅 어려움
- ⚠️ 브라우저 호환성 확인 필요

---

### **ADR-004: API 설계 - tRPC 채택**

**결정**: tRPC를 프론트엔드-백엔드 통신 프레임워크로 채택

#### **배경**
- 목표: TypeScript 타입 안전성 확보
- 요구: 빠른 개발 속도
- 고려: API 스키마 변경 빈도

#### **선택된 방식**
```typescript
// 백엔드: tRPC 라우터
export const projectRouter = t.router({
  getTags: t.procedure
    .input(z.object({ projectId: z.string() }))
    .query(({ input }) => {
      return database.tags.findMany({
        where: { projectId: input.projectId }
      });
    }),
    
  createTag: t.procedure
    .input(CreateTagSchema)
    .mutation(({ input }) => {
      return database.tags.create({ data: input });
    })
});

// 프론트엔드: 타입 안전한 클라이언트
const tags = trpc.project.getTags.useQuery({ 
  projectId: currentProject.id 
});

const createTagMutation = trpc.project.createTag.useMutation({
  onSuccess: () => {
    // 자동으로 캐시 무효화
    utils.project.getTags.invalidate();
  }
});
```

#### **예상 효과**
- ✅ 컴파일 타임 타입 체크
- ✅ 자동 API 문서화
- ✅ 클라이언트 코드 자동 생성
- ✅ 캐싱 및 상태 관리 내장
- ⚠️ tRPC 생태계 의존성

---

### **ADR-005: 데이터베이스 - PostgreSQL + JSONB 하이브리드**

**결정**: PostgreSQL을 메인 DB로, 태그/관계 데이터는 JSONB 컬럼에 저장

#### **배경**
- 관계형: 사용자, 프로젝트, 권한 등 정형 데이터
- 문서형: 태그, 관계 등 유연한 스키마 필요
- 요구: 둘 다의 장점 활용

#### **선택된 방식**
```sql
-- 정형 데이터: 관계형 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,
  -- 프로젝트 데이터는 JSONB로 저장
  project_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- JSONB 인덱스로 성능 확보
CREATE INDEX idx_project_tags ON projects 
USING GIN ((project_data->'tags'));

CREATE INDEX idx_project_page ON projects 
USING BTREE (((project_data->'metadata'->>'currentPage')::integer));
```

#### **예상 효과**
- ✅ ACID 트랜잭션 보장
- ✅ 스키마 진화 유연성
- ✅ JSON 쿼리 성능 (GIN 인덱스)
- ✅ 백업/복구 표준 도구
- ⚠️ JSONB 쿼리 복잡도

---

### **ADR-006: 동기화 전략 - Hybrid 접근**

**결정**: 중요 데이터는 Server-First, UI 상태는 Optimistic Updates

#### **배경**
- Server-First: 안전하지만 느림
- Optimistic: 빠르지만 복잡한 충돌 처리
- 요구: 데이터 유형별 차별화

#### **선택된 방식**
```typescript
// Server-First: 중요 데이터
const useServerFirstMutation = <T>(
  mutationFn: (data: T) => Promise<any>
) => {
  return useMutation({
    mutationFn,
    onMutate: () => {
      // 로딩 상태만 표시
      setIsLoading(true);
    },
    onSuccess: (data) => {
      // 서버 응답 후 UI 업데이트
      queryClient.setQueryData(queryKey, data);
      setIsLoading(false);
    }
  });
};

// Optimistic: UI 상태
const useOptimisticMutation = <T>(
  mutationFn: (data: T) => Promise<any>
) => {
  return useMutation({
    onMutate: async (newData) => {
      // 즉시 UI 업데이트
      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, newData);
      return { previousData };
    },
    onError: (err, variables, context) => {
      // 에러시 롤백
      queryClient.setQueryData(queryKey, context.previousData);
    }
  });
};
```

#### **분류 기준**
```typescript
const SyncStrategy = {
  SERVER_FIRST: [
    'tag_creation',
    'tag_deletion', 
    'relationship_creation',
    'project_settings',
    'user_permissions'
  ],
  
  OPTIMISTIC: [
    'tag_selection',
    'ui_filters',
    'zoom_scale',
    'current_page',
    'sidebar_width'
  ]
};
```

#### **예상 효과**
- ✅ 중요 데이터의 일관성 보장
- ✅ UI 반응성 개선
- ✅ 복잡도 관리 가능
- ⚠️ 분류 기준 명확히 정의 필요

---

## 🔄 **마이그레이션 계획**

### **Phase 0: 기술 스택 검증 (2주)**
- [ ] MessagePack 브라우저 호환성 테스트
- [ ] tRPC + Zustand 통합 POC
- [ ] PostgreSQL JSONB 성능 벤치마크
- [ ] 마이그레이션 도구 프로토타입

### **Phase 1: 기반 구조 (Week 1-2)**
- [ ] 새로운 ID 체계 구현
- [ ] Zustand 스토어 구조 생성  
- [ ] 데이터 직렬화 레이어 구현

### **Phase 2-4: 점진적 마이그레이션 (Week 3-8)**
- [ ] 기존 TODO 리스트 따라 진행
- [ ] 각 단계별 새로운 아키텍처 적용

---

## ⚠️ **위험 요소 및 대응**

### **High Risk**
1. **MessagePack 호환성**
   - 위험: 일부 브라우저에서 동작 안 함
   - 대응: Polyfill 준비, JSON fallback

2. **마이그레이션 실패**
   - 위험: 기존 프로젝트 파일 손상
   - 대응: 백업 필수, 단계별 검증

### **Medium Risk**
1. **tRPC 학습 곡선**
   - 위험: 개발 초기 속도 저하
   - 대응: 충분한 POC 및 문서화

2. **JSONB 쿼리 복잡도**
   - 위험: 복잡한 관계 쿼리 성능
   - 대응: 인덱스 최적화, 필요시 정규화

---

## 📊 **예상 성과**

### **정량적 지표**
- 파일 크기: 50MB → 15MB (70% 감소)
- 로딩 시간: 3-8초 → 0.5-1초 (80% 단축)
- 메모리 사용: 200MB → 80MB (60% 감소)

### **정성적 지표**  
- 개발 생산성 50% 향상
- 버그 발생률 60% 감소
- 코드 유지보수성 대폭 개선

---

이 ADR은 리팩토링 과정에서 **일관된 결정 기준**을 제공하며, 향후 아키텍처 변경 시 **영향도 분석의 기준점**이 됩니다.