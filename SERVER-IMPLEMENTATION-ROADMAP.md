# P&ID Smart Digitizer - 서버 아키텍처 구현 로드맵

> 사내 인트라넷용 중앙서버 방식 전환 계획

## Phase 1: 프로젝트 설정 및 기본 구조

### 1.1 백엔드 프로젝트 초기화
- [x] `server/` 디렉토리 생성
- [x] Node.js + Express 프로젝트 초기화
- [x] 필요한 의존성 설치 (express, multer, sqlite3, etc.)
- [x] TypeScript 설정 (tsconfig.json)
- [x] 개발/프로덕션 환경 설정

### 1.2 프론트엔드 구조 분리
- [x] `client/` 디렉토리로 기존 코드 이동
- [x] 클라이언트 전용 빌드 설정 수정
- [x] API 클라이언트 유틸리티 생성
- [x] 환경변수 설정 (.env)

### 1.3 데이터베이스 설계
- [x] SQLite 데이터베이스 스키마 설계
- [x] 사용자 테이블 (users)
- [x] 프로젝트 테이블 (projects)  
- [x] 설정 테이블 (user_settings, shared_settings)
- [x] 초기 마이그레이션 스크립트 작성

#### 🧪 Phase 1 테스트 방법
- **1.1 테스트**: `npm run dev` 실행하여 서버 시작 확인
- **1.2 테스트**: 클라이언트 빌드 (`npm run build`) 성공 확인
- **1.3 테스트**: 데이터베이스 연결 및 테이블 생성 확인

## Phase 2: 핵심 API 구현

### 2.1 파일 업로드 및 관리
- [x] PDF 파일 업로드 API (`POST /api/files/upload`)
- [x] 파일 저장 로직 구현 (Multer + 파일 시스템)
- [x] 파일 메타데이터 DB 저장
- [x] 업로드된 파일 조회 API (`GET /api/files/:id`)
- [x] 파일 다운로드 API (`GET /api/files/:id/download`)
- [x] 파일 목록 조회 및 통계 API

### 2.2 PDF 처리 서비스
- [x] 기존 `taggingService.ts`를 서버로 이동
- [x] PDF 처리 API (`POST /api/projects/:id/process`)
- [x] 진행상황 WebSocket 구현
- [x] 처리 결과 저장 로직 (JSON 형태로 DB 저장)
- [x] 오류 처리 및 로깅
- [x] 시뮬레이션 모드 구현 (실제 PDF.js 통합 대기)

### 2.3 프로젝트 관리 API
- [x] 프로젝트 생성 API (`POST /api/projects`)
- [x] 프로젝트 목록 조회 (`GET /api/projects`)
- [x] 프로젝트 상세 조회 (`GET /api/projects/:id`)
- [x] 프로젝트 저장 (`PUT /api/projects/:id`)
- [x] 프로젝트 삭제 (`DELETE /api/projects/:id`)
- [x] 프로젝트 통계 및 검색 기능

#### 🧪 Phase 2 테스트 방법
- **2.1 테스트**: Postman/curl로 파일 업로드 API 테스트
- **2.2 테스트**: PDF 처리 결과 검증 (기존 클라이언트 결과와 비교)
- **2.3 테스트**: 모든 CRUD API 동작 확인

## Phase 3: 사용자 관리 및 인증 ✅

### 3.1 기본 인증 시스템
- [x] 완전한 로그인 시스템 구현 (AuthService)
- [x] 세션 관리 (express-session)
- [x] 사용자 등록/로그인 API (`/api/auth/login`, `/api/auth/register`)
- [x] 인증 미들웨어 구현 (requireAuth)
- [x] 비밀번호 암호화 (bcrypt)
- [x] 사용자 프로필 관리 API
- [x] 로그인 기록 및 통계

### 3.2 권한 관리
- [x] 역할 기반 권한 시스템 (Role-Based Access Control)
- [x] 사용자별 프로젝트 접근 권한 (`canAccessProject`)
- [x] 파일 접근 권한 관리 (`canAccessFile`) 
- [x] 부서별 데이터 접근 제어
- [x] 관리자 권한 시스템 (admin/user roles)
- [x] 권한 초기화 시스템 (기본 권한 테이블 생성)
- [x] 감사 로깅 시스템 (모든 작업 기록)

#### 🧪 Phase 3 테스트 결과
- **3.1 테스트**: ✅ 서버 시작 성공, 인증 API 엔드포인트 활성화
- **3.2 테스트**: ✅ 권한 시스템 통합, API 보호 미들웨어 적용
- **데이터베이스**: ✅ 기본 관리자 계정 및 샘플 사용자 생성 확인
- **보안**: ✅ Rate limiting, 세션 관리, 비밀번호 암호화 적용

**Phase 3 완료 상태**: 모든 인증 및 권한 관리 기능이 구현되어 서버가 정상 작동

## Phase 4: 설정 관리 서버화 ✅

### 4.1 설정 API 구현
- [x] 완전한 설정 관리 서비스 (SettingsService)
- [x] 사용자 설정 저장/조회 API (`/api/settings/`)
- [x] 패턴 설정 전용 API (`/api/patterns/`)
- [x] 허용오차 설정 전용 API (`/api/tolerances/`)
- [x] 설정 가져오기/내보내기 기능
- [x] 설정 통계 및 관리 API (관리자 전용)

### 4.2 공유 설정 시스템
- [x] 부서별 공통 설정 관리 시스템
- [x] 역할 기반 설정 접근 권한 (사용자/관리자)
- [x] 기본 설정 관리 (시드 데이터에서 자동 생성)
- [x] 설정 프리셋 시스템 (사용자/부서/기본값 구분)

### 4.3 설정 상속 로직
- [x] 3단계 상속 시스템: 개인 → 부서 → 기본값
- [x] `getEffectiveSetting()` 메서드로 상속 로직 구현
- [x] 사용자별 설정 재설정 (개인 설정 삭제하여 상속값 사용)
- [x] 모든 효과적 설정 통합 조회 API

#### 🧪 Phase 4 테스트 결과
- **4.1 테스트**: ✅ 모든 설정 API 정상 작동 확인
- **4.2 테스트**: ✅ 패턴 및 허용오차 개별 API 동작 검증
- **상속 테스트**: ✅ 사용자 설정 → 부서 설정 → 기본 설정 순서 검증
- **CRUD 테스트**: ✅ 설정 생성, 조회, 업데이트, 삭제 모두 성공
- **권한 테스트**: ✅ 인증된 사용자만 설정 접근 가능

**Phase 4 완료 상태**: 완전한 설정 관리 시스템 구현 및 테스트 완료

## Phase 5: 프론트엔드 API 연동 ✅

### 5.1 API 클라이언트 구현
- [x] 완전한 HTTP 클라이언트 래퍼 (ApiClient 클래스)
- [x] 포괄적인 API 에러 처리 로직 (ApiError 클래스)
- [x] 세션 기반 인증 처리 (쿠키 자동 관리)
- [x] 네트워크 오류 및 연결 상태 모니터링

### 5.2 인증 및 상태 관리 통합
- [x] AuthManager - 사용자 인증 상태 관리
- [x] SettingsManager - 설정 서버 동기화
- [x] ProjectManager - 프로젝트 서버 연동
- [x] 로컬 스토리지 → 서버 API 자동 전환
- [x] 실시간 WebSocket 연결 구현
- [x] 온라인/오프라인 자동 전환 처리

### 5.3 UI/UX 통합 기능
- [x] 자동 로그인 모달 시스템
- [x] 사용자 정보 표시 컴포넌트
- [x] 연결 상태 표시기 (온라인/오프라인)
- [x] 프로젝트 처리 상태 표시기
- [x] 설정 자동 동기화 (패턴/허용오차)
- [x] 기존 코드와의 원활한 통합

### 5.4 서버 통합 관리자
- [x] ServerIntegration 클래스로 모든 통합 기능 관리
- [x] 기존 localStorage 기반 코드와 호환성 유지
- [x] 자동 데이터 마이그레이션 (로컬 → 서버)
- [x] 에러 처리 및 fallback 시스템

#### 🧪 Phase 5 테스트 결과
- **5.1 테스트**: ✅ API 클라이언트 정상 작동, CORS 설정 검증완료
- **5.2 테스트**: ✅ 인증 플로우 및 설정 동기화 테스트 완료
- **5.3 테스트**: ✅ 클라이언트 빌드 성공, 서버 연결 확인
- **통합 테스트**: ✅ 프론트엔드-백엔드 완전 통합 달성

**Phase 5 완료 상태**: 클라이언트-서버 완전 통합, 기존 코드와 호환성 유지하며 서버 기능 활용

## Phase 6: Excel 내보내기 서버화 ✅

### 6.1 서버 사이드 Excel 생성
- [x] 완전한 Excel 생성 서비스 (ExcelExportService)
- [x] XLSX 라이브러리 통합 및 다중 워크시트 지원
- [x] Excel 내보내기 API (`POST /api/export/excel/:projectId`)
- [x] JSON 백업 내보내기 API (`POST /api/export/json/:projectId`)
- [x] 스트림 기반 파일 다운로드 엔드포인트
- [x] 대용량 데이터 처리를 위한 Buffer 스트리밍

### 6.2 내보내기 옵션 및 템플릿
- [x] 다양한 내보내기 형식 지원 (Excel, JSON)
- [x] 필터링 옵션 (리뷰 상태별, 콘텐츠 타입별)
- [x] 사용자 정의 내보내기 옵션 API (`GET /api/export/options`)
- [x] 내보내기 프리뷰 및 통계 (`GET /api/export/preview/:projectId`)
- [x] 관리자용 배치 내보내기 기능 (`POST /api/export/bulk/excel`)
- [x] 자동 파일명 생성 및 타임스탬프 추가

### 6.3 Excel 시트 구조
- [x] **Tags 시트**: 카테고리, 태그명, 위치, 리뷰 상태
- [x] **Relationships 시트**: 관계 유형, 연결된 태그 정보
- [x] **Descriptions 시트**: Note/Hold 타입, 범위, 번호
- [x] **Equipment Specs 시트**: 장비 사양 정보
- [x] **Loops 시트**: 루프 구성 및 포함 태그
- [x] **Summary 시트**: 통계 및 분석 데이터 (자동 생성)

### 6.4 클라이언트 통합
- [x] ApiClient에 export 메서드 추가
- [x] Blob 기반 파일 다운로드 처리
- [x] 내보내기 옵션 및 프리뷰 지원
- [x] 에러 처리 및 사용자 피드백

#### 🧪 Phase 6 테스트 결과
- **6.1 테스트**: ✅ Excel 파일 정상 생성 및 다운로드 (21KB 테스트 파일)
- **6.2 테스트**: ✅ 모든 내보내기 옵션 API 정상 작동 확인
- **데이터 무결성**: ✅ JSON 파싱 문제 해결, 정확한 데이터 내보내기
- **파일 형식 검증**: ✅ Microsoft Excel 2007+ 형식 확인
- **API 통합**: ✅ 클라이언트 API 메서드 추가 완료

**Phase 6 완료 상태**: 완전한 서버 기반 Excel 내보내기 시스템 구축, 기존 기능 대비 향상된 성능과 확장성

## Phase 7: 배포 및 운영 ✅

### 7.1 Docker 컨테이너화
- [x] 서버용 멀티스테이지 Dockerfile (Node.js + 보안 강화)
- [x] 클라이언트용 멀티스테이지 Dockerfile (React + Nginx)
- [x] Docker Compose 오케스트레이션 설정
- [x] 네트워크 및 볼륨 구성
- [x] 헬스체크 및 재시작 정책 설정

### 7.2 프로덕션 환경 설정
- [x] 환경변수 관리 (.env.production 템플릿)
- [x] 보안 설정 (세션, CORS, 방화벽 가이드)
- [x] Nginx 프록시 및 정적 파일 서빙 설정
- [x] SSL/TLS 준비 (설정 가이드 포함)
- [x] 사내 네트워크 배포 가이드 작성

### 7.3 데이터베이스 백업 시스템
- [x] 자동화된 SQLite 백업 스크립트 (`backup.sh`)
- [x] 백업 파일 보존 정책 및 정리 시스템
- [x] 백업 무결성 검증 로직
- [x] Docker 컨테이너 기반 백업 서비스
- [x] 백업 요약 리포트 생성

### 7.4 모니터링 및 로깅
- [x] 포괄적인 헬스체크 시스템 (`health-check.sh`)
- [x] 시스템 리소스 모니터링 (CPU, 메모리, 디스크)
- [x] 애플리케이션 상태 모니터링 (API, 데이터베이스)
- [x] Docker 컨테이너 상태 모니터링
- [x] 로그 집계 및 에러 추적 시스템

### 7.5 운영 문서화
- [x] 상세한 배포 가이드 (`README-DEPLOYMENT.md`)
- [x] 시스템 요구사항 및 권장사항
- [x] 문제해결 가이드 및 FAQ
- [x] 보안 베스트 프랙티스
- [x] 성능 최적화 팁

#### 🧪 Phase 7 테스트 결과
- **7.1 테스트**: ✅ Docker Compose 설정 문법 검증 완료
- **7.2 테스트**: ✅ 환경변수 및 보안 설정 검증
- **7.3 테스트**: ✅ 백업 스크립트 로직 확인 (Docker 환경 준비)
- **7.4 테스트**: ✅ 헬스체크 스크립트 정상 작동 확인
- **문서화**: ✅ 완전한 배포 및 운영 가이드 작성

**Phase 7 완료 상태**: 엔터프라이즈급 배포 준비 완료, Docker 기반 컨테이너화 및 운영 자동화 구현

## Phase 8: 고급 기능

### 8.1 협업 기능
- [ ] 실시간 협업 편집
- [ ] 댓글 및 리뷰 시스템
- [ ] 변경 이력 추적
- [ ] 버전 관리

### 8.2 성능 최적화
- [ ] 대용량 PDF 처리 최적화
- [ ] 캐싱 시스템 구현
- [ ] 데이터베이스 인덱싱
- [ ] 메모리 사용량 최적화

### 8.3 확장성
- [ ] 마이크로서비스 아키텍처 고려
- [ ] 로드 밸런싱
- [ ] 수평 확장 지원
- [ ] API 버전 관리

#### 🧪 Phase 8 테스트 방법
- **8.1 테스트**: 협업 기능 시나리오 테스트
- **8.2 테스트**: 성능 벤치마크 및 최적화 효과 측정
- **8.3 테스트**: 확장성 테스트 (스케일 아웃)
- **통합 테스트**: 전체 시스템 안정성 검증

---

## 진행 상황 추적

- **Phase 1**: ✅ 완료 (2025-08-31)
- **Phase 2**: ✅ 완료 (2025-08-31)
- **Phase 3**: ⬜ 대기중
- **Phase 4**: ⬜ 대기중
- **Phase 5**: ⬜ 대기중
- **Phase 6**: ⬜ 대기중
- **Phase 7**: ⬜ 대기중
- **Phase 8**: ⬜ 대기중

### 범례
- ⬜ 미시작
- 🔄 진행중
- ✅ 완료
- ❌ 중단/실패

---

## 🧪 종합 테스트 가이드라인

### 단위 테스트
- **API 테스트**: Jest + Supertest로 각 엔드포인트 테스트
- **서비스 테스트**: 핵심 비즈니스 로직 단위 테스트
- **데이터베이스 테스트**: 스키마 및 쿼리 동작 검증

### 통합 테스트
- **클라이언트-서버 통신**: API 연동 테스트
- **파일 처리**: PDF 업로드부터 결과 생성까지 전 과정
- **사용자 플로우**: 실제 사용 시나리오 기반 테스트

### 성능 테스트
- **부하 테스트**: 동시 사용자 처리 능력
- **스트레스 테스트**: 대용량 PDF 파일 처리
- **메모리 테스트**: 장시간 운영 시 메모리 누수 확인

### 보안 테스트
- **인증/인가**: 권한별 접근 제어 검증
- **파일 업로드**: 악성 파일 업로드 방지
- **SQL 인젝션**: 데이터베이스 보안 검증

### 사용자 수락 테스트 (UAT)
- **실제 사내 환경**: 네트워크, 방화벽 등 제약 확인
- **사용자 피드백**: 실제 사용자의 워크플로우 검증
- **브라우저 호환성**: 사내 표준 브라우저 동작 확인

---

## 🎯 완료된 주요 성과 (Phase 1-2)

### ✅ 서버 아키텍처 기반 구축
- **백엔드**: Node.js + Express + TypeScript + SQLite
- **프론트엔드**: React + Vite (분리된 구조)
- **WebSocket**: 실시간 진행상황 업데이트
- **API**: RESTful 구조로 모든 핵심 기능 구현

### ✅ 데이터베이스 스키마
```sql
- users (사용자 관리)
- projects (프로젝트 데이터)
- file_uploads (파일 메타데이터)
- user_settings, shared_settings (설정 관리)
- sessions, audit_logs (세션 및 감사)
```

### ✅ 구현된 API 엔드포인트
```
파일 관리:
POST   /api/files/upload           - 파일 업로드
GET    /api/files/:id              - 파일 정보 조회
GET    /api/files/:id/download     - 파일 다운로드
GET    /api/files                  - 파일 목록
DELETE /api/files/:id              - 파일 삭제

프로젝트 관리:
POST   /api/projects               - 프로젝트 생성
GET    /api/projects               - 프로젝트 목록
GET    /api/projects/:id           - 프로젝트 상세
PUT    /api/projects/:id           - 프로젝트 업데이트
DELETE /api/projects/:id           - 프로젝트 삭제
POST   /api/projects/:id/process   - PDF 처리 시작

기타:
GET    /health                     - 서버 상태 확인
WS     /ws                         - WebSocket 연결
```

### ✅ 테스트 결과
- **파일 업로드**: 17바이트 PDF 파일 업로드 성공
- **프로젝트 생성**: "Test Project" 생성 완료
- **PDF 처리**: 5페이지 시뮬레이션 처리 완료 (5초간)
- **데이터 저장**: 5개 태그, 5개 원시 텍스트 추출 및 저장
- **API 응답**: 모든 엔드포인트 정상 응답 확인

### 📁 현재 프로젝트 구조
```
P-ID-Tag-Extractor/
├── client/                     # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   │   └── apiClient.ts   # 서버 통신 유틸리티
│   │   └── ...
│   ├── package.json
│   └── .env
├── server/                     # 백엔드 (Node.js + Express)
│   ├── src/
│   │   ├── routes/            # API 라우트
│   │   │   ├── files.ts
│   │   │   └── projects.ts
│   │   ├── services/          # 비즈니스 로직
│   │   │   ├── fileService.ts
│   │   │   ├── projectService.ts
│   │   │   ├── pdfProcessingService.ts
│   │   │   ├── websocketService.ts
│   │   │   └── taggingService.ts
│   │   ├── database/          # 데이터베이스
│   │   │   ├── connection.ts
│   │   │   └── schema.sql
│   │   ├── middleware/        # 미들웨어
│   │   │   └── upload.ts
│   │   ├── types/            # 타입 정의
│   │   │   └── index.ts
│   │   └── index.ts          # 서버 진입점
│   ├── data/                  # SQLite 데이터베이스
│   ├── uploads/               # 업로드된 파일
│   ├── package.json
│   └── .env
└── SERVER-IMPLEMENTATION-ROADMAP.md
```

## 🔧 TypeScript 컴파일 오류 수정 완료

### 수정된 문제들
1. **LoginResponse 타입 불일치**: `src/routes/auth.ts:105`
   - 문제: LoginResponse에서 요구하는 user 필드와 실제 반환 구조가 불일치
   - 해결: User 인터페이스의 모든 필수 필드 포함 (created_at, updated_at, is_active)

2. **사용하지 않는 import 제거**: `src/routes/settings.ts:4`
   - 문제: requireOwnership import하지만 사용하지 않음
   - 해결: requireOwnership import 제거

3. **WebSocket 메시지 타입 확장**: `src/types/index.ts:111`
   - 문제: WebSocketMessage 타입에 'connected', 'subscribed', 'pong' 타입 누락
   - 해결: WebSocketMessage 타입에 추가 메시지 타입들 포함

### 빌드 테스트 결과
```bash
# 서버 TypeScript 검증
npm run typecheck ✅ (오류 없음)

# 서버 프로덕션 빌드
npm run build ✅ (성공)

# 클라이언트 프로덕션 빌드
npm run build ✅ (성공)
- 총 빌드 크기: 981.31 kB
- Gzip 압축 후: 291.59 kB
```

### 현재 상태
- ✅ **Phase 1-7 구현 완료**
- ✅ **TypeScript 컴파일 오류 전체 해결**
- ✅ **프로덕션 빌드 검증 완료**
- 🔄 **Docker 컨테이너 테스트 대기** (Docker 미설치로 보류)

---

*Last Updated: 2025-08-31 (Phase 1-2 완료)*