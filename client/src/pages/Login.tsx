import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Step = "email" | "code";

function getNextPath() {
  const value = new URLSearchParams(window.location.search).get("next");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const nextPath = useMemo(getNextPath, []);

  useEffect(() => {
    if (user) window.location.replace(nextPath);
  }, [nextPath, user]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        setError(response.status === 503
          ? "寄信服務尚未完成設定，請聯絡學院協助。"
          : "驗證碼寄送失敗，請確認 Email 是否正確。");
        return;
      }
      setStep("code");
      setSent(true);
    } catch {
      setError("目前無法連線，請檢查網路後再試一次。");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), code }),
      });
      if (!response.ok) {
        setError("驗證碼不正確或已逾期，請重新確認後再試。");
        return;
      }
      window.location.replace(nextPath);
    } catch {
      setError("目前無法完成登入，請稍後再試一次。");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || user) {
    return <div className="min-h-screen grid place-items-center bg-[#fff8f5]"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div>;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f6] px-5 py-10 text-stone-800">
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-rose-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-amber-200/50 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden px-8 lg:block">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-4 py-2 text-sm font-medium text-rose-700 shadow-sm">
            <Sparkles className="h-4 w-4" /> 有錢又好命學院・學員專屬
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.15] tracking-tight text-stone-800">
            把人生的選擇，<br /><span className="text-rose-500">慢慢整理成底氣。</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
            登入你的專屬財務導航空間，保存每一次規劃、看見自己的累積，安心走向想要的生活。
          </p>
          <div className="mt-9 grid max-w-lg grid-cols-3 gap-3 text-sm text-stone-600">
            {["專屬學員空間", "資料安心保存", "無需記住密碼"].map(item => (
              <div key={item} className="rounded-2xl border border-white bg-white/65 px-3 py-4 text-center shadow-sm">{item}</div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/90 bg-white/90 p-6 shadow-[0_24px_80px_rgba(120,72,60,.14)] backdrop-blur md:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-amber-300 text-white shadow-lg shadow-rose-200">
              {step === "email" ? <Mail className="h-6 w-6" /> : <LockKeyhole className="h-6 w-6" />}
            </div>
            <p className="mb-2 text-sm font-semibold tracking-[.18em] text-rose-500">有錢又好命學院</p>
            <h2 className="text-2xl font-bold">{step === "email" ? "歡迎回來" : "輸入 Email 驗證碼"}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              {step === "email" ? "使用上課時登記的 Email 安全登入" : <>六位數驗證碼已寄到<br /><span className="font-medium text-stone-700">{email}</span></>}
            </p>
          </div>

          {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
          {sent && !error && step === "code" && (
            <div className="mb-5 flex items-center justify-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> 驗證碼已寄出，10 分鐘內有效</div>
          )}

          {step === "email" ? (
            <form onSubmit={requestCode} className="space-y-5">
              <label className="block text-sm font-medium text-stone-700">
                Email
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 h-12 rounded-xl border-stone-200 bg-white px-4"
                />
              </label>
              <Button type="submit" disabled={loading || !email.trim()} className="h-12 w-full rounded-xl bg-rose-500 text-base hover:bg-rose-600">
                {loading ? <><Loader2 className="animate-spin" /> 寄送中</> : "取得登入驗證碼"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-6">
              <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="numeric" containerClassName="justify-center">
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map(index => <InputOTPSlot key={index} index={index} className="h-12 w-11 rounded-xl border bg-white text-lg first:rounded-xl last:rounded-xl" />)}
                </InputOTPGroup>
              </InputOTP>
              <Button type="submit" disabled={loading || code.length !== 6} className="h-12 w-full rounded-xl bg-rose-500 text-base hover:bg-rose-600">
                {loading ? <><Loader2 className="animate-spin" /> 驗證中</> : "安全登入"}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" className="flex items-center gap-1 text-stone-500 hover:text-stone-800" onClick={() => { setStep("email"); setCode(""); setError(""); }}>
                  <ArrowLeft className="h-4 w-4" /> 更換 Email
                </button>
                <button type="button" disabled={loading} className="font-medium text-rose-500 hover:text-rose-700 disabled:opacity-50" onClick={() => requestCode()}>
                  重新寄送
                </button>
              </div>
            </form>
          )}

          <p className="mt-7 text-center text-xs leading-5 text-stone-400">登入即表示你同意學院使用必要資訊提供會員服務。<br />我們不會將你的資料用於未經同意的用途。</p>
        </section>
      </div>
    </main>
  );
}
