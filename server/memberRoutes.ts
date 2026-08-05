import type { Express, Request } from "express";
import { z } from "zod";
import { getSessionEmail } from "./_core/context";
import { getCollectorSummary, getOverview, importMembers, recordEvent, touchMember, updateMember, type MemberSource } from "./memberStore";

const sources = ["direct", "wix", "skool", "richark", "csv", "nextos"] as const;
const sourceSchema = z.enum(sources);

function sessionEmail(req: Request) {
  return getSessionEmail(req.headers.cookie);
}

function isAdmin(email: string | null) {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && admins.includes(email.toLowerCase()));
}

function collectorAuthorized(req: Request) {
  const secret = process.env.COLLECTOR_SECRET;
  return Boolean(secret && req.headers.authorization === `Bearer ${secret}`);
}

const memberInput = z.object({
  email: z.string().email(), name: z.string().max(100).optional(), phone: z.string().max(40).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(), externalId: z.string().max(200).optional(),
});

export function registerMemberRoutes(app: Express) {
  app.get("/api/member/me", async (req, res) => {
    const email = sessionEmail(req);
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const member = await touchMember(email);
    res.json({ member, isAdmin: isAdmin(email) });
  });

  app.patch("/api/member/me", async (req, res) => {
    const email = sessionEmail(req);
    if (!email) return res.status(401).json({ error: "Unauthorized" });
    const input = z.object({ name: z.string().min(1).max(100), phone: z.string().max(40).optional() }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid profile" });
    await touchMember(email);
    res.json({ member: await updateMember(email, input.data) });
  });

  app.get("/api/member/content", (req, res) => {
    if (!sessionEmail(req)) return res.status(401).json({ error: "Unauthorized" });
    res.json({
      announcements: [{ id: "welcome", title: "歡迎來到學員專屬空間", body: "從財務導航工具開始，逐步整理你想要的生活。", publishedAt: "2026-08-04" }],
      resources: [
        { id: "life-stage", title: "人生六大階段花費規劃", description: "看見每個人生階段所需的生活底氣", href: "/life-stage", status: "available" },
        { id: "lifestyle", title: "五種生活型態開支操練", description: "從節約到富有，描繪不同生活版本", href: "/lifestyle", status: "available" },
        { id: "net-worth", title: "個人淨值追蹤", description: "整理資產與負債，持續看見累積", href: "/net-worth", status: "available" },
      ],
    });
  });

  app.get("/api/admin/overview", async (req, res) => {
    const email = sessionEmail(req);
    if (!isAdmin(email)) return res.status(403).json({ error: "Forbidden" });
    res.json(await getOverview());
  });

  app.post("/api/admin/import", async (req, res) => {
    const email = sessionEmail(req);
    if (!isAdmin(email)) return res.status(403).json({ error: "Forbidden" });
    const input = z.object({ source: sourceSchema, members: z.array(memberInput).min(1).max(5000) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid import data", details: input.error.flatten() });
    res.json(await importMembers(input.data.source, input.data.members));
  });

  app.post("/api/collector/events", async (req, res) => {
    if (!collectorAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    const input = z.object({ version: z.literal("1.0"), type: z.string().min(1).max(100), source: sourceSchema, occurredAt: z.string().datetime(), memberEmail: z.string().email().optional(), externalId: z.string().max(200).optional(), payload: z.record(z.string(), z.unknown()).default({}) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid event", details: input.error.flatten() });
    if (input.data.memberEmail) await importMembers(input.data.source, [{ email: input.data.memberEmail, externalId: input.data.externalId }]);
    res.status(202).json({ accepted: true, event: await recordEvent(input.data) });
  });

  app.get("/api/collector/overview", async (req, res) => {
    if (!collectorAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    res.json(await getCollectorSummary());
  });

  app.post("/api/collector/webhooks/:source", async (req, res) => {
    if (!collectorAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    const source = sourceSchema.safeParse(req.params.source);
    const members = z.array(memberInput).min(1).max(5000).safeParse(req.body?.members ?? [req.body]);
    if (!source.success || !members.success) return res.status(400).json({ error: "Invalid webhook payload" });
    res.status(202).json({ accepted: true, ...(await importMembers(source.data as MemberSource, members.data)) });
  });
}
