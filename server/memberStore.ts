import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type MemberSource = "direct" | "wix" | "skool" | "richark" | "csv" | "nextos";

export type Member = {
  id: string;
  email: string;
  name: string;
  phone?: string;
  source: MemberSource;
  tags: string[];
  status: "active" | "invited" | "paused";
  joinedAt: string;
  lastSeenAt?: string;
};

export type CollectorEvent = {
  id: string;
  version: "1.0";
  type: string;
  source: MemberSource;
  occurredAt: string;
  memberEmail?: string;
  externalId?: string;
  payload: Record<string, unknown>;
};

type StoreData = { members: Member[]; events: CollectorEvent[] };

const dataDirectory = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "tata-members.json");
let queue = Promise.resolve();

async function readStore(): Promise<StoreData> {
  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8")) as StoreData;
  } catch (error: any) {
    if (error?.code !== "ENOENT") console.error("[MemberStore] read failed", error);
    return { members: [], events: [] };
  }
}

async function writeStore(data: StoreData) {
  await fs.mkdir(dataDirectory, { recursive: true });
  const temporary = `${dataFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temporary, dataFile);
}

function mutate<T>(operation: (data: StoreData) => T | Promise<T>) {
  const result = queue.then(async () => {
    const data = await readStore();
    const value = await operation(data);
    await writeStore(data);
    return value;
  });
  queue = result.then(() => undefined, () => undefined);
  return result;
}

export async function getMember(email: string) {
  const data = await readStore();
  return data.members.find(member => member.email === email.toLowerCase()) ?? null;
}

export function touchMember(email: string, source: MemberSource = "direct") {
  return mutate(data => {
    const normalized = email.toLowerCase();
    let member = data.members.find(item => item.email === normalized);
    if (!member) {
      member = {
        id: randomUUID(), email: normalized, name: normalized.split("@")[0] || "學員",
        source, tags: ["學員"], status: "active", joinedAt: new Date().toISOString(),
      };
      data.members.push(member);
    }
    member.lastSeenAt = new Date().toISOString();
    return member;
  });
}

export function updateMember(email: string, updates: Pick<Member, "name" | "phone">) {
  return mutate(data => {
    const member = data.members.find(item => item.email === email.toLowerCase());
    if (!member) throw new Error("Member not found");
    member.name = updates.name.trim();
    member.phone = updates.phone?.trim() || undefined;
    return member;
  });
}

export async function getOverview() {
  const data = await readStore();
  const today = new Date().toISOString().slice(0, 10);
  return {
    totals: {
      members: data.members.length,
      active: data.members.filter(member => member.status === "active").length,
      todayEvents: data.events.filter(event => event.occurredAt.startsWith(today)).length,
      sources: new Set(data.members.map(member => member.source)).size,
    },
    members: data.members.slice().sort((a, b) => (b.lastSeenAt || b.joinedAt).localeCompare(a.lastSeenAt || a.joinedAt)),
    events: data.events.slice(-50).reverse(),
  };
}

export async function getCollectorSummary() {
  const data = await readStore();
  const today = new Date().toISOString().slice(0, 10);
  const bySource = data.members.reduce<Record<string, number>>((result, member) => {
    result[member.source] = (result[member.source] || 0) + 1;
    return result;
  }, {});
  const byEventType = data.events.reduce<Record<string, number>>((result, event) => {
    result[event.type] = (result[event.type] || 0) + 1;
    return result;
  }, {});
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      members: data.members.length,
      active: data.members.filter(member => member.status === "active").length,
      todayEvents: data.events.filter(event => event.occurredAt.startsWith(today)).length,
      sources: Object.keys(bySource).length,
    },
    bySource,
    byEventType,
  };
}

export function importMembers(source: MemberSource, incoming: Array<{ email: string; name?: string; phone?: string; tags?: string[]; externalId?: string }>) {
  return mutate(data => {
    let created = 0;
    let updated = 0;
    for (const row of incoming) {
      const email = row.email.trim().toLowerCase();
      let member = data.members.find(item => item.email === email);
      if (!member) {
        member = { id: randomUUID(), email, name: row.name?.trim() || email.split("@")[0], phone: row.phone?.trim(), source, tags: row.tags?.length ? row.tags : ["學員"], status: "active", joinedAt: new Date().toISOString() };
        data.members.push(member);
        created += 1;
      } else {
        if (row.name?.trim()) member.name = row.name.trim();
        if (row.phone?.trim()) member.phone = row.phone.trim();
        member.tags = Array.from(new Set([...member.tags, ...(row.tags || [])]));
        updated += 1;
      }
      data.events.push({ id: randomUUID(), version: "1.0", type: "member.upserted", source, occurredAt: new Date().toISOString(), memberEmail: email, externalId: row.externalId, payload: { imported: true } });
    }
    return { created, updated, total: incoming.length };
  });
}

export function recordEvent(event: Omit<CollectorEvent, "id">) {
  return mutate(data => {
    const saved = { ...event, id: randomUUID() };
    data.events.push(saved);
    if (data.events.length > 5000) data.events.splice(0, data.events.length - 5000);
    return saved;
  });
}
