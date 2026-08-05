import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Home() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, {
    enabled: !!user,
  });

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const sendOtpMutation = trpc.auth.sendOtp.useMutation({
    onSuccess: () => {
      setOtpSent(true);
      toast.success("驗證碼已發送至您的信箱！");
    },
    onError: (err) => {
      toast.error(err.message || "發送失敗，請稍後再試");
    }
  });

  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      toast.success("登入成功！");
      refresh();
    },
    onError: (err) => {
      toast.error(err.message || "驗證失敗，請檢查密碼是否正確");
    }
  });

  const handleSendOtp = () => {
    if (!email || !email.includes("@")) {
      toast.error("請輸入有效的 Email");
      return;
    }
    sendOtpMutation.mutate({ email });
  };

  const handleVerifyOtp = () => {
    if (otpCode.length !== 6) {
      toast.error("請輸入 6 位數驗證碼");
      return;
    }
    verifyOtpMutation.mutate({ email, code: otpCode });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-2 border-pink-100 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent mb-2">
              個人財務導航系統
            </h1>
            <p className="text-gray-500 text-sm">
              讓我們一起規劃您的財務未來，掌握人生每個階段的開支與資產
            </p>
          </CardHeader>
          <CardContent className="pt-6">
            {!otpSent ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email 信箱</label>
                  <Input 
                    placeholder="請輸入您的 Email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button 
                  size="lg" 
                  onClick={handleSendOtp} 
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0"
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  發送登入驗證碼
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">6 位數驗證碼</label>
                  <Input 
                    placeholder="請輸入信件中的 6 位數密碼" 
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                  <p className="text-xs text-gray-400">已發送至 {email}</p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleVerifyOtp} 
                  className="w-full bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 border-0"
                  disabled={verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                  確認登入
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setOtpSent(false)} 
                  className="w-full text-gray-500 mt-2"
                >
                  重新輸入 Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-6xl mx-auto">
        {/* 標題區 */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold gradient-title mb-3">
            個人財務導航系統
          </h1>
          <p className="text-purple-600 text-lg">歡迎 <span className="font-semibold">{user.name}</span>，讓我們一起規劃您的財務未來</p>
        </div>

        {/* 功能卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* 人生六大階段卡片 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">人生六大階段花費規劃</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.lifeStage?.latestRecord ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">最新階段：</span>
                    <span className="font-semibold">
                      {["", "單身", "有伴侶", "有小孩", "中年", "也許生病", "退休"][
                        parseInt(summary.lifeStage.latestRecord.stage)
                      ]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">月開支：</span>
                    <span className="font-semibold">
                      NT${Number(summary.lifeStage.latestRecord.monthlyTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">年開支：</span>
                    <span className="font-semibold">
                      NT${Number(summary.lifeStage.latestRecord.yearlyTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">尚無記錄</p>
              )}
              <Link href="/life-stage">
                <Button className="w-full">填寫或編輯</Button>
              </Link>
            </CardContent>
          </Card>

          {/* 五種生活型態卡片 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">五種生活型態開支操練</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.lifestyle?.latestRecord ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">人物：</span>
                    <span className="font-semibold">
                      {summary.lifestyle.latestRecord.personType === "self" ? "自己" : "伴侶"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最後更新：</span>
                    <span className="font-semibold text-xs">
                      {new Date(summary.lifestyle.latestRecord.recordDate).toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">尚無記錄</p>
              )}
              <Link href="/lifestyle">
                <Button className="w-full">填寫或編輯</Button>
              </Link>
            </CardContent>
          </Card>

          {/* 淨值追蹤卡片 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">淨值追蹤</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.netWorth?.latestRecord ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">淨值：</span>
                    <span className="font-semibold text-lg">
                      NT${Number(summary.netWorth.latestRecord.netWorth).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">資產：</span>
                    <span className="font-semibold">
                      NT${Number(summary.netWorth.latestRecord.totalAssets).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">負債：</span>
                    <span className="font-semibold">
                      NT${Number(summary.netWorth.latestRecord.totalLiabilities).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">尚無記錄</p>
              )}
              <Link href="/net-worth">
                <Button className="w-full">填寫或編輯</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作區 */}
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="gradient-title">快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/history">
                <Button variant="outline">查看所有記錄</Button>
              </Link>
              <Button variant="outline">匯出報告</Button>
              <Button variant="outline">設定提醒</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
