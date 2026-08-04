import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, ChevronRight, Crown, Loader2, LogOut, Megaphone, Settings, Sparkles, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";

type Member = { email: string; name: string; phone?: string; source: string; tags: string[]; joinedAt: string };
type Resource = { id: string; title: string; description: string; href: string; status: string };
type Content = { announcements: Array<{ id: string; title: string; body: string; publishedAt: string }>; resources: Resource[] };

export default function MemberCenter() {
  const { user, loading: authLoading, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login?next=/dashboard" });
  const [member, setMember] = useState<Member | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/member/me", { credentials: "include" }).then(response => response.json()),
      fetch("/api/member/content", { credentials: "include" }).then(response => response.json()),
    ]).then(([profile, memberContent]) => {
      setMember(profile.member);
      setIsAdmin(Boolean(profile.isAdmin));
      setName(profile.member?.name || "");
      setPhone(profile.member?.phone || "");
      setContent(memberContent);
    });
  }, [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/member/me", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
    if (response.ok) {
      const result = await response.json();
      setMember(result.member);
      setEditing(false);
    }
    setSaving(false);
  }

  if (authLoading || !member || !content) return <div className="min-h-screen grid place-items-center bg-[#fff9f6]"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div>;

  return (
    <main className="min-h-screen bg-[#fff9f6] text-stone-800">
      <header className="border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-amber-300 text-white"><Crown className="h-5 w-5" /></span>
            <span><strong className="block text-sm">有錢又好命學院</strong><span className="text-xs text-stone-400">學員專屬空間</span></span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && <Link href="/admin"><Button variant="outline" size="sm"><Settings /> 店家後台</Button></Link>}
            <Button variant="ghost" size="sm" onClick={() => logout().then(() => window.location.assign("/login"))}><LogOut /> 登出</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-9">
        <section className="mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-rose-500 via-rose-400 to-amber-300 p-7 text-white shadow-xl shadow-rose-200/60 md:p-10">
          <div className="flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-white/85"><Sparkles className="h-4 w-4" /> 今天也一起往理想生活靠近</p><h1 className="text-3xl font-bold md:text-4xl">嗨，{member.name}</h1><p className="mt-3 max-w-xl leading-7 text-white/85">你的每一次整理，都是在為未來累積更多選擇與安心。</p></div>
            <button onClick={() => setEditing(true)} className="flex min-w-56 items-center gap-3 rounded-2xl bg-white/18 p-4 text-left backdrop-blur hover:bg-white/25"><span className="grid h-11 w-11 place-items-center rounded-full bg-white/25"><UserRound /></span><span><span className="block text-sm font-semibold">個人資料</span><span className="block max-w-36 truncate text-xs text-white/75">{member.email}</span></span><ChevronRight className="ml-auto h-4 w-4" /></button>
          </div>
        </section>

        {editing && <Card className="mb-8 border-rose-100"><CardContent className="p-6"><form onSubmit={saveProfile} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"><label className="text-sm font-medium">姓名<Input className="mt-2" value={name} onChange={event => setName(event.target.value)} required /></label><label className="text-sm font-medium">手機（選填）<Input className="mt-2" value={phone} onChange={event => setPhone(event.target.value)} /></label><div className="flex items-end gap-2"><Button type="submit" disabled={saving}>{saving ? "儲存中" : "儲存"}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>取消</Button></div></form></CardContent></Card>}

        <section className="mb-9"><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-rose-500" /><h2 className="text-xl font-bold">學院公告</h2></div>{content.announcements.map(item => <div key={item.id} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><Badge className="mb-3 bg-rose-100 text-rose-700">最新公告</Badge><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-stone-500">{item.body}</p></div>)}</section>

        <section><div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-rose-500" /><h2 className="text-xl font-bold">我的學習工具</h2></div><div className="grid gap-5 md:grid-cols-3">{content.resources.map((resource, index) => <Link key={resource.id} href={resource.href}><Card className="h-full border-rose-100 bg-white transition hover:-translate-y-1 hover:shadow-lg"><CardContent className="p-6"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-amber-100 font-bold text-rose-600">0{index + 1}</div><h3 className="font-bold">{resource.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{resource.description}</p><span className="mt-5 flex items-center text-sm font-semibold text-rose-500">開始使用 <ChevronRight className="h-4 w-4" /></span></CardContent></Card></Link>)}</div></section>
      </div>
    </main>
  );
}
