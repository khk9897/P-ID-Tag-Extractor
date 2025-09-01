# P&ID Smart Digitizer - Server Architecture

> 사내 인트라넷용 중앙서버 방식 P&ID 스마트 디지타이저

## 🎯 프로젝트 개요

기존 클라이언트 사이드 처리 방식에서 **서버-클라이언트 아키텍처**로 전환된 P&ID 분석 시스템입니다. 사내 인트라넷 환경에서 다중 사용자 지원과 중앙 집중식 데이터 관리를 제공합니다.

## 🏗️ 아키텍처 구조

```
P-ID-Tag-Extractor/
├── server/                 # 백엔드 (Node.js + Express + SQLite)
│   ├── src/
│   │   ├── routes/        # API 엔드포인트
│   │   ├── services/      # 비즈니스 로직
│   │   ├── database/      # 데이터베이스 스키마
│   │   ├── middleware/    # 인증, 파일업로드 등
│   │   └── types/         # TypeScript 타입 정의
│   ├── data/              # SQLite 데이터베이스 파일
│   └── uploads/           # 업로드된 PDF 파일
├── client/                # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── components/    # UI 컴포넌트
│   │   ├── services/      # API 클라이언트
│   │   └── ...
└── docs/                  # 문서화
```

## 🚀 빠른 시작

### 1. 서버 실행
```bash
cd server
npm install
npm run dev
```

### 2. 클라이언트 실행 (별도 터미널)
```bash
cd client
npm install
npm run dev
```

### 3. 접속
- **서버**: http://localhost:3000
- **클라이언트**: http://localhost:5173
- **WebSocket**: ws://localhost:3000/ws

## 📡 API 엔드포인트

### 파일 관리
```
POST   /api/files/upload           # PDF 파일 업로드
GET    /api/files/:id              # 파일 정보 조회
GET    /api/files/:id/download     # 파일 다운로드
GET    /api/files                  # 파일 목록 조회
DELETE /api/files/:id              # 파일 삭제
GET    /api/files/stats/summary    # 파일 통계
```

### 프로젝트 관리
```
POST   /api/projects               # 프로젝트 생성
GET    /api/projects               # 프로젝트 목록 조회
GET    /api/projects/:id           # 프로젝트 상세 조회
PUT    /api/projects/:id           # 프로젝트 업데이트
DELETE /api/projects/:id           # 프로젝트 삭제
POST   /api/projects/:id/process   # PDF 처리 시작
GET    /api/projects/stats/summary # 프로젝트 통계
```

### 시스템
```
GET    /health                     # 서버 상태 확인
WS     /ws                         # WebSocket 연결
```

## 💾 데이터베이스 스키마

```sql
-- 사용자 관리
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    department VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user'
);

-- 프로젝트 데이터
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name VARCHAR(255),
    pdf_filename VARCHAR(255),
    status VARCHAR(50), -- 'created', 'processing', 'completed', 'error'
    tags_data JSON,    -- 추출된 태그 데이터
    relationships_data JSON,
    processing_progress JSON
);

-- 파일 메타데이터
CREATE TABLE file_uploads (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    original_filename VARCHAR(255),
    stored_filename VARCHAR(255),
    file_path VARCHAR(500),
    upload_status VARCHAR(50)
);

-- 사용자 설정
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    setting_key VARCHAR(100),
    setting_value JSON
);
```

## 🔧 주요 기능

### ✅ 완료된 기능 (Phase 1-2)
- **파일 업로드**: PDF 파일 업로드 및 메타데이터 관리
- **프로젝트 관리**: CRUD 작업 및 상태 추적
- **PDF 처리**: 시뮬레이션 모드로 태그 추출 테스트
- **WebSocket**: 실시간 처리 진행상황 업데이트
- **데이터베이스**: SQLite 기반 데이터 영속성
- **API 구조**: RESTful API 완전 구현

### 🚧 진행 예정 (Phase 3-8)
- **사용자 인증**: 로그인/로그아웃 시스템
- **권한 관리**: 사용자별/부서별 접근 제어
- **설정 관리**: 패턴/허용오차 서버 동기화
- **프론트엔드 연동**: 기존 UI와 서버 API 통합
- **Excel 내보내기**: 서버 사이드 보고서 생성
- **배포 준비**: Docker 및 프로덕션 환경 설정

## 📊 테스트 결과

### API 테스트 성과
```bash
# 파일 업로드 테스트
curl -X POST -F "file=@test.pdf" http://localhost:3000/api/files/upload
# ✅ {"data":{"id":1,"originalName":"test.pdf","size":17}}

# 프로젝트 생성 테스트  
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"Test Project","pdf_filename":"test.pdf","file_id":1}' \
  http://localhost:3000/api/projects
# ✅ {"data":{"id":1,"name":"Test Project","status":"created"}}

# PDF 처리 테스트
curl -X POST http://localhost:3000/api/projects/1/process
# ✅ 5페이지 시뮬레이션 처리 완료 (5초간)
# ✅ 5개 태그, 5개 원시 텍스트 추출 완료
```

## 🔒 보안 및 인트라넷 고려사항

- **파일 검증**: PDF 파일만 허용, 파일 크기 제한 (50MB)
- **세션 관리**: Express 세션 기반 인증 준비
- **CORS 설정**: 사내 IP 대역만 허용 가능
- **데이터 격리**: 사용자별 데이터 접근 제한
- **감사 로그**: 모든 사용자 활동 추적 및 기록

## 📈 성능 특성

- **동시 사용자**: 다중 사용자 동시 처리 지원
- **실시간 업데이트**: WebSocket 기반 진행상황 추적  
- **데이터 영속성**: SQLite 기반 안정적 데이터 저장
- **파일 스토리지**: 로컬/네트워크 스토리지 유연한 구성
- **확장성**: 마이크로서비스 아키텍처 전환 준비

## 🛠️ 개발 도구

### 서버 개발
```bash
npm run dev        # 개발 서버 (hot reload)
npm run build      # 프로덕션 빌드
npm run start      # 프로덕션 서버 실행
npm run test       # 테스트 실행
npm run typecheck  # TypeScript 검증
```

### 클라이언트 개발
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드  
npm run preview  # 프로덕션 미리보기
```

## 📋 현재 진행상황

- ✅ **Phase 1**: 프로젝트 설정 및 기본 구조 완료
- ✅ **Phase 2**: 핵심 API 구현 완료
- 🔄 **Phase 3**: 사용자 관리 및 인증 (진행 예정)

자세한 로드맵은 [SERVER-IMPLEMENTATION-ROADMAP.md](./SERVER-IMPLEMENTATION-ROADMAP.md)를 참조하세요.

---

## 🤝 기여

이 프로젝트는 사내 인트라넷용으로 개발되었습니다. 개발 관련 문의사항은 개발팀에 연락하시기 바랍니다.

---

*마지막 업데이트: 2025-08-31*