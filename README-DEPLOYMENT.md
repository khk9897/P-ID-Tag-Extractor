# P&ID Smart Digitizer - 배포 가이드

> 사내 인트라넷용 P&ID Smart Digitizer의 Docker 기반 배포 가이드입니다.

## 📋 시스템 요구사항

### 최소 시스템 사양
- **CPU**: 2 cores
- **메모리**: 4GB RAM
- **디스크**: 10GB 여유 공간
- **OS**: Linux (Ubuntu 20.04+ 권장)
- **Docker**: 20.10.0+
- **Docker Compose**: 1.29.0+

### 권장 시스템 사양
- **CPU**: 4+ cores
- **메모리**: 8GB+ RAM
- **디스크**: 50GB+ 여유 공간 (SSD 권장)
- **네트워크**: 1Gbps 이상

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone <repository-url>
cd P-ID-Tag-Extractor
```

### 2. 환경 설정
```bash
# 프로덕션 환경 설정 파일 복사
cp .env.production .env

# 환경 설정 편집 (중요: SESSION_SECRET 변경 필요)
nano .env
```

### 3. Docker로 실행
```bash
# 백그라운드에서 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### 4. 서비스 확인
- 웹 인터페이스: http://localhost (또는 서버 IP)
- 서버 API: http://localhost:3000
- 헬스체크: http://localhost/health

## 📁 프로젝트 구조

```
P-ID-Tag-Extractor/
├── client/                 # React 프론트엔드
│   ├── Dockerfile         # 클라이언트 Docker 설정
│   └── nginx.conf         # Nginx 설정
├── server/                 # Node.js 백엔드
│   └── Dockerfile         # 서버 Docker 설정
├── scripts/               # 유지보수 스크립트
│   ├── backup.sh          # 데이터베이스 백업
│   └── health-check.sh    # 시스템 상태 확인
├── docker-compose.yml     # Docker Compose 설정
├── .env.production        # 환경 설정 템플릿
└── README-DEPLOYMENT.md   # 이 파일
```

## ⚙️ 상세 설정

### 환경 변수 (.env 파일)

```bash
# 보안 설정 (필수 변경)
SESSION_SECRET=최소-32자-이상의-랜덤-문자열로-변경하세요

# 서버 설정
NODE_ENV=production
PORT=3000

# 파일 업로드 설정
MAX_FILE_SIZE=100MB

# CORS 설정 (도메인에 맞게 수정)
ALLOWED_ORIGINS=http://localhost,http://your-domain.com

# 백업 설정
BACKUP_RETENTION_DAYS=7
```

### 네트워크 설정

사내 네트워크에서 접근하려면:

1. **포트 개방**: 80 (HTTP), 3000 (API)
2. **방화벽 설정**: 사내 IP 대역에서만 접근 허용
3. **HTTPS 설정**: 프로덕션에서는 HTTPS 권장

### 데이터 지속성

Docker 볼륨을 통해 데이터가 지속됩니다:
- `pid-digitizer-data`: SQLite 데이터베이스
- `pid-digitizer-uploads`: 업로드된 PDF 파일
- `pid-digitizer-backups`: 자동 백업 파일

## 🔧 운영 및 유지보수

### 서비스 관리 명령어

```bash
# 모든 서비스 시작
docker-compose up -d

# 서비스 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f [service-name]

# 서비스 재시작
docker-compose restart [service-name]

# 서비스 중지
docker-compose down

# 완전 삭제 (데이터 포함)
docker-compose down -v
```

### 백업 관리

```bash
# 수동 백업 실행
docker exec pid-digitizer-backup /scripts/backup.sh

# 백업 파일 확인
docker volume ls
docker run --rm -v pid-digitizer-backups:/backups alpine ls -la /backups
```

### 헬스 체크

```bash
# 전체 시스템 상태 확인
./scripts/health-check.sh

# 서버만 확인
./scripts/health-check.sh server-only

# 클라이언트만 확인
./scripts/health-check.sh client-only
```

### 로그 모니터링

```bash
# 실시간 로그 확인
docker-compose logs -f

# 서버 로그만 확인
docker-compose logs -f pid-server

# 에러 로그 필터링
docker-compose logs | grep ERROR
```

## 🔒 보안 설정

### 필수 보안 조치

1. **SESSION_SECRET 변경**: 기본값에서 변경 필수
2. **방화벽 설정**: 필요한 포트만 개방
3. **정기 업데이트**: Docker 이미지 및 시스템 업데이트
4. **백업 암호화**: 중요 데이터의 경우 암호화 백업 고려

### 네트워크 보안

```bash
# 사내 IP 대역만 허용 (iptables 예시)
iptables -A INPUT -p tcp --dport 80 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 3000 -s 192.168.1.0/24 -j ACCEPT
```

## 📊 모니터링

### 시스템 리소스 모니터링

```bash
# 컨테이너 리소스 사용량 확인
docker stats

# 디스크 사용량 확인
df -h

# 메모리 사용량 확인
free -h
```

### 애플리케이션 모니터링

- **헬스체크 엔드포인트**: `/health`
- **API 상태 확인**: `/api/test`
- **데이터베이스 상태**: SQLite 파일 크기 및 접근성

## 🆘 문제 해결

### 일반적인 문제

#### 1. 컨테이너가 시작되지 않음
```bash
# 로그 확인
docker-compose logs [service-name]

# 컨테이너 상태 확인
docker-compose ps
```

#### 2. 데이터베이스 연결 오류
```bash
# 데이터베이스 파일 확인
docker exec -it pid-digitizer-server ls -la /app/data/

# 권한 확인
docker exec -it pid-digitizer-server chown -R appuser:nodejs /app/data
```

#### 3. 파일 업로드 오류
```bash
# 업로드 디렉토리 확인
docker exec -it pid-digitizer-server ls -la /app/uploads/

# 디스크 공간 확인
df -h
```

#### 4. 메모리 부족
```bash
# 메모리 사용량 확인
docker stats

# Node.js 메모리 제한 증가
# docker-compose.yml에서 환경 변수 추가:
# NODE_OPTIONS=--max-old-space-size=4096
```

### 로그 파일 위치

- 애플리케이션 로그: 컨테이너 내 `/app/logs/`
- Docker 로그: `docker-compose logs`
- 시스템 로그: `/var/log/`

## 🔄 업데이트

### 애플리케이션 업데이트

```bash
# 최신 코드 가져오기
git pull

# 서비스 중지
docker-compose down

# 이미지 다시 빌드
docker-compose build

# 서비스 시작
docker-compose up -d
```

### 데이터베이스 마이그레이션

새 버전으로 업데이트 전에는 반드시 백업을 수행하세요:

```bash
# 백업 생성
./scripts/backup.sh

# 업데이트 진행
docker-compose down
docker-compose build
docker-compose up -d
```

## 📞 지원

문제가 발생할 경우:

1. **로그 확인**: `docker-compose logs -f`
2. **헬스체크 실행**: `./scripts/health-check.sh`
3. **백업 상태 확인**: 데이터 안전성 확인
4. **시스템 리소스 확인**: CPU, 메모리, 디스크 사용량

---

## 🎯 성능 최적화 팁

### 1. 리소스 할당
- CPU 집약적 작업이 많은 경우 CPU 코어 수 증가
- 대용량 PDF 처리 시 메모리 증가

### 2. 네트워크 최적화
- 사내 네트워크에서는 CDN 불필요
- 정적 파일 캐싱 활용

### 3. 데이터베이스 최적화
- 정기적인 VACUUM 실행으로 데이터베이스 최적화
- 인덱스 관리

이 가이드를 따라 안정적이고 확장 가능한 P&ID Smart Digitizer 시스템을 운영하실 수 있습니다.