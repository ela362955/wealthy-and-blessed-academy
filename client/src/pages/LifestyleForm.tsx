import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const LIFESTYLE_TYPES = [
  { id: "frugal", name: "節約", description: "最省最省的花費" },
  { id: "current", name: "目前", description: "現在大概的花費" },
  { id: "safe", name: "安全", description: "比較安全的花費" },
  { id: "comfortable", name: "舒適", description: "生活這樣很開心" },
  { id: "wealthy", name: "富有", description: "活著太好了！" },
];

interface ExpenseItem {
  name: string;
  unitPrice: number;
  frequency: number;
  subtotal: number;
}

interface LifestyleData {
  frugal: { items: ExpenseItem[]; monthlyTotal: number };
  current: { items: ExpenseItem[]; monthlyTotal: number };
  safe: { items: ExpenseItem[]; monthlyTotal: number };
  comfortable: { items: ExpenseItem[]; monthlyTotal: number };
  wealthy: { items: ExpenseItem[]; monthlyTotal: number };
}

export default function LifestyleForm() {
  const { user, loading: authLoading } = useAuth();
  const [lifestyles, setLifestyles] = useState<LifestyleData>({
    frugal: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
    current: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
    safe: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
    comfortable: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
    wealthy: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
  });

  const createMutation = trpc.lifestyle.create.useMutation({
    onSuccess: () => {
      toast.success("記錄已儲存");
      setLifestyles({
        frugal: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
        current: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
        safe: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
        comfortable: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
        wealthy: { items: [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }], monthlyTotal: 0 },
      });
    },
    onError: (error) => {
      toast.error(`錯誤: ${error.message}`);
    },
  });

  const updateLifestyleData = (
    lifestyleType: keyof LifestyleData,
    itemIndex: number,
    field: keyof ExpenseItem,
    value: string | number
  ) => {
    setLifestyles((prev) => {
      const updated = { ...prev };
      const items = [...updated[lifestyleType].items];
      const item = { ...items[itemIndex] };

      if (field === "unitPrice" || field === "frequency") {
        (item as any)[field] = parseFloat(String(value)) || 0;
        item.subtotal = item.unitPrice * item.frequency;
      } else {
        (item as any)[field] = value;
      }

      items[itemIndex] = item;
      updated[lifestyleType] = {
        items,
        monthlyTotal: items.reduce((sum, i) => sum + i.subtotal, 0),
      };
      return updated;
    });
  };

  const addItem = (lifestyleType: keyof LifestyleData) => {
    setLifestyles((prev) => ({
      ...prev,
      [lifestyleType]: {
        ...prev[lifestyleType],
        items: [...prev[lifestyleType].items, { name: "", unitPrice: 0, frequency: 0, subtotal: 0 }],
      },
    }));
  };

  const removeItem = (lifestyleType: keyof LifestyleData, itemIndex: number) => {
    setLifestyles((prev) => {
      const updated = { ...prev };
      const items = updated[lifestyleType].items.filter((_, i) => i !== itemIndex);
      updated[lifestyleType] = {
        items: items.length > 0 ? items : [{ name: "", unitPrice: 0, frequency: 0, subtotal: 0 }],
        monthlyTotal: items.reduce((sum, i) => sum + i.subtotal, 0),
      };
      return updated;
    });
  };

  const handleSubmit = async (personType: "self" | "partner") => {
    // 驗證至少有一個項目
    const hasItems = Object.values(lifestyles).some((lifestyle: any) =>
      lifestyle.items.some((item: any) => item.name.trim() !== "")
    );

    if (!hasItems) {
      toast.error("請至少填寫一個開支項目");
      return;
    }

    await createMutation.mutateAsync({
      personType,
      lifestyles,
    });
  };

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
      <div className="max-w-7xl mx-auto">
        {/* 返回按鈕 */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回儀表板
          </Button>
        </Link>

        {/* 標題 */}
        <h1 className="text-4xl font-bold gradient-title mb-8 text-center">
          五種生活型態每月開支操練表
        </h1>

        {/* 五種生活型態表單 */}
        <div className="space-y-6">
          {LIFESTYLE_TYPES.map((lifestyle) => (
            <Card key={lifestyle.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{lifestyle.name}</span>
                  <span className="text-lg font-bold text-blue-600">
                    NT${lifestyles[lifestyle.id as keyof LifestyleData].monthlyTotal.toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">項目名稱</th>
                        <th className="text-right py-2 px-2">單價</th>
                        <th className="text-right py-2 px-2">次數</th>
                        <th className="text-right py-2 px-2">小計</th>
                        <th className="text-center py-2 px-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lifestyles[lifestyle.id as keyof LifestyleData].items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-2">
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updateLifestyleData(
                                  lifestyle.id as keyof LifestyleData,
                                  idx,
                                  "name",
                                  e.target.value
                                )
                              }
                              placeholder="例：基本三餐"
                              className="text-sm"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateLifestyleData(
                                  lifestyle.id as keyof LifestyleData,
                                  idx,
                                  "unitPrice",
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="text-sm text-right"
                              min="0"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              value={item.frequency}
                              onChange={(e) =>
                                updateLifestyleData(
                                  lifestyle.id as keyof LifestyleData,
                                  idx,
                                  "frequency",
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="text-sm text-right"
                              min="0"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-semibold">
                            NT${item.subtotal.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeItem(lifestyle.id as keyof LifestyleData, idx)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => addItem(lifestyle.id as keyof LifestyleData)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增項目
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* 提交按鈕 - 雙欄 */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleSubmit("self")}
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                "儲存自己的記錄"
              )}
            </Button>
            <Button
              onClick={() => handleSubmit("partner")}
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                "儲存伴侶的記錄"
              )}
            </Button>
          </div>
          <Link href="/dashboard">
            <Button type="button" variant="outline" className="w-full">
              取消
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
