import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. 取得 Cookie 中的 token
    const cookies = opts.req.headers.cookie;
    if (cookies) {
      const match = cookies.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
      if (match) {
        const token = match[2];
        const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET || "default_unsafe_secret");
        
        // 2. 驗證 JWT
        const { payload } = await jwtVerify(token, jwtSecret);
        
        if (payload && payload.userId) {
          // 3. 從資料庫撈取使用者資料
          const db = await getDb();
          if (db) {
            const result = await db.select().from(users).where(eq(users.id, payload.userId as number)).limit(1);
            if (result.length > 0) {
              user = result[0];
            }
          }
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

