import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, DatabaseZap, Loader2, RefreshCw, Upload, UsersRound, Webhook } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { Link } from "wouter";

type Member = { id: string; email: string; name: string; phone?: string; source: string; tags: string[]; status: string; joinedAt: string; lastSeenAt?: string };
type Overview = { totals: { members: number; active: number; todayEvents: number; sources: number }; members: Member[]; events: Array<{ id: string; type: string; source: string; occurredAt: string; memberEmail?: string }> };

const sources = [
  { key: "wix", name: "Wix 官網", detail: "會員與表單名單" },
  { key: "skool", name: "Skool 社群", detail: "社群學員名單" },
  { key: "richark", name: "課程報名網站", detail: "報名與購課名單" },
  { key: "nextos", name: "NextOS", detail: "營運事件同步" },
];

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = (lines.shift() || "").split(",").map(value => value.trim().toLowerCase());
  return lines.map(line => {
    const values = line.split(",").map(value => value.trim().replace(/^"|"$/g, ""));
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    return { email: row.email || row["電子郵件"], name: row.name || row["姓名"], phone: row.phone || row["手機"], tags: row.tags ? row.tags.split("|") : undefined };
  }).filter(row => row.email);
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [source, setSource] = useState("csv");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/overview", { credentials: "include" });
    if (response.status === 403) return setForbidden(true);
    if (response.ok) setOverview(await response.json());
  }
  useEffect(() => { load(); }, []);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const members = parseCsv(await file.text());
    const response = await fetch("/api/admin/import", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, members }) });
    if (response.ok) { const result = await response.json(); setMessage(`匯入完成：新增 ${result.created} 位、更新 ${result.updated} 位`); await load(); }
    else setMessage("匯入失敗，請確認 CSV 至少包含 email 欄位。");
    event.target.value = "";
  }

  if (forbidden) return <div className="min-h-screen grid place-items-center bg-[#fff9f6] p-6 text-center"><div><h1 className="text-2xl font-bold">沒有店家管理權限</h1><p className="mt-2 text-stone-500">請使用管理者 Email 登入。</p><Link href="/dashboard"><Button className="mt-5">返回會員中心</Button></Link></div></div>;
  if (!overview) return <div className="min-h-screen grid place-items-center bg-[#fff9f6]"><Loader2 className="animate-spin text-rose-500" /></div>;

  return <main className="min-h-screen bg-stone-50 p-5 text-stone-800 md:p-8"><div className="mx-auto max-w-7xl">
    <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><Link href="/dashboard" className="mb-3 flex items-center gap-1 text-sm text-stone-500"><ArrowLeft className="h-4 w-4" /> 返回會員中心</Link><h1 className="text-3xl font-bold">塔塔老師・店家管理後台</h1><p className="mt-2 text-stone-500">會員、內容來源與 Collector 狀態總覽</p></div><Button variant="outline" onClick={load}><RefreshCw /> 更新資料</Button></header>
    <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
      ["會員總數", overview.totals.members, UsersRound], ["有效會員", overview.totals.active, UsersRound], ["今日事件", overview.totals.todayEvents, Webhook], ["會員來源", overview.totals.sources, DatabaseZap],
    ].map(([label, value, Icon]: any) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div><Icon className="h-8 w-8 text-rose-400" /></CardContent></Card>)}</section>
    <section className="mb-7 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><Card><CardHeader><CardTitle>最近會員</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-stone-400"><tr><th className="pb-3">會員</th><th className="pb-3">來源</th><th className="pb-3">標籤</th><th className="pb-3">狀態</th></tr></thead><tbody>{overview.members.slice(0,12).map(member => <tr key={member.id} className="border-b last:border-0"><td className="py-4"><strong className="block">{member.name}</strong><span className="text-xs text-stone-400">{member.email}</span></td><td>{member.source}</td><td>{member.tags.join("、")}</td><td><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">{member.status}</span></td></tr>)}</tbody></table>{!overview.members.length && <p className="py-10 text-center text-stone-400">尚無會員資料</p>}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>匯入外部名單</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm leading-6 text-stone-500">CSV 第一列請使用 email、name、phone、tags；tags 以「|」分隔。</p><label className="text-sm font-medium">名單來源<select className="mt-2 h-10 w-full rounded-md border bg-white px-3" value={source} onChange={event => setSource(event.target.value)}><option value="csv">一般 CSV</option><option value="wix">Wix</option><option value="skool">Skool</option><option value="richark">報名網站</option><option value="nextos">NextOS</option></select></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rose-200 p-8 text-sm font-semibold text-rose-500 hover:bg-rose-50"><Upload className="h-5 w-5" /> 選擇 CSV 檔案<Input type="file" accept=".csv,text/csv" className="hidden" onChange={importFile} /></label>{message && <p className="rounded-lg bg-stone-100 p-3 text-sm">{message}</p>}</CardContent></Card></section>
    <section><h2 className="mb-4 text-xl font-bold">串接來源</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{sources.map(item => <Card key={item.key}><CardContent className="p-5"><div className="mb-4 flex items-center justify-between"><Webhook className="text-rose-400" /><span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">Collector 就緒</span></div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-stone-500">{item.detail}</p></CardContent></Card>)}</div></section>
  </div></main>;
}
