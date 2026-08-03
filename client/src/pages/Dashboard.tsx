import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data: summary, isLoading } = trpc.dashboard.getSummary.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">請登入</h1>
          <p className="text-gray-600 mb-6">請先登入以使用財務規劃工具</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 標題區 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-orange-300 bg-clip-text text-transparent mb-2">
            個人財務導航系統
          </h1>
          <p className="text-gray-600">歡迎 {user.name}，讓我們一起規劃您的財務未來</p>
        </div>

        {/* 功能卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 人生六大階段卡片 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">人生六大階段花費規劃</CardTitle>
              <CardDescription>規劃您人生各階段的開支預算</CardDescription>
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
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">五種生活型態開支操練</CardTitle>
              <CardDescription>分析您的開支模式</CardDescription>
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
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">淨值追蹤</CardTitle>
              <CardDescription>掌握您的資產與負債</CardDescription>
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
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
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
