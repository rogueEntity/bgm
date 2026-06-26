BGM (Board Game Manager) 🎲

보드게임 스코어 트래킹 및 전적 관리 웹 서비스입니다.

마작, 티츄, 야찌 다이스 등 게임마다 다른 점수 산정 방식을 유연하게 기록하고, 대국 기록과 통계를 관리하는 것을 목표로 합니다.

현재는 리치마작 기록 기능을 중심으로 개발 중입니다.

🛠 Tech Stack

* Framework: Next.js
* Frontend: React, Tailwind CSS
* Backend: Next.js Server Actions / Server Components
* Database: PostgreSQL
* ORM: Prisma
* Auth: Auth.js
* Infra: Docker, Portainer, Home Lab

📁 Project Structure

bgm/
├─ web/                  # Next.js 웹 애플리케이션
│  ├─ prisma/            # Prisma schema / migrations
│  ├─ src/               # App Router 기반 소스 코드
│  ├─ Dockerfile         # 웹 서비스 Dockerfile
│  ├─ .dockerignore
│  ├─ .env               # 로컬 개발용 환경변수
│  └─ package.json
│
├─ docker-compose.yml    # 운영 웹 서비스 배포용 compose
├─ README.md
└─ LICENSE

🚀 Local Development

1. 의존성 설치

cd web
npm install

또는 CI/운영 환경과 동일하게 설치하려면:

cd web
npm ci

2. 환경변수 설정

web/.env 파일을 생성하고 아래 값을 설정합니다.

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

AUTH_SECRET은 아래 명령으로 생성할 수 있습니다.

openssl rand -base64 32

3. Prisma Client 생성

cd web
npx prisma generate

4. 개발 서버 실행

cd web
npm run dev

실행 후 아래 주소로 접속합니다.

http://localhost:3000

🗄 Database / Prisma

Prisma Client 생성

cd web
npx prisma generate

DB 스키마 반영

운영 또는 배포 환경에서는 아래 명령을 사용합니다.

cd web
npx prisma migrate deploy

개발 중 새로운 마이그레이션을 만들 때는 아래 명령을 사용합니다.

cd web
npx prisma migrate dev

🐳 Docker Deployment

운영 환경에서는 web/.env 파일을 이미지에 포함하지 않습니다.

대신 Portainer Stack 또는 Docker Compose 환경변수로 아래 값을 주입합니다.

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/bgm
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_KAKAO_ID=
AUTH_KAKAO_SECRET=

Docker Compose 실행 예시

docker compose up -d --build

Prisma migration 적용

웹 컨테이너 기동 후 운영 DB에 마이그레이션을 적용합니다.

docker exec -it bgm-web npx prisma migrate deploy

✅ Current Main Features

* 소셜 로그인
* 리치마작 대국 생성
* 참가자 등록
* 대국 진행
* 화료 / 유국 기록
* 점수 변동 기록
* 대국 종료
* 대국 기록 조회
* 대국 상세 조회
* 관리자 공지 관리

🧭 Roadmap

* 마작 랭킹
* 작사별 통계
* 도전과제
* 라이벌 전적
* 최근 소식 / 활동 타임라인
* 티츄 기록 기능
* 야찌 다이스 기록 기능
* 고도화된 통계 대시보드

📌 Notes

이전 FastAPI 기반 백엔드 구조는 제거되었습니다.

현재 백엔드 로직은 Next.js의 Server Actions, Server Components, Prisma를 중심으로 구성되어 있습니다.

Browser
→ Next.js
→ Prisma
→ PostgreSQL

License

This project is licensed under the terms of the LICENSE file.