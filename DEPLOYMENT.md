# 🚀 배포 가이드

## 목차
- [프로덕션 배포 준비](#프로덕션-배포-준비)
- [Vercel 배포](#vercel-배포)
- [자체 서버 배포](#자체-서버-배포)
- [Docker 배포](#docker-배포)
- [환경 변수 설정](#환경-변수-설정)
- [성능 최적화](#성능-최적화)
- [모니터링](#모니터링)

---

## 프로덕션 배포 준비

### 1. 프로덕션 빌드 테스트
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 브라우저에서 확인
# http://localhost:3000
```

### 2. 체크리스트
- [ ] 환경 변수 설정 완료
- [ ] face-api.js 모델 파일 포함
- [ ] 백엔드 API URL 프로덕션으로 변경
- [ ] HTTPS 설정 (프로덕션)
- [ ] CORS 설정 확인
- [ ] 에러 핸들링 점검
- [ ] 로그 레벨 조정 (콘솔 로그 제거/최소화)

### 3. 최적화 확인
```bash
# 번들 크기 분석
npm install -D @next/bundle-analyzer

# next.config.mjs 수정
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // ...existing config
})

# 분석 실행
ANALYZE=true npm run build
```

---

## Vercel 배포

### 1. Vercel CLI 설치
```bash
npm install -g vercel
```

### 2. 배포 실행
```bash
# 로그인
vercel login

# 프로젝트 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 3. 환경 변수 설정 (Vercel Dashboard)
```
Dashboard → Settings → Environment Variables

NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

### 4. 도메인 설정
```
Dashboard → Settings → Domains
→ Add Domain
```

### 5. 빌드 설정
```
Dashboard → Settings → General

Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node Version: 18.x
```

---

## 자체 서버 배포

### 1. PM2를 사용한 배포

#### 설치
```bash
npm install -g pm2
```

#### 시작
```bash
# 빌드
npm run build

# PM2로 시작
pm2 start npm --name "real-kiosk" -- start

# 상태 확인
pm2 status

# 로그 확인
pm2 logs real-kiosk

# 재시작
pm2 restart real-kiosk

# 중지
pm2 stop real-kiosk

# 삭제
pm2 delete real-kiosk
```

#### 자동 시작 설정
```bash
# 부팅 시 자동 시작
pm2 startup

# 현재 프로세스 저장
pm2 save
```

### 2. Nginx 리버스 프록시 설정

#### Nginx 설치
```bash
sudo apt update
sudo apt install nginx
```

#### 설정 파일 생성
```bash
sudo nano /etc/nginx/sites-available/real-kiosk
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/real-kiosk /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 3. HTTPS 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 확인
sudo certbot renew --dry-run
```

---

## Docker 배포

### 1. Dockerfile 생성
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경 변수
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. .dockerignore 생성
```
node_modules
.next
.git
.gitignore
README.md
.env*.local
```

### 3. next.config.mjs 수정
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Docker 최적화
  // ...existing config
}

export default nextConfig
```

### 4. 빌드 및 실행
```bash
# 이미지 빌드
docker build -t real-kiosk .

# 컨테이너 실행
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-backend-api.com \
  real-kiosk

# 백그라운드 실행
docker run -d -p 3000:3000 \
  --name real-kiosk \
  -e NEXT_PUBLIC_API_URL=https://your-backend-api.com \
  --restart unless-stopped \
  real-kiosk
```

### 5. Docker Compose 사용
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://your-backend-api.com
    restart: unless-stopped
    depends_on:
      - backend

  backend:
    image: your-backend-image:latest
    ports:
      - "8090:8090"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
    restart: unless-stopped
```

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 로그 확인
docker-compose logs -f
```

---

## 환경 변수 설정

### 개발 환경 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8090
NODE_ENV=development
```

### 프로덕션 환경 (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 환경별 빌드
```bash
# 개발
npm run dev

# 프로덕션 빌드
NODE_ENV=production npm run build

# 프로덕션 실행
npm run start
```

---

## 성능 최적화

### 1. 이미지 최적화
```javascript
// next.config.mjs
export default {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
}
```

### 2. 코드 스플리팅
```javascript
// 동적 임포트
const SingleOptionModal = dynamic(() => import('@/components/SingleOptionModal'), {
  ssr: false,
  loading: () => <p>로딩 중...</p>
})
```

### 3. 캐싱 설정
```javascript
// next.config.mjs
export default {
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

### 4. 프로덕션 로그 제거
```javascript
// lib/logger.js
export const isDev = process.env.NODE_ENV !== 'production'

export function log(...args) {
  if (isDev) {
    console.log(...args)
  }
}

// 사용
import { log } from '@/lib/logger'
log('[Page] 디버그 정보')  // 프로덕션에서 출력 안 됨
```

---

## 모니터링

### 1. Sentry 통합 (에러 추적)
```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
})
```

### 2. Google Analytics
```javascript
// app/layout.js
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### 3. Health Check 엔드포인트
```javascript
// app/api/health/route.js
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

### 4. 로그 수집
```bash
# PM2 로그
pm2 logs real-kiosk --lines 100

# Docker 로그
docker logs -f real-kiosk

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 백업 및 복구

### 1. 데이터베이스 백업 (백엔드)
```bash
# MySQL
mysqldump -u user -p database_name > backup.sql

# PostgreSQL
pg_dump database_name > backup.sql
```

### 2. 애플리케이션 백업
```bash
# 코드 백업
git archive --format=tar.gz --output=backup-$(date +%Y%m%d).tar.gz HEAD

# 환경 변수 백업
cp .env.production .env.production.backup
```

### 3. 복구
```bash
# 데이터베이스 복구
mysql -u user -p database_name < backup.sql

# 애플리케이션 재배포
git pull origin main
npm install
npm run build
pm2 restart real-kiosk
```

---

## 트러블슈팅

### 빌드 실패
```bash
# 캐시 삭제
rm -rf .next node_modules
npm install
npm run build
```

### 메모리 부족
```bash
# Node.js 메모리 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### 포트 충돌
```bash
# 포트 사용 확인 (Linux/Mac)
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 포트 변경
PORT=3001 npm run start
```

---

## 보안 체크리스트

- [ ] HTTPS 사용
- [ ] 환경 변수로 민감 정보 관리
- [ ] CORS 설정 확인
- [ ] API 인증/권한 설정
- [ ] 정기적 의존성 업데이트 (`npm audit`)
- [ ] XSS/CSRF 방어
- [ ] 방화벽 설정
- [ ] 로그 보안 (민감 정보 제외)

---

## 유지보수

### 정기 점검 항목
- 매일: 로그 확인, 에러 모니터링
- 매주: 성능 지표 검토
- 매월: 보안 업데이트, 의존성 점검
- 분기별: 전체 시스템 감사

### 의존성 업데이트
```bash
# 보안 취약점 확인
npm audit

# 취약점 자동 수정
npm audit fix

# 의존성 업데이트
npm update

# 메이저 버전 업데이트 (주의)
npm install -g npm-check-updates
ncu -u
npm install
```

---

이 가이드를 따라 안전하고 효율적인 배포를 진행하세요!

