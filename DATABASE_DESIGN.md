# 財務規劃系統 - 資料庫架構與 tRPC 路由設計

## 資料庫架構

### 核心表設計

#### 1. lifeStageExpenses（人生階段花費記錄表）
記錄使用者在每個人生階段的花費規劃。

```typescript
{
  id: int (PK)
  userId: int (FK → users.id)
  recordDate: timestamp
  stage: enum (1-6)
    - 1: 單身
    - 2: 有伴侶
    - 3: 有小孩
    - 4: 中年
    - 5: 也許生病
    - 6: 退休
  currentAge: int
  stageAgeRange: varchar (例："32-38")
  lifeDescription: text (生活描述)
  mindsetDescription: text (心境描述)
  
  // 開支詳細資訊（JSON 格式）
  expenses: json {
    selfLiving: decimal (自己生存)
    familyLiving: decimal (家庭生存)
    responsibility: decimal (一定要)
    reward: decimal (犒賞)
    travel: decimal (旅遊)
    health: decimal (健康)
    growth: decimal (成長)
    other: decimal (其他)
    projects: decimal (生活專案)
  }
  
  // 自動計算欄位
  monthlyTotal: decimal
  yearlyTotal: decimal
  requiredNetAsset: decimal
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2. lifestyleExpenses（五種生活型態開支記錄表）
記錄使用者的五種生活型態開支詳細資訊。

```typescript
{
  id: int (PK)
  userId: int (FK → users.id)
  recordDate: timestamp
  personType: enum
    - "self": 自己
    - "partner": 伴侶
  
  // 五種生活型態的開支資訊（JSON 格式）
  lifestyles: json {
    frugal: {
      items: [
        {
          name: string (項目名稱)
          unitPrice: decimal (單價)
          frequency: decimal (次數)
          subtotal: decimal (小計)
        }
      ]
      monthlyTotal: decimal
    },
    current: { ... },
    safe: { ... },
    comfortable: { ... },
    wealthy: { ... }
  }
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 3. netWorthTracking（淨值追蹤記錄表）
記錄使用者在特定時間點的資產、負債與淨值。

```typescript
{
  id: int (PK)
  userId: int (FK → users.id)
  recordDate: timestamp
  
  // 資產詳細資訊（JSON 格式）
  assets: json {
    liquidCash: {
      items: [
        {
          name: string (帳戶名稱)
          amount: decimal (金額)
          currency: string (幣別，預設 NT)
        }
      ]
      subtotal: decimal
    },
    reserves: {
      items: [...]
      subtotal: decimal
    },
    investments: {
      items: [...]
      subtotal: decimal
    },
    realEstate: {
      items: [...]
      subtotal: decimal
    },
    other: {
      items: [...]
      subtotal: decimal
    }
  }
  
  // 負債詳細資訊（JSON 格式）
  liabilities: json {
    items: [
      {
        name: string (負債名稱)
        amount: decimal (金額)
      }
    ]
    subtotal: decimal
  }
  
  // 自動計算欄位
  totalAssets: decimal
  totalLiabilities: decimal
  netWorth: decimal
  
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## tRPC 路由設計

### 路由結構
```
/api/trpc/
├── auth/
│   ├── me
│   └── logout
├── lifeStage/
│   ├── create
│   ├── list
│   ├── getById
│   ├── update
│   ├── delete
│   └── getLatest
├── lifestyle/
│   ├── create
│   ├── list
│   ├── getById
│   ├── update
│   ├── delete
│   └── getLatest
├── netWorth/
│   ├── create
│   ├── list
│   ├── getById
│   ├── update
│   ├── delete
│   └── getLatest
└── dashboard/
    └── getSummary
```

### 詳細路由定義

#### lifeStage 路由

**lifeStage.create** - 建立新的人生階段花費記錄
```typescript
input: {
  stage: 1-6
  currentAge: number
  stageAgeRange: string
  lifeDescription: string
  mindsetDescription: string
  expenses: {
    selfLiving: number
    familyLiving: number
    responsibility: number
    reward: number
    travel: number
    health: number
    growth: number
    other: number
    projects: number
  }
}
output: {
  id: number
  monthlyTotal: number
  yearlyTotal: number
  requiredNetAsset: number
  createdAt: Date
}
```

**lifeStage.list** - 取得所有人生階段記錄（分頁）
```typescript
input: {
  page: number (預設 1)
  limit: number (預設 10)
  stage?: number (可選篩選)
}
output: {
  records: LifeStageExpense[]
  total: number
  page: number
  limit: number
}
```

**lifeStage.getById** - 取得特定人生階段記錄
```typescript
input: { id: number }
output: LifeStageExpense
```

**lifeStage.update** - 更新人生階段記錄
```typescript
input: {
  id: number
  // 其他可更新欄位
}
output: LifeStageExpense
```

**lifeStage.delete** - 刪除人生階段記錄
```typescript
input: { id: number }
output: { success: boolean }
```

**lifeStage.getLatest** - 取得最新的人生階段記錄
```typescript
input: { stage?: number }
output: LifeStageExpense | null
```

#### lifestyle 路由

**lifestyle.create** - 建立新的五種生活型態開支記錄
```typescript
input: {
  personType: "self" | "partner"
  lifestyles: {
    frugal: { items: [...], monthlyTotal: number }
    current: { items: [...], monthlyTotal: number }
    safe: { items: [...], monthlyTotal: number }
    comfortable: { items: [...], monthlyTotal: number }
    wealthy: { items: [...], monthlyTotal: number }
  }
}
output: {
  id: number
  createdAt: Date
}
```

**lifestyle.list** - 取得所有五種生活型態記錄（分頁）
```typescript
input: {
  page: number
  limit: number
  personType?: "self" | "partner"
}
output: {
  records: LifestyleExpense[]
  total: number
  page: number
  limit: number
}
```

**lifestyle.getById** - 取得特定五種生活型態記錄
```typescript
input: { id: number }
output: LifestyleExpense
```

**lifestyle.update** - 更新五種生活型態記錄
```typescript
input: {
  id: number
  // 其他可更新欄位
}
output: LifestyleExpense
```

**lifestyle.delete** - 刪除五種生活型態記錄
```typescript
input: { id: number }
output: { success: boolean }
```

**lifestyle.getLatest** - 取得最新的五種生活型態記錄
```typescript
input: { personType?: "self" | "partner" }
output: LifestyleExpense | null
```

#### netWorth 路由

**netWorth.create** - 建立新的淨值追蹤記錄
```typescript
input: {
  recordDate: Date
  assets: {
    liquidCash: { items: [...], subtotal: number }
    reserves: { items: [...], subtotal: number }
    investments: { items: [...], subtotal: number }
    realEstate: { items: [...], subtotal: number }
    other: { items: [...], subtotal: number }
  }
  liabilities: {
    items: [...]
    subtotal: number
  }
}
output: {
  id: number
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  createdAt: Date
}
```

**netWorth.list** - 取得所有淨值追蹤記錄（分頁）
```typescript
input: {
  page: number
  limit: number
  startDate?: Date
  endDate?: Date
}
output: {
  records: NetWorthTracking[]
  total: number
  page: number
  limit: number
}
```

**netWorth.getById** - 取得特定淨值追蹤記錄
```typescript
input: { id: number }
output: NetWorthTracking
```

**netWorth.update** - 更新淨值追蹤記錄
```typescript
input: {
  id: number
  // 其他可更新欄位
}
output: NetWorthTracking
```

**netWorth.delete** - 刪除淨值追蹤記錄
```typescript
input: { id: number }
output: { success: boolean }
```

**netWorth.getLatest** - 取得最新的淨值追蹤記錄
```typescript
input: {}
output: NetWorthTracking | null
```

#### dashboard 路由

**dashboard.getSummary** - 取得儀表板摘要資訊
```typescript
input: {}
output: {
  lifeStage: {
    latestRecord: LifeStageExpense | null
    stages: Array<{
      stage: number
      stageName: string
      latestMonthlyTotal: number
      latestYearlyTotal: number
    }>
  }
  lifestyle: {
    latestRecord: LifestyleExpense | null
    latestMonthlyTotals: {
      frugal: number
      current: number
      safe: number
      comfortable: number
      wealthy: number
    }
  }
  netWorth: {
    latestRecord: NetWorthTracking | null
    latestNetWorth: number
    trend: Array<{
      recordDate: Date
      netWorth: number
    }>
  }
}
```

---

## 計算邏輯

### 人生階段花費計算
```typescript
function calculateLifeStageExpenses(expenses: ExpenseData) {
  const monthlyTotal = Object.values(expenses).reduce((sum, val) => sum + val, 0);
  const yearlyTotal = monthlyTotal * 12;
  const stageYears = calculateStageYears(currentAge, stageAgeRange);
  const requiredNetAsset = yearlyTotal * stageYears;
  
  return { monthlyTotal, yearlyTotal, requiredNetAsset };
}
```

### 五種生活型態計算
```typescript
function calculateLifestyleExpenses(items: ExpenseItem[]) {
  return items.reduce((total, item) => {
    item.subtotal = item.unitPrice * item.frequency;
    return total + item.subtotal;
  }, 0);
}
```

### 淨值計算
```typescript
function calculateNetWorth(assets: Assets, liabilities: Liabilities) {
  const totalAssets = Object.values(assets).reduce((sum, category) => 
    sum + category.subtotal, 0);
  const totalLiabilities = liabilities.subtotal;
  const netWorth = totalAssets - totalLiabilities;
  
  return { totalAssets, totalLiabilities, netWorth };
}
```

---

## 資料驗證規則

### 人生階段花費
- stage: 必填，1-6 之間
- currentAge: 必填，正整數
- stageAgeRange: 必填，格式 "xx-yy"
- 所有開支金額: 非負數

### 五種生活型態
- personType: 必填，"self" 或 "partner"
- 所有項目: unitPrice ≥ 0, frequency ≥ 0
- 至少包含一個生活型態

### 淨值追蹤
- recordDate: 必填，有效日期
- 所有金額: 非負數
- 至少包含一個資產或負債項目

---

## 索引設計

```sql
-- 提升查詢效能
CREATE INDEX idx_lifeStageExpenses_userId_recordDate 
  ON lifeStageExpenses(userId, recordDate DESC);

CREATE INDEX idx_lifestyleExpenses_userId_recordDate 
  ON lifestyleExpenses(userId, recordDate DESC);

CREATE INDEX idx_netWorthTracking_userId_recordDate 
  ON netWorthTracking(userId, recordDate DESC);
```

---

## 安全考量

1. **使用者隔離**：所有查詢必須過濾 userId，確保使用者只能存取自己的資料
2. **權限驗證**：所有修改操作必須使用 protectedProcedure
3. **輸入驗證**：所有輸入必須通過 Zod schema 驗證
4. **資料加密**：敏感金額資訊在傳輸層使用 HTTPS
