import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

interface AssetItem {
  name: string;
  amount: number;
  currency: string;
}

interface LiabilityItem {
  name: string;
  amount: number;
}

interface NetWorthFormData {
  recordDate: string;
  assets: {
    liquidCash: { items: AssetItem[]; subtotal: number };
    reserves: { items: AssetItem[]; subtotal: number };
    investments: { items: AssetItem[]; subtotal: number };
    realEstate: { items: AssetItem[]; subtotal: number };
    other: { items: AssetItem[]; subtotal: number };
  };
  liabilities: {
    items: LiabilityItem[];
    subtotal: number;
  };
}

export default function NetWorthForm() {
  const { user, loading: authLoading } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  
  const [formData, setFormData] = useState<NetWorthFormData>({
    recordDate: today,
    assets: {
      liquidCash: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
      reserves: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
      investments: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
      realEstate: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
      other: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
    },
    liabilities: {
      items: [{ name: "", amount: 0 }],
      subtotal: 0,
    },
  });

  const createMutation = trpc.netWorth.create.useMutation({
    onSuccess: () => {
      toast.success("記錄已儲存");
      setFormData({
        recordDate: today,
        assets: {
          liquidCash: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
          reserves: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
          investments: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
          realEstate: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
          other: { items: [{ name: "", amount: 0, currency: "NT" }], subtotal: 0 },
        },
        liabilities: {
          items: [{ name: "", amount: 0 }],
          subtotal: 0,
        },
      });
    },
    onError: (error) => {
      toast.error(`錯誤: ${error.message}`);
    },
  });

  const updateAssetItem = (
    assetType: keyof typeof formData.assets,
    itemIndex: number,
    field: keyof AssetItem,
    value: any
  ) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const items = [...updated.assets[assetType].items];
      const item = { ...items[itemIndex] };

      if (field === "amount") {
        item.amount = parseFloat(value) || 0;
      } else {
        item[field] = value;
      }

      items[itemIndex] = item;
      updated.assets[assetType] = {
        items,
        subtotal: items.reduce((sum, i) => sum + i.amount, 0),
      };
      return updated;
    });
  };

  const updateLiabilityItem = (itemIndex: number, field: keyof LiabilityItem, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const items = [...updated.liabilities.items];
      const item = { ...items[itemIndex] };

      if (field === "amount") {
        item.amount = parseFloat(value) || 0;
      } else {
        item[field] = value;
      }

      items[itemIndex] = item;
      updated.liabilities = {
        items,
        subtotal: items.reduce((sum, i) => sum + i.amount, 0),
      };
      return updated;
    });
  };

  const addAssetItem = (assetType: keyof typeof formData.assets) => {
    setFormData((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [assetType]: {
          ...prev.assets[assetType],
          items: [...prev.assets[assetType].items, { name: "", amount: 0, currency: "NT" }],
        },
      },
    }));
  };

  const removeAssetItem = (assetType: keyof typeof formData.assets, itemIndex: number) => {
    setFormData((prev) => {
      const updated = { ...prev };
      const items = updated.assets[assetType].items.filter((_, i) => i !== itemIndex);
      updated.assets[assetType] = {
        items: items.length > 0 ? items : [{ name: "", amount: 0, currency: "NT" }],
        subtotal: items.reduce((sum, i) => sum + i.amount, 0),
      };
      return updated;
    });
  };

  const addLiabilityItem = () => {
    setFormData((prev) => ({
      ...prev,
      liabilities: {
        ...prev.liabilities,
        items: [...prev.liabilities.items, { name: "", amount: 0 }],
      },
    }));
  };

  const removeLiabilityItem = (itemIndex: number) => {
    setFormData((prev) => {
      const items = prev.liabilities.items.filter((_, i) => i !== itemIndex);
      return {
        ...prev,
        liabilities: {
          items: items.length > 0 ? items : [{ name: "", amount: 0 }],
          subtotal: items.reduce((sum, i) => sum + i.amount, 0),
        },
      };
    });
  };

  const totalAssets = Object.values(formData.assets).reduce((sum, asset) => sum + asset.subtotal, 0);
  const totalLiabilities = formData.liabilities.subtotal;
  const netWorth = totalAssets - totalLiabilities;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recordDate) {
      toast.error("請選擇記錄日期");
      return;
    }

    await createMutation.mutateAsync({
      recordDate: new Date(formData.recordDate),
      assets: formData.assets,
      liabilities: formData.liabilities,
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
          淨值追蹤表
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 記錄日期 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle>記錄日期</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="recordDate">日期</Label>
              <Input
                id="recordDate"
                type="date"
                value={formData.recordDate}
                onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* 資產部分 */}
          {(
            [
              { key: "liquidCash", label: "A 流動現金" },
              { key: "reserves", label: "B 預備金" },
              { key: "investments", label: "C 投資" },
              { key: "realEstate", label: "D 不動產" },
              { key: "other", label: "E 其他資產" },
            ] as const
          ).map(({ key, label }) => (
            <Card key={key} className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{label}</span>
                  <span className="text-lg font-bold text-green-600">
                    NT${formData.assets[key].subtotal.toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.assets[key].items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">名稱</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateAssetItem(key, idx, "name", e.target.value)}
                        placeholder="例：國泰世華"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">金額</Label>
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateAssetItem(key, idx, "amount", e.target.value)}
                        placeholder="0"
                        className="text-sm"
                        min="0"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">幣別</Label>
                      <Input
                        value={item.currency}
                        onChange={(e) => updateAssetItem(key, idx, "currency", e.target.value)}
                        placeholder="NT"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssetItem(key, idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => addAssetItem(key)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增項目
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* 負債部分 */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>F 負債</span>
                <span className="text-lg font-bold text-red-600">
                  NT${formData.liabilities.subtotal.toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.liabilities.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">負債名稱</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => updateLiabilityItem(idx, "name", e.target.value)}
                      placeholder="例：房貸"
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">金額</Label>
                    <Input
                      type="number"
                      value={item.amount}
                      onChange={(e) => updateLiabilityItem(idx, "amount", e.target.value)}
                      placeholder="0"
                      className="text-sm"
                      min="0"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLiabilityItem(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addLiabilityItem}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增負債
              </Button>
            </CardContent>
          </Card>

          {/* 淨值計算結果 */}
          <Card className="border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle className="gradient-title">淨值計算</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">總資產：</span>
                <span className="text-2xl font-bold text-green-600">
                  NT${totalAssets.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">總負債：</span>
                <span className="text-2xl font-bold text-red-600">
                  NT${totalLiabilities.toLocaleString()}
                </span>
              </div>
              <div className="border-t-2 pt-3 flex justify-between items-center text-lg">
                <span className="font-semibold">淨值：</span>
                <span className={`text-3xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  NT${netWorth.toLocaleString()}
                </span>
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
