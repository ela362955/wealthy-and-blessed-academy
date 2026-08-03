import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const STAGES = [
  { id: "1", name: "單身", description: "獨立生活階段" },
  { id: "2", name: "有伴侶", description: "二人世界" },
  { id: "3", name: "有小孩", description: "養育小孩" },
  { id: "4", name: "中年", description: "事業與家庭平衡" },
  { id: "5", name: "也許生病", description: "健康與保障" },
  { id: "6", name: "退休", description: "享受人生" },
];

interface ExpenseData {
  selfLiving: number;
  familyLiving: number;
  responsibility: number;
  reward: number;
  travel: number;
  health: number;
  growth: number;
  other: number;
  projects: number;
}

export default function LifeStageForm() {
  const { user, loading: authLoading } = useAuth();
  const [selectedStage, setSelectedStage] = useState<string>("1");
  const [formData, setFormData] = useState({
    currentAge: "",
    stageAgeRange: "",
    lifeDescription: "",
    mindsetDescription: "",
    expenses: {
      selfLiving: 0,
      familyLiving: 0,
      responsibility: 0,
      reward: 0,
      travel: 0,
      health: 0,
      growth: 0,
      other: 0,
      projects: 0,
    } as ExpenseData,
  });

  const createMutation = trpc.lifeStage.create.useMutation({
    onSuccess: () => {
      toast.success("記錄已儲存");
      setFormData({
        currentAge: "",
        stageAgeRange: "",
        lifeDescription: "",
        mindsetDescription: "",
        expenses: {
          selfLiving: 0,
          familyLiving: 0,
          responsibility: 0,
          reward: 0,
          travel: 0,
          health: 0,
          growth: 0,
          other: 0,
          projects: 0,
        },
      });
    },
    onError: (error) => {
      toast.error(`錯誤: ${error.message}`);
    },
  });

  const handleExpenseChange = (field: keyof ExpenseData, value: number) => {
    setFormData((prev) => ({
      ...prev,
      expenses: {
        ...prev.expenses,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentAge || !formData.stageAgeRange) {
      toast.error("請填寫必填欄位");
      return;
    }

    await createMutation.mutateAsync({
      stage: selectedStage as any,
      currentAge: parseInt(formData.currentAge),
      stageAgeRange: formData.stageAgeRange,
      lifeDescription: formData.lifeDescription,
      mindsetDescription: formData.mindsetDescription,
      expenses: formData.expenses,
    });
  };

  const monthlyTotal = Object.values(formData.expenses).reduce((sum, val) => sum + val, 0);
  const yearlyTotal = monthlyTotal * 12;
  const requiredNetAsset = yearlyTotal * 10;

  if (authLoading) {
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
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回儀表板
          </Button>
        </Link>

        {/* 標題 */}
        <h1 className="text-4xl font-bold gradient-title mb-8 text-center">
            人生六大階段花費規劃表
          </h1>

        {/* 階段選擇 */}
        <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
          <CardHeader>
            <CardTitle className="gradient-title">選擇人生階段</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStage} onValueChange={setSelectedStage}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                {STAGES.map((stage) => (
                  <TabsTrigger key={stage.id} value={stage.id} className="text-xs">
                    {stage.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本資訊 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle>基本資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentAge">目前年齡</Label>
                  <Input
                    id="currentAge"
                    type="number"
                    value={formData.currentAge}
                    onChange={(e) => setFormData({ ...formData, currentAge: e.target.value })}
                    placeholder="例：32"
                  />
                </div>
                <div>
                  <Label htmlFor="stageAgeRange">階段年齡範圍</Label>
                  <Input
                    id="stageAgeRange"
                    value={formData.stageAgeRange}
                    onChange={(e) => setFormData({ ...formData, stageAgeRange: e.target.value })}
                    placeholder="例：32-38"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="lifeDescription">生活描述</Label>
                <Textarea
                  id="lifeDescription"
                  value={formData.lifeDescription}
                  onChange={(e) => setFormData({ ...formData, lifeDescription: e.target.value })}
                  placeholder="描述您希望在這個階段的生活方式..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="mindsetDescription">心境描述</Label>
                <Textarea
                  id="mindsetDescription"
                  value={formData.mindsetDescription}
                  onChange={(e) => setFormData({ ...formData, mindsetDescription: e.target.value })}
                  placeholder="描述您在這個階段的心態與優先事項..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 開支項目 */}
          <Card>
            <CardHeader>
              <CardTitle>每月開支預算</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "selfLiving", label: "自己生存" },
                  { key: "familyLiving", label: "家庭生存" },
                  { key: "responsibility", label: "一定要（責任）" },
                  { key: "reward", label: "犒賞" },
                  { key: "travel", label: "旅遊" },
                  { key: "health", label: "健康" },
                  { key: "growth", label: "成長" },
                  { key: "other", label: "其他" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      value={formData.expenses[key as keyof ExpenseData]}
                      onChange={(e) =>
                        handleExpenseChange(key as keyof ExpenseData, parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      min="0"
                    />
                  </div>
                ))}
              </div>
              <div>
                <Label htmlFor="projects">生活專案（一次性支出）</Label>
                <Input
                  id="projects"
                  type="number"
                  value={formData.expenses.projects}
                  onChange={(e) => handleExpenseChange("projects", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* 計算結果 */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle>計算結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">每月總開支：</span>
                <span className="text-2xl font-bold text-blue-600">NT${monthlyTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">每年總開支：</span>
                <span className="text-2xl font-bold text-indigo-600">NT${yearlyTotal.toLocaleString()}</span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center text-lg">
                <span className="font-semibold">所需淨資產總額：</span>
                <span className="text-2xl font-bold text-emerald-600">NT${requiredNetAsset.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* 提交按鈕 */}
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                "儲存記錄"
              )}
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline" className="flex-1">
                取消
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
