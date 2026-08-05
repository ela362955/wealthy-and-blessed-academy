import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createHash, randomInt } from "crypto";
import net from "net";
import { Resend } from "resend";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext, createEmailSessionToken } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerMemberRoutes } from "../memberRoutes";
import { importMembers, recordEvent } from "../memberStore";

const emailCodes = new Map<string, { hash: string; expiresAt: number; attempts: number }>();
const normalizeEmail = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "";
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashCode = (email: string, code: string) => createHash("sha256").update(`${email}:${code}`).digest("hex");

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerMemberRoutes(app);

  // Allow embedding from Nexus OS (iframe)
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (origin.includes('nexus-os.uk') || origin.includes('nexus-os.zeabur.app') || origin.includes('localhost')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.nexus-os.uk https://*.zeabur.app");
    next();
  });

  // SSO endpoint: Nexus OS passes email, we auto-login without OTP
  app.get("/api/auth/sso", async (req, res) => {
    const email = normalizeEmail(req.query?.sso_email as string);
    const source = req.query?.sso_source as string;
    const secret = process.env.SESSION_SECRET;
    if (!validEmail(email) || source !== 'nexus' || !secret) {
      res.redirect('/');
      return;
    }
    res.cookie("eps_session", createEmailSessionToken(email, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",  // Required for cross-site iframe
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    await importMembers("direct", [{ email }]);
    await recordEvent({ version: "1.0", type: "member.login", source: "nexus_sso", occurredAt: new Date().toISOString(), memberEmail: email, payload: {} });
    res.redirect('/');
  });


  app.post("/api/auth/email/request", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const apiKey = process.env.RESEND_API_KEY;
    if (!validEmail(email) || !apiKey) {
      res.status(apiKey ? 400 : 503).json({ error: "Unable to send verification code" });
      return;
    }
    const code = randomInt(100000, 1000000).toString();
    emailCodes.set(email, { hash: hashCode(email, code), expiresAt: Date.now() + 10 * 60 * 1000, attempts: 0 });
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || "有錢又好命學院 <onboarding@resend.dev>",
      to: email,
      subject: "【有錢又好命學院】登入驗證碼",
      html: `<p>您的登入驗證碼是：</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p><p>驗證碼將於 10 分鐘後失效。</p>`,
    });
    if (result.error) {
      emailCodes.delete(email);
      res.status(502).json({ error: "Email delivery failed" });
      return;
    }
    res.json({ success: true });
  });

  app.post("/api/auth/email/verify", async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const record = emailCodes.get(email);
    if (!record || record.expiresAt < Date.now() || record.attempts >= 5 || record.hash !== hashCode(email, code)) {
      if (record) record.attempts += 1;
      res.status(401).json({ error: "Invalid or expired verification code" });
      return;
    }
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      res.status(503).json({ error: "Session service is not configured" });
      return;
    }
    emailCodes.delete(email);
    res.cookie("eps_session", createEmailSessionToken(email, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    await importMembers("direct", [{ email }]);
    await recordEvent({ version: "1.0", type: "member.login", source: "direct", occurredAt: new Date().toISOString(), memberEmail: email, payload: {} });
    res.json({ success: true });
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
