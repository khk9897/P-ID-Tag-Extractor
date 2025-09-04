# 성능 디버깅 시스템 사용 가이드

## 🚀 개요

브랜치 `feature/performance-debugging`에 추가된 포괄적인 성능 디버깅 시스템입니다.

## ✅ 설치된 디버깅 기능

### 1. 전역 디버그 설정 (`constants.ts`)
- `DEBUG_MODE`: 마스터 스위치 (현재: `true`)
- `DEBUG_LEVEL`: 상세도 레벨 (`'BASIC'` | `'DETAILED'` | `'VERBOSE'`)
- `DEBUG_CATEGORIES`: 카테고리별 on/off 제어

### 2. 디버그 로거 (`utils/debugLogger.ts`)
- **성능 타이머**: `perfTimer.start()` / `perfTimer.end()`
- **함수 호출 추적**: `trackFunctionCall()`
- **렌더링 추적**: `trackRender()`
- **상태 변경 추적**: `trackStateChange()`
- **메모화 재계산 추적**: `trackMemoRecalculation()`
- **메모리 사용량 추적**: `trackMemoryUsage()`

### 3. 적용된 컴포넌트
- **App.tsx**: PDF 처리, 상태 변경, 파일 업로드 성능
- **PdfViewer.tsx**: 렌더링, 좌표 변환, 메모화 성능
- **taggingService.ts**: 태그 추출, 각 패스별 실행 시간

### 4. 성능 모니터 UI
- **키보드 단축키**: `Ctrl+Shift+P`로 토글
- **실시간 메트릭**: 함수 호출, 렌더링, 상태 변경, 메모리
- **콘솔 리포트**: 상세한 성능 분석 결과

## 🔍 사용 방법

### 1. 디버그 로그 확인
브라우저 개발자 도구 Console에서 실시간으로 확인:

```
[STATE] 12:34:56.789 File selected: test.pdf (25.43 MB)
[EXTRACT] 12:34:57.123 Starting tag extraction for page 1
[RENDER] 12:34:58.456 Page 1 rendered at scale 1.5
[FUNC] 12:34:58.789 transformCoordinates called (1234x)
```

### 2. 성능 모니터 사용
1. 애플리케이션 실행 후 `Ctrl+Shift+P` 키 조합
2. 우측 상단에 실시간 성능 패널 표시
3. 메모리 사용량, 함수 호출 횟수, 렌더링 통계 확인

### 3. 콘솔 리포트 생성
```javascript
// 브라우저 콘솔에서 실행
window.perfReport()  // 상세한 성능 리포트 출력
window.perfReset()   // 성능 데이터 초기화
```

## 📊 주요 메트릭

### 성능 병목 지점 식별
- **transformCoordinates**: 좌표 변환 함수 호출 횟수
- **renderPage**: 페이지 렌더링 소요 시간
- **extractTags_page_N**: 페이지별 태그 추출 시간
- **visibleRelationships**: 관계 필터링 계산 시간

### 메모리 추적
- PDF 처리 전/후 메모리 사용량 비교
- 페이지별 메모리 증가량 모니터링

### 렌더링 최적화
- 컴포넌트별 렌더링 횟수 추적
- useMemo 재계산 빈도 분석

## 🎯 성능 최적화 권장사항

### 즉시 적용 가능한 개선사항
1. **좌표 변환 캐싱**: `transformCoordinates` 호출 횟수 급증 시
2. **관계 필터링 최적화**: `visibleRelationships` 재계산 빈도 높을 시
3. **메모화 의존성 최소화**: 불필요한 useMemo 재계산 감지 시

### 모니터링 포인트
- 페이지 전환 시간 (목표: <2초)
- 메모리 사용량 (목표: <50MB)
- 함수 호출 빈도 (transformCoordinates: <1000회/초)

## 🔧 디버그 모드 비활성화

프로덕션 배포 시:
```typescript
// constants.ts
export const DEBUG_MODE = false;
```

## 💡 추가 기능

- 성능 임계값 알림 설정
- 자동 성능 리포트 생성
- 성능 데이터 CSV 내보내기
- 실시간 성능 그래프 표시

---

**주의**: 디버그 모드는 성능에 약간의 오버헤드를 추가하므로 개발/테스트 환경에서만 사용하세요.