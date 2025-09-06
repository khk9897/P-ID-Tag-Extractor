# P&ID Tag Extractor 문서 모음

이 폴더는 P&ID Tag Extractor 프로젝트의 기술 문서들을 체계적으로 정리한 곳입니다.

## 📚 문서 목록

### **아키텍처 & 설계**
1. **[01-architecture-refactoring-plan.md](01-architecture-refactoring-plan.md)**
   - 전체 아키텍처 리팩토링 계획
   - AS-IS vs TO-BE 분석
   - 8주 구현 로드맵

2. **[02-session-data-management.md](02-session-data-management.md)**
   - 세션 데이터 관리 시스템 설계
   - 다중 사용자/프로젝트 지원
   - 실시간 동기화 및 충돌 해결

3. **[03-database-schema-design.md](03-database-schema-design.md)**
   - 완전한 RDBMS 스키마 설계
   - 16개 테이블 상세 정의
   - 성능 최적화 및 보안 전략

4. **[04-database-schema-summary.md](04-database-schema-summary.md)**
   - 데이터베이스 스키마 요약본
   - 테이블 구조 및 관계 간단 정리
   - 빠른 참조용 문서

### **최적화 & 성능**
5. **[05-performance-optimization.md](05-performance-optimization.md)**
   - 성능 최적화 가이드
   - 메모리 관리 및 렌더링 최적화
   - 프로파일링 및 벤치마크

### **프로젝트 관리**
6. **[06-todo-list.md](06-todo-list.md)**
   - 프로젝트 할 일 목록
   - 기능 개발 계획
   - 이슈 및 개선사항

### **사용자 문서**
- **[user-manual-korean.md](user-manual-korean.md)**
  - 한국어 사용자 매뉴얼
  - 기능별 사용법 가이드
  
- **[introduction-korean.md](introduction-korean.md)**
  - 프로젝트 소개서 (한국어)
  - 주요 기능 및 특징

## 📖 문서 읽는 순서

### **개발자용**
1. `01-architecture-refactoring-plan.md` - 전체 구조 이해
2. `02-session-data-management.md` - 세션 시스템 설계
3. `04-database-schema-summary.md` - DB 구조 빠른 파악
4. `03-database-schema-design.md` - 상세 DB 설계 (필요시)
5. `05-performance-optimization.md` - 성능 최적화

### **프로젝트 매니저용**
1. `introduction-korean.md` - 프로젝트 개요
2. `01-architecture-refactoring-plan.md` - 개발 계획
3. `06-todo-list.md` - 진행 상황

### **사용자용**
1. `introduction-korean.md` - 프로젝트 소개
2. `user-manual-korean.md` - 사용법 가이드

## 🔄 문서 버전 관리

모든 문서는 Git으로 버전 관리되며, 다음 규칙을 따릅니다:

- **Major 변경**: 구조적 변경, 새로운 섹션 추가
- **Minor 변경**: 내용 업데이트, 정보 보완  
- **Patch 변경**: 오타 수정, 포맷 개선

## 📝 문서 작성 가이드

### **네이밍 컨벤션**
- 기술 문서: `순번-주제-영문.md` (예: `01-architecture-refactoring-plan.md`)
- 사용자 문서: `목적-언어.md` (예: `user-manual-korean.md`)
- 순번은 읽는 순서대로 부여

### **문서 구조**
```markdown
# 제목
## 📋 개요
## 🎯 목표 (옵션)
## 📊 내용 섹션들
## 🚀 결론/다음 단계
```

### **이모지 가이드**
- 📋 개요, 요약
- 🎯 목표, 목적  
- 📊 데이터, 차트, 분석
- 🏗️ 아키텍처, 구조
- ⚡ 성능, 최적화
- 🔧 도구, 설정
- 🚀 실행, 배포
- ✅ 완료, 체크리스트
- ⚠️ 주의사항
- 💡 팁, 제안

## 🔗 관련 링크

- **프로젝트 루트**: `../README.md`
- **소스 코드**: `../src/`
- **설정 파일**: `../CLAUDE.md`

---

📅 **최종 업데이트**: 2024년 9월 6일  
👤 **관리자**: Claude Code Assistant