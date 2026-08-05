import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { parse } from "cookie";
import { jwtVerify } from "jose";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";

export function createEmailSessionToken(email: string, secret: string) {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function getSessionEmail(cookieHeader: string | undefined) {
  const secret = process.env.SESSION_SECRET;
  const token = parse(cookieHeader ?? "").eps_session;
  if (!secret || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function learnerFromEmail(email: string): User {
  const id = parseInt(createHash("sha256").update(email).digest("hex").slice(0, 7), 16);
  return {
    id,
    openId: `email:${email}`,
    name: email.split("@")[0] || "學員",
    email,
    loginMethod: "email-code",
    role: "user",
    createdAt: new Date(0),
    updatedAt: new Date(0),
    lastSignedIn: new Date(),
  };
}


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
    // 1. 取得 Cookie 中的 token (TRPC/JWT login logic)
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

  // Fallback to legacy member session if TRPC JWT auth fails
  const sessionEmail = getSessionEmail(opts.req.headers.cookie);
  if (!user && sessionEmail) {
    user = learnerFromEmail(sessionEmail);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

