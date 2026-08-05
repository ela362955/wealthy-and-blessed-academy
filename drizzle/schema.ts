import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 人生階段花費規劃表
 * 記錄使用者在六個人生階段的花費規劃
 */
export const lifeStageExpenses = mysqlTable("lifeStageExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recordDate: timestamp("recordDate").defaultNow().notNull(),
  
  // 人生階段：1=單身, 2=有伴侶, 3=有小孩, 4=中年, 5=也許生病, 6=退休
  stage: mysqlEnum("stage", ["1", "2", "3", "4", "5", "6"]).notNull(),
  currentAge: int("currentAge").notNull(),
  stageAgeRange: varchar("stageAgeRange", { length: 20 }), // 例："32-38"
  lifeDescription: text("lifeDescription"), // 生活描述
  mindsetDescription: text("mindsetDescription"), // 心境描述
  
  // 開支詳細資訊（JSON格式）
  expenses: json("expenses").$type<{
    selfLiving: number;
    familyLiving: number;
    responsibility: number;
    reward: number;
    travel: number;
    health: number;
    growth: number;
    other: number;
    projects: number;
  }>().notNull(),
  
  // 自動計算欄位
  monthlyTotal: decimal("monthlyTotal", { precision: 12, scale: 2 }).notNull(),
  yearlyTotal: decimal("yearlyTotal", { precision: 12, scale: 2 }).notNull(),
  requiredNetAsset: decimal("requiredNetAsset", { precision: 15, scale: 2 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LifeStageExpense = typeof lifeStageExpenses.$inferSelect;
export type InsertLifeStageExpense = typeof lifeStageExpenses.$inferInsert;

/**
 * 五種生活型態每月開支操練表
 * 記錄使用者的五種生活型態（節約、目前、安全、舒適、富有）開支詳細資訊
 */
export const lifestyleExpenses = mysqlTable("lifestyleExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recordDate: timestamp("recordDate").defaultNow().notNull(),
  
  // 人物類型：self=自己, partner=伴侶
  personType: mysqlEnum("personType", ["self", "partner"]).notNull(),
  
  // 五種生活型態的開支資訊（JSON格式）
  lifestyles: json("lifestyles").$type<{
    frugal: {
      items: Array<{
        name: string;
        unitPrice: number;
        frequency: number;
        subtotal: number;
      }>;
      monthlyTotal: number;
    };
    current: {
      items: Array<{
        name: string;
        unitPrice: number;
        frequency: number;
        subtotal: number;
      }>;
      monthlyTotal: number;
    };
    safe: {
      items: Array<{
        name: string;
        unitPrice: number;
        frequency: number;
        subtotal: number;
      }>;
      monthlyTotal: number;
    };
    comfortable: {
      items: Array<{
        name: string;
        unitPrice: number;
        frequency: number;
        subtotal: number;
      }>;
      monthlyTotal: number;
    };
    wealthy: {
      items: Array<{
        name: string;
        unitPrice: number;
        frequency: number;
        subtotal: number;
      }>;
      monthlyTotal: number;
    };
  }>().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LifestyleExpense = typeof lifestyleExpenses.$inferSelect;
export type InsertLifestyleExpense = typeof lifestyleExpenses.$inferInsert;

/**
 * 淨值追蹤表
 * 記錄使用者在特定時間點的資產、負債與淨值
 */
export const netWorthTracking = mysqlTable("netWorthTracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  recordDate: timestamp("recordDate").notNull(),
  
  // 資產詳細資訊（JSON格式）
  assets: json("assets").$type<{
    liquidCash: {
      items: Array<{
        name: string;
        amount: number;
        currency: string;
      }>;
      subtotal: number;
    };
    reserves: {
      items: Array<{
        name: string;
        amount: number;
        currency: string;
      }>;
      subtotal: number;
    };
    investments: {
      items: Array<{
        name: string;
        amount: number;
        currency: string;
      }>;
      subtotal: number;
    };
    realEstate: {
      items: Array<{
        name: string;
        amount: number;
        currency: string;
      }>;
      subtotal: number;
    };
    other: {
      items: Array<{
        name: string;
        amount: number;
        currency: string;
      }>;
      subtotal: number;
    };
  }>().notNull(),
  
  // 負債詳細資訊（JSON格式）
  liabilities: json("liabilities").$type<{
    items: Array<{
      name: string;
      amount: number;
    }>;
    subtotal: number;
  }>().notNull(),
  
  // 自動計算欄位
  totalAssets: decimal("totalAssets", { precision: 15, scale: 2 }).notNull(),
  totalLiabilities: decimal("totalLiabilities", { precision: 15, scale: 2 }).notNull(),
  netWorth: decimal("netWorth", { precision: 15, scale: 2 }).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NetWorthTracking = typeof netWorthTracking.$inferSelect;
export type InsertNetWorthTracking = typeof netWorthTracking.$inferInsert;

/**
 * 驗證碼記錄表
 * 記錄使用者申請的 Email OTP 驗證碼
 */
export const verificationCodes = mysqlTable("verificationCodes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;

