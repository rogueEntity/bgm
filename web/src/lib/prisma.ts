// web/src/lib/prisma.ts
import 'server-only';
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 1. pg Pool 생성
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// 2. Prisma 어댑터 생성
const adapter = new PrismaPg(pool);

// 3. 어댑터를 반드시 주입하여 클라이언트 생성
export const db = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}