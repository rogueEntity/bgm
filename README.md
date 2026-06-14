# BGM (Board Game Manager) 🎲

보드게임 스코어 트래킹 및 전적 관리 웹 서비스입니다. 
마작, 티츄, 야찌 다이스 등 게임마다 다른 점수 산정 방식을 유연하게 기록하고 통계를 냅니다.

## 🛠 Tech Stack
* **Backend:** Python, FastAPI, SQLAlchemy
* **Database:** PostgreSQL (JSONB 활용)
* **Frontend:** Next.js, Tailwind CSS (예정)
* **Auth:** Auth.js (OAuth2 - Discord, Kakao) (예정)
* **Infra:** Docker (Home Lab)

## 🚀 How to Run (Local Development)

### 1. Database Setting
본 프로젝트는 PostgreSQL이 필요합니다. `.env` 파일을 프로젝트 루트에 생성하고 아래와 같이 데이터베이스 접속 정보를 입력하세요.

```env
DATABASE_URL=postgresql+asyncpg://[user]:[password]@[host]:[port]/bgm
```
### 2.Backend Installation
```bash
# 가상환경 세팅 및 패키지 설치
pip install -r requirements.txt

# FastAPI 서버 실행
uvicorn app.main:app --reload
```
서버 구동 후 http://localhost:8000/docs에 접속하여 API 명세서를 확인할 수 있습니다.

### 3. Prisma
```bash
# 데이터베이스에 이미 존재하는 테이블 구조를 읽어와 schema.prisma 파일에 구성
npx prisma db pull --config ./prisma/schema.prisma.ts

# schema.prisma를 바탕으로, 실제 프로젝트 코드에서 사용할 수 있는 Prisma Client(타입 정의 포함)를 생성
npx prisma generate
```