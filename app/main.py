from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from . import database

app = FastAPI(title="BGM API")

@app.get("/")
async def root():
    return {"message": "BGM API is running!"}

@app.get("/health")
async def health_check(db: AsyncSession = Depends(database.get_db)):
    try:
        # DB 연결 테스트
        result = await db.execute(text("SELECT 1"))
        is_connected = result.scalar() == 1
        return {"status": "ok", "db_connected": is_connected}
    except Exception as e:
        return {"status": "error", "message": str(e)}