import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { parse } from "cookie";
import { sdk } from "./sdk";

export function createEmailSessionToken(email: string, secret: string) {
  const payload = Buffer.from(email.toLowerCase()).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function getSessionEmail(cookieHeader: string | undefined) {
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
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

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
