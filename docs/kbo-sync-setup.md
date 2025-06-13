# KBO 데이터 자동 동기화 설정 가이드

## 개요

이 가이드는 KBO API에서 매일 경기 데이터를 자동으로 가져와서 데이터베이스를 업데이트하는 방법을 설명합니다.

## 1. 수동 동기화

### API 직접 호출

```bash
curl -X POST "http://localhost:3001/api/kbo/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ballgenius-sync-2024-secret" \
  -d '{"date": "20240613"}'
```

### npm 스크립트 사용

```bash
# 오늘 날짜 동기화
npm run sync:kbo

# 특정 날짜 동기화
npm run sync:kbo 20240613
```

### 동기화 상태 확인

```bash
curl "http://localhost:3001/api/kbo/sync"
```

## 2. 자동 동기화 (크론탭)

### 크론탭 설정

```bash
# 크론탭 편집
crontab -e

# 매일 오전 9시에 실행
0 9 * * * cd /Users/jeonbyeongmin/project/ballgenius && npm run sync:kbo >> /var/log/kbo-sync.log 2>&1

# 매일 오전 9시와 오후 6시에 실행 (경기 시작 전 업데이트)
0 9,18 * * * cd /Users/jeonbyeongmin/project/ballgenius && npm run sync:kbo >> /var/log/kbo-sync.log 2>&1
```

### 로그 확인

```bash
# 동기화 로그 확인
tail -f /var/log/kbo-sync.log

# 최근 로그 확인
tail -20 /var/log/kbo-sync.log
```

## 3. 시스템 서비스 (선택사항)

### systemd 서비스 생성 (Linux)

```bash
sudo nano /etc/systemd/system/kbo-sync.service
```

```ini
[Unit]
Description=KBO Data Sync Service
After=network.target

[Service]
Type=oneshot
WorkingDirectory=/Users/jeonbyeongmin/project/ballgenius
ExecStart=/usr/bin/npm run sync:kbo
User=jeonbyeongmin
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### systemd 타이머 생성

```bash
sudo nano /etc/systemd/system/kbo-sync.timer
```

```ini
[Unit]
Description=Run KBO sync daily
Requires=kbo-sync.service

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

### 서비스 활성화

```bash
sudo systemctl enable kbo-sync.timer
sudo systemctl start kbo-sync.timer
sudo systemctl status kbo-sync.timer
```

## 4. Docker 환경에서의 설정

### Docker Compose에 크론 서비스 추가

```yaml
version: "3.8"
services:
  app:
    # ... 기존 설정 ...

  kbo-sync:
    build: .
    command: sh -c "while true; do sleep 86400; npm run sync:kbo; done"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SYNC_API_KEY=${SYNC_API_KEY}
    depends_on:
      - app
```

## 5. 클라우드 환경에서의 설정

### Vercel Cron Jobs

```json
{
  "crons": [
    {
      "path": "/api/kbo/sync",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### AWS Lambda + EventBridge

1. Lambda 함수 생성
2. EventBridge 규칙 설정 (cron 표현식: `0 9 * * ? *`)
3. 함수에서 동기화 API 호출

## 6. 모니터링 및 알림

### 동기화 실패 시 알림 설정

```bash
# 스크립트에 Slack 알림 추가 예시
if [ $? -ne 0 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"KBO 데이터 동기화 실패!"}' \
    YOUR_SLACK_WEBHOOK_URL
fi
```

### 헬스체크 엔드포인트

```bash
# 동기화 상태 모니터링
curl "http://localhost:3001/api/kbo/sync" | jq '.lastSync'
```

## 7. 환경변수 설정

### .env 파일

```properties
# KBO API Sync
SYNC_API_KEY="ballgenius-sync-2024-secret"
NEXTAUTH_URL="http://localhost:3001"
```

### 프로덕션 환경

```bash
export SYNC_API_KEY="your-production-secret"
export NEXTAUTH_URL="https://your-domain.com"
```

## 8. 트러블슈팅

### 자주 발생하는 문제들

1. **인증 오류**

   - SYNC_API_KEY 확인
   - Authorization 헤더 형식 확인

2. **서버 연결 실패**

   - 서버가 실행 중인지 확인
   - 포트 번호 확인 (3000 vs 3001)

3. **권한 오류**

   - 스크립트 실행 권한 확인 (`chmod +x`)
   - 로그 파일 쓰기 권한 확인

4. **KBO API 응답 오류**
   - 네트워크 연결 확인
   - KBO API 서버 상태 확인

### 디버깅 명령어

```bash
# 수동으로 동기화 테스트
npm run sync:kbo

# 상세 로그와 함께 실행
DEBUG=1 npm run sync:kbo

# 특정 날짜로 테스트
npm run sync:kbo 20240601
```

## 9. 보안 고려사항

1. **API 키 보안**

   - 환경변수 사용
   - .env 파일을 .gitignore에 추가
   - 정기적인 키 순환

2. **네트워크 보안**

   - HTTPS 사용
   - 방화벽 설정
   - 접근 제한

3. **로그 보안**
   - 민감한 정보 로깅 방지
   - 로그 파일 권한 설정
   - 로그 순환 설정

이제 매일 자동으로 KBO 경기 데이터가 동기화됩니다! 🎯
