# P&ID Smart Digitizer 성능 최적화 가이드

## 📊 현재 성능 현황

### 주요 문제점
- **페이지 전환 지연**: 150장 P&ID에서 페이지 전환 시 **10초 이상** 소요
- **메모리 사용량**: 약 **30-50MB** (태그, 관계, rawTextItems)
- **렌더링 지연**: 대량 SVG 요소로 인한 브라우저 블로킹

---

## 🎯 최적화 항목 상세 분석

### 1. 좌표 변환 캐싱 최적화

#### 📍 성능 저하 이유
```javascript
// 현재: 매 렌더링마다 수천 번 호출
currentTags.map(tag => {
  const { rectX, rectY, rectWidth, rectHeight } = transformCoordinates(x1, y1, x2, y2);
  // scale이 안 바뀌어도 매번 계산
});
```
- 페이지당 100-500개 태그 × 매 렌더링 = **수만 번 중복 계산**
- 삼각함수 연산 포함으로 CPU 집약적

#### 🚀 최적화 방법
```javascript
// 개선: scale 기반 캐싱
const transformCache = useMemo(() => {
  const cache = new Map();
  currentTags.forEach(tag => {
    const key = `${tag.id}-${scale}`;
    cache.set(key, transformCoordinates(tag.bbox.x1, tag.bbox.y1, tag.bbox.x2, tag.bbox.y2));
  });
  return cache;
}, [currentTags, scale]); // rotation 제거 (변경 안됨)

// 사용
const coords = transformCache.get(`${tag.id}-${scale}`);
```

#### 📈 예상 개선 효과
- **성능**: 70-80% 개선 (좌표 계산 시간 거의 제거)
- **메모리**: +6KB/페이지 (무시할 수준)

#### 🔧 구현 난이도
- **쉬움** (1-2시간)

#### ✅ 반영 여부
- [ ] 미반영
- [ ] 진행중
- [ ] 완료

---

### 2. 관계(Relationships) 렌더링 최적화

#### 📍 성능 저하 이유
```javascript
// 현재: 전체 관계 배열을 매번 필터링
const visibleRelationships = useMemo(() => {
  const visibleRels = [];
  for (const r of relationships) {  // 잠재적으로 수만 개
    if (!isRelationshipVisible(r)) continue;
    const fromTag = tagsMap.get(r.from);
    if (fromTag?.page !== currentPage) continue;  // 매번 페이지 체크
    // ... 복잡한 조건문들
  }
  return visibleRels;
}, [relationships, currentPage, selectedTagIds, selectedRawTextItemIds, ...]);
```
- **최대 병목**: 수만 개 관계를 매번 순회
- 복잡한 의존성 배열로 자주 재계산

#### 🚀 최적화 방법

**Level 1: 관계 기본 비활성화**
```javascript
// constants.ts
export const DEFAULT_VISIBILITY_SETTINGS = {
  relationships: {
    connection: false,        // 기본 false
    installation: false,      // 기본 false  
    annotation: false,        // 기본 false
    note: false,             // 기본 false
    offPageConnection: false, // 기본 false
  }
};
```

**Level 2: 페이지별 관계 사전 필터링**
```javascript
// 페이지 변경 시 한 번만 계산
const pageRelationships = useMemo(() => {
  return relationships.filter(r => {
    const fromTag = tagsMap.get(r.from);
    const toTag = tagsMap.get(r.to) || rawTextMap.get(r.to);
    return fromTag?.page === currentPage && toTag?.page === currentPage;
  });
}, [relationships, currentPage, tagsMap, rawTextMap]);
```

#### 📈 예상 개선 효과
- **Level 1**: 80-90% 개선 (관계 렌더링 제거)
- **Level 2**: 60-70% 개선 (필터링 최적화)

#### 🔧 구현 난이도
- **Level 1**: 매우 쉬움 (15분)
- **Level 2**: 쉬움 (1시간)

#### ✅ 반영 여부
- [x] **완료** (2024.09.04)
  - **Connection과 Installation 관계만 계산** 하도록 최적화
  - 기본 가시성: `connection: true`, `installation: true`, 나머지: `false`
  - Early exit 로직으로 불필요한 관계 타입(Annotation, Note, OPC) 처리 완전 스킵
  - useMemo 의존성에서 `rawTextMap`, `selectedRawTextItemIds` 제거
  - **실제 개선**: 60% 계산량 감소 (5개 → 2개 관계 타입)

---

### 3. SVG 렌더링 성능 개선

#### 📍 성능 저하 이유
```javascript
// 현재: 수천 개 SVG 요소 + 각각 이벤트 핸들러
{currentTags.map(tag => (
  <g key={tag.id} onMouseDown={(e) => handleTagMouseDown(e, tag.id)}>
    <rect />
    <TagHighlight />  // 추가 SVG 요소들
  </g>
))}
```
- DOM 요소 과다 생성
- 각 요소마다 이벤트 리스너 할당
- CSS 애니메이션 재계산

#### 🚀 최적화 방법

**Level 1: 조건부 렌더링**
```javascript
// 보이지 않는 태그는 렌더링 스킵
{currentTags
  .filter(tag => visibilitySettings.tags[tag.category])
  .map(tag => <TagComponent />)}
```

**Level 2: 가상화 렌더링**
```javascript
const visibleTags = useMemo(() => {
  return currentTags.filter(tag => {
    const coords = transformCache.get(`${tag.id}-${scale}`);
    return isInViewport(coords, scrollX, scrollY, viewportWidth, viewportHeight);
  });
}, [currentTags, transformCache, scrollX, scrollY]);
```

**Level 3: 이벤트 델리게이션**
```javascript
// 개별 핸들러 대신 부모에서 처리
<svg onMouseDown={handleSvgClick}>
  {/* 이벤트 핸들러 제거 */}
  {currentTags.map(tag => <rect data-tag-id={tag.id} />)}
</svg>
```

#### 📈 예상 개선 효과
- **Level 1**: 40-50% 개선
- **Level 2**: 60-70% 개선 (뷰포트 외 제거)
- **Level 3**: 30-40% 개선 (이벤트 최적화)

#### 🔧 구현 난이도
- **Level 1**: 쉬움 (30분)
- **Level 2**: 보통 (3-4시간)
- **Level 3**: 보통 (2-3시간)

#### ✅ 반영 여부
- [ ] 미반영
- [ ] 진행중
- [ ] 완료

---

### 4. useMemo 의존성 최적화

#### 📍 성능 저하 이유
```javascript
// 현재: 과도한 의존성으로 자주 재계산
const someValue = useMemo(() => {
  // 계산 로직
}, [a, b, c, d, e, f, g]); // 의존성 과다
```
- 불필요한 의존성으로 빈번한 재계산
- 상태 변경 시 연쇄 재계산

#### 🚀 최적화 방법
```javascript
// 개선: 최소 필수 의존성만
const currentTags = useMemo(() => 
  tags.filter(t => t.page === currentPage),
  [tags, currentPage] // scale, selectedTagIds 등 제거
);

const tagsMap = useMemo(() => {
  const map = new Map();
  currentTags.forEach(tag => map.set(tag.id, tag));
  return map;
}, [currentTags]); // tags, currentPage 대신 currentTags 사용
```

#### 📈 예상 개선 효과
- **성능**: 30-40% 개선 (재계산 빈도 감소)

#### 🔧 구현 난이도
- **쉬움** (1시간)

#### ✅ 반영 여부
- [ ] 미반영
- [ ] 진행중
- [ ] 완료

---

### 5. TagHighlight 컴포넌트 최적화

#### 📍 성능 저하 이유
```javascript
// 현재: 모든 태그에 복잡한 하이라이트 시스템
<TagHighlight
  bbox={...}
  type={...}
  effect={...}
  // 복잡한 SVG 렌더링
/>
```
- 불필요한 하이라이트 계산
- 복잡한 SVG path 생성

#### 🚀 최적화 방법
```javascript
// 개선: 조건부 렌더링
{(isSelected || isHighlighted || isPinged) && (
  <TagHighlight {...props} />
)}

// 또는 간소화된 버전
const SimpleHighlight = ({ isSelected, bbox }) => {
  if (!isSelected) return null;
  return <rect {...bbox} className="selected-highlight" />;
};
```

#### 📈 예상 개선 효과
- **성능**: 50-60% 개선 (하이라이트 렌더링 감소)

#### 🔧 구현 난이도
- **쉬움** (1시간)

#### ✅ 반영 여부
- [ ] 미반영
- [ ] 진행중
- [ ] 완료

---

### 6. 메모리 관리 최적화

#### 📍 성능 저하 이유
- 이전 페이지 데이터 메모리 상주
- 불필요한 객체 참조 유지
- 가비지 컬렉션 지연

#### 🚀 최적화 방법
```javascript
// 페이지 변경 시 캐시 정리
useEffect(() => {
  // 이전 페이지 변환 캐시 정리
  transformCache.clear();
  
  // 불필요한 selection 정리
  setSelectedTagIds(prev => prev.filter(id => 
    currentTags.some(tag => tag.id === id)
  ));
}, [currentPage]);
```

#### 📈 예상 개선 효과
- **메모리**: 30-40% 절약
- **GC 압박**: 50% 감소

#### 🔧 구현 난이도
- **쉬움** (1시간)

#### ✅ 반영 여부
- [ ] 미반영
- [ ] 진행중
- [ ] 완료

---

## ⚡ Quick Wins (즉시 적용 가능)

### ✅ 우선순위 1: 관계 선택적 활성화 (완료)
```javascript
// App.tsx에서 기본값 변경 (완료)
relationships: {
  connection: true,        // ✅ 활성화
  installation: true,      // ✅ 활성화
  annotation: false,       // ❌ 비활성화
  note: false,            // ❌ 비활성화
  offPageConnection: false, // ❌ 비활성화
}
```
**실제 개선**: 60% (Connection/Installation만 계산)

### 우선순위 2: 좌표 변환 캐싱
```javascript
// PdfViewer.tsx에 캐싱 로직 추가 (1-2시간)
const transformCache = useMemo(/* ... */);
```
**예상 개선**: 70-80%

### 우선순위 3: 조건부 TagHighlight
```javascript
// 선택/하이라이트된 경우만 렌더링 (30분)
{isHighlighted && <TagHighlight />}
```
**예상 개선**: 50-60%

---

## 📈 성능 측정 방법

### 측정 포인트
1. **페이지 전환 시간**: `console.time('pageTransition')`
2. **렌더링 시간**: React DevTools Profiler
3. **메모리 사용량**: Chrome DevTools Memory
4. **DOM 노드 수**: `document.querySelectorAll('*').length`

### 목표 지표
- **페이지 전환**: 10초 → 1-2초
- **메모리 사용량**: 50MB → 20MB
- **DOM 노드**: 10,000개 → 3,000개

---

## 🔄 구현 로드맵

### Phase 1: Quick Wins (1일)
- [ ] 관계 기본 비활성화
- [ ] 조건부 TagHighlight
- [ ] useMemo 의존성 최적화

**예상 개선**: 페이지 전환 10초 → 3-4초

### Phase 2: 캐싱 시스템 (1주)
- [ ] 좌표 변환 캐싱
- [ ] 페이지별 관계 필터링
- [ ] 메모리 정리 시스템

**예상 개선**: 3-4초 → 1-2초

### Phase 3: 고급 최적화 (2-3주)
- [ ] 가상화 렌더링
- [ ] Canvas 기반 렌더링 (선택사항)
- [ ] 워커 기반 계산 (선택사항)

**예상 개선**: 1-2초 → 0.5-1초

---

## 🚨 주의사항

1. **기능 손실**: 일부 최적화는 기존 기능을 제한할 수 있음
2. **메모리 트레이드오프**: 캐싱은 메모리를 더 사용함
3. **복잡도 증가**: 고급 최적화는 코드 복잡도를 높임
4. **브라우저 호환성**: 일부 최적화는 최신 브라우저에서만 동작

---

## 📝 진행 상황 체크리스트

### Phase 1 (즉시 적용)
- [x] **관계 렌더링 선택적 활성화** (완료 - 2024.09.04)
  - Connection/Installation만 계산하도록 최적화
  - Early exit 로직으로 불필요한 타입 스킵
  - useMemo 의존성 최소화 포함
- [ ] TagHighlight 조건부 렌더링
- [ ] 성능 측정 코드 추가

### Phase 2 (1주 내)  
- [ ] 좌표 변환 캐싱 시스템
- [ ] 페이지별 데이터 필터링
- [ ] 메모리 정리 로직
- [ ] 성능 개선 검증

### Phase 3 (장기)
- [ ] 가상화 렌더링
- [ ] 이벤트 델리게이션
- [ ] Canvas 렌더링 검토
- [ ] 최종 성능 측정

---

*문서 작성일: 2024년 9월 4일*
*최종 업데이트: 2024년 9월 4일 - Connection/Installation 관계 최적화 완료*