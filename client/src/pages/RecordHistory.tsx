import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function RecordHistory() {
  const { user, loading: authLoading } = useAuth();
  const { data: lifeStageData, isLoading: lifeStageLoading } = trpc.lifeStage.list.useQuery(
    { page: 1, limit: 50 },
    { enabled: !!user }
  );
  const { data: lifestyleData, isLoading: lifestyleLoading } = trpc.lifestyle.list.useQuery(
    { page: 1, limit: 50 },
    { enabled: !!user }
  );
  const { data: netWorthData, isLoading: netWorthLoading } = trpc.netWorth.list.useQuery(
    { page: 1, limit: 50 },
    { enabled: !!user }
  );

  if (authLoading || lifeStageLoading || lifestyleLoading || netWorthLoading) {
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 返回按鈕 */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回儀表板
          </Button>
        </Link>

        {/* 標題 */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-orange-300 bg-clip-text text-transparent mb-6">
          記錄歷史
        </h1>

        {/* 標籤頁 */}
        <Tabs defaultValue="lifeStage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lifeStage">人生階段</TabsTrigger>
            <TabsTrigger value="lifestyle">生活型態</TabsTrigger>
            <TabsTrigger value="netWorth">淨值追蹤</TabsTrigger>
          </TabsList>

          {/* 人生階段記錄 */}
          <TabsContent value="lifeStage" className="space-y-4">
            {lifeStageData?.records && lifeStageData.records.length > 0 ? (
              lifeStageData.records.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>
                        {["", "單身", "有伴侶", "有小孩", "中年", "也許生病", "退休"][
                          parseInt(record.stage)
                        ]}{" "}
                        - {record.currentAge} 歲
                      </span>
                      <span className="text-sm font-normal text-gray-500">
                        {new Date(record.recordDate).toLocaleDateString("zh-TW")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">年齡範圍：</span>
                        <span className="font-semibold">{record.stageAgeRange}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">月開支：</span>
                        <span className="font-semibold">NT${Number(record.monthlyTotal).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">年開支：</span>
                        <span className="font-semibold">NT${Number(record.yearlyTotal).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">所需淨資產：</span>
                        <span className="font-semibold">
                          NT${Number(record.requiredNetAsset).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {record.lifeDescription && (
                      <div>
                        <span className="text-gray-600 text-sm">生活描述：</span>
                        <p className="text-sm mt-1">{record.lifeDescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  尚無記錄
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 生活型態記錄 */}
          <TabsContent value="lifestyle" className="space-y-4">
            {lifestyleData?.records && lifestyleData.records.length > 0 ? (
              lifestyleData.records.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{record.personType === "self" ? "自己" : "伴侶"}</span>
                      <span className="text-sm font-normal text-gray-500">
                        {new Date(record.recordDate).toLocaleDateString("zh-TW")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      {[
                        { key: "frugal", label: "節約" },
                        { key: "current", label: "目前" },
                        { key: "safe", label: "安全" },
                        { key: "comfortable", label: "舒適" },
                        { key: "wealthy", label: "富有" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <span className="text-gray-600 text-xs">{label}</span>
                          <div className="font-semibold text-lg">
                            NT${(record.lifestyles as any)[key].monthlyTotal.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  尚無記錄
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 淨值追蹤記錄 */}
          <TabsContent value="netWorth" className="space-y-4">
            {netWorthData?.records && netWorthData.records.length > 0 ? (
              netWorthData.records.map((record) => (
                <Card key={record.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>淨值 NT${Number(record.netWorth).toLocaleString()}</span>
                      <span className="text-sm font-normal text-gray-500">
                        {new Date(record.recordDate).toLocaleDateString("zh-TW")}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">總資產：</span>
                        <span className="font-semibold text-green-600">
                          NT${Number(record.totalAssets).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">總負債：</span>
                        <span className="font-semibold text-red-600">
                          NT${Number(record.totalLiabilities).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">淨值：</span>
                        <span className={`font-semibold ${Number(record.netWorth) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          NT${Number(record.netWorth).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  尚無記錄
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
