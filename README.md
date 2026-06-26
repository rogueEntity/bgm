# BGM (Board Game Manager) 🎲

보드게임 스코어 트래킹 및 전적 관리 웹 서비스입니다.

마작, 티츄, 야찌 다이스 등 게임마다 다른 점수 산정 방식을 유연하게 기록하고, 대국 기록과 통계를 관리하는 것을 목표로 합니다.

현재는 리치마작 기록 기능을 중심으로 개발 중입니다.

## 🛠 Tech Stack

- **Framework:** Next.js
- **Frontend:** React, Tailwind CSS
- **Backend:** Next.js Server Actions / Server Components
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Auth.js
- **Infra:** Docker, Portainer, Home Lab

## 📁 Project Structure

```txt
bgm/
├─ web/                  # Next.js 웹 애플리케이션
│  ├─ prisma/            # Prisma schema / migrations
│  ├─ src/               # App Router 기반 소스 코드
│  ├─ Dockerfile         # 웹 서비스 Dockerfile
│  ├─ .dockerignore
│  ├─ .env               # 로컬 개발용 환경변수, Git 제외
│  └─ package.json
│
├─ docker-compose.yml    # 운영 웹 서비스 배포용 compose
├─ README.md
└─ LICENSE
```

## 🚀 Local Development

### 1. 의존성 설치

```bash
cd web
npm install
```

CI/운영 환경과 동일한 방식으로 설치하려면 아래 명령을 사용할 수 있습니다.

```bash
cd web
npm ci
```

### 2. 환경변수 설정

`web/.env` 파일을 생성하고 아래 값을 설정합니다.

```env
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/bgm

# Auth.js
AUTH_SECRET=

# Google OAuth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Kakao OAuth
AUTH_KAKAO_ID=
AUTH_KAKAO_SECRET=
```

`AUTH_SECRET`은 아래 명령으로 생성할 수 있습니다.

```bash
openssl rand -base64 32
```

### 3. Prisma Client 생성

```bash
cd web
npx prisma generate
```

### 4. 개발 서버 실행

```bash
cd web
npm run dev
```

실행 후 아래 주소로 접속합니다.

```txt
http://localhost:3000
```

## 🗄 Database / Prisma

### Prisma Client 생성

`schema.prisma`를 기준으로 Prisma Client를 생성합니다.

```bash
cd web
npx prisma generate
```

### 개발 환경에서 마이그레이션 생성 및 적용

개발 중 DB 스키마를 변경할 때 사용합니다.

```bash
cd web
npx prisma migrate dev
```

### 운영 환경에서 마이그레이션 적용

운영 DB에는 개발용 `migrate dev` 대신 아래 명령을 사용합니다.

```bash
cd web
npx prisma migrate deploy
```

Docker 컨테이너로 배포된 운영 환경에서는 웹 컨테이너 안에서 실행합니다.

```bash
docker exec -it bgm-web npx prisma migrate deploy
```

## 🐳 Docker Deployment

운영 배포는 `docker-compose.yml`을 사용합니다.

현재 DB는 별도 컨테이너/스택으로 운영하고, 이 compose는 Next.js 웹 서비스만 실행합니다.

### 1. Docker Compose 구성

루트의 `docker-compose.yml` 예시는 아래와 같습니다.

```yml
services:
  bgm-web:
    build:
      context: ./web
      dockerfile: Dockerfile
    container_name: bgm-web
    restart: unless-stopped

    environment:
      NODE_ENV: production
      TZ: Asia/Seoul

      DATABASE_URL: ${BGM_DATABASE_URL}

      AUTH_SECRET: ${BGM_AUTH_SECRET}
      AUTH_URL: ${BGM_AUTH_URL}
      AUTH_TRUST_HOST: ${BGM_AUTH_TRUST_HOST}

      AUTH_GOOGLE_ID: ${BGM_AUTH_GOOGLE_ID}
      AUTH_GOOGLE_SECRET: ${BGM_AUTH_GOOGLE_SECRET}

      AUTH_KAKAO_ID: ${BGM_AUTH_KAKAO_ID}
      AUTH_KAKAO_SECRET: ${BGM_AUTH_KAKAO_SECRET}

    extra_hosts:
      - "host.docker.internal:host-gateway"

    ports:
      - "${BGM_PORT}:3000"
```

### 2. 운영 환경변수

Portainer Stack 또는 서버의 compose 환경변수에 아래 값을 설정합니다.

```env
BGM_PORT=3000

BGM_DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:DB_PORT/bgm

BGM_AUTH_SECRET=
BGM_AUTH_URL=https://YOUR_DOMAIN
BGM_AUTH_TRUST_HOST=true

BGM_AUTH_GOOGLE_ID=
BGM_AUTH_GOOGLE_SECRET=

BGM_AUTH_KAKAO_ID=
BGM_AUTH_KAKAO_SECRET=
```

DB 컨테이너가 호스트에서 `5501:5432`로 열려 있다면 `BGM_DATABASE_URL`은 아래처럼 설정합니다.

```env
BGM_DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5501/bgm
```

### 3. Docker 이미지 빌드 및 실행

```bash
docker compose build
docker compose up -d
```

로그 확인:

```bash
docker logs -f bgm-web
```

### 4. Prisma 마이그레이션 적용

웹 컨테이너 기동 후 운영 DB에 마이그레이션을 적용합니다.

```bash
docker exec -it bgm-web npx prisma migrate deploy
```

### 5. Nginx Proxy Manager 연결

Nginx Proxy Manager에서는 웹 컨테이너가 공개한 호스트 포트로 연결합니다.

```txt
Scheme: http
Forward Hostname / IP: 홈서버 내부 IP
Forward Port: BGM_PORT
Websockets Support: ON
Block Common Exploits: ON
SSL: Let's Encrypt
Force SSL: ON
```

예를 들어 `BGM_PORT=3000`이고 홈서버 내부 IP가 `192.168.0.10`이면:

```txt
Forward Hostname / IP: 192.168.0.10
Forward Port: 3000
```

## 🔐 OAuth Redirect URI

운영 도메인을 사용하는 경우 Google/Kakao 개발자 콘솔에 Redirect URI를 등록해야 합니다.

### Google

```txt
http://localhost:3000/api/auth/callback/google
https://YOUR_DOMAIN/api/auth/callback/google
```

### Kakao

```txt
http://localhost:3000/api/auth/callback/kakao
https://YOUR_DOMAIN/api/auth/callback/kakao
```

예를 들어 운영 도메인이 `https://bgm.example.com`이면:

```txt
https://bgm.example.com/api/auth/callback/google
https://bgm.example.com/api/auth/callback/kakao
```

## ✅ Current Main Features

- 소셜 로그인
- 사용자 온보딩
- 내 정보 수정
- 리치마작 대국 생성
- 참가자 등록
- 대국 진행
- 화료 / 유국 기록
- 점수 변동 기록
- 대국 종료
- 대국 기록 조회
- 대국 상세 조회
- 관리자 공지 관리

## 🧭 Roadmap

- 마작 랭킹
- 작사별 통계
- 도전과제
- 라이벌 전적
- 최근 소식 / 활동 타임라인
- 티츄 기록 기능
- 야찌 다이스 기록 기능
- 고도화된 통계 대시보드

## 📌 Notes

이전 FastAPI 기반 백엔드 구조는 제거되었습니다.

현재 백엔드 로직은 Next.js의 Server Actions, Server Components, Prisma를 중심으로 구성되어 있습니다.

```txt
Browser
→ Next.js
→ Prisma
→ PostgreSQL
```

로컬 개발용 환경변수는 `web/.env`를 사용합니다.

운영 배포에서는 `web/.env` 파일을 Docker 이미지에 포함하지 않고, Portainer Stack 또는 Docker Compose 환경변수로 주입합니다.

## License

This project is licensed under the terms of the LICENSE file.