import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
const FROM_EMAIL = "finance-planner@resend.dev"; // 測試用發件人，正式需替換網域

// ============ Validation Schemas ============

const LifeStageExpensesSchema = z.object({
  email: z.string().email(),
  stage: z.enum(["1", "2", "3", "4", "5", "6"]),
  currentAge: z.number().int().positive(),
  stageAgeRange: z.string(),
  lifeDescription: z.string(),
  mindsetDescription: z.string(),
  expenses: z.object({
    selfLiving: z.number().nonnegative(),
    familyLiving: z.number().nonnegative(),
    responsibility: z.number().nonnegative(),
    reward: z.number().nonnegative(),
    travel: z.number().nonnegative(),
    health: z.number().nonnegative(),
    growth: z.number().nonnegative(),
    other: z.number().nonnegative(),
    projects: z.number().nonnegative(),
  }),
});

const LifestyleExpenseItemSchema = z.object({
  name: z.string(),
  unitPrice: z.number().nonnegative(),
  frequency: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

const LifestyleExpensesSchema = z.object({
  email: z.string().email(),
  personType: z.enum(["self", "partner"]),
  lifestyles: z.object({
    frugal: z.object({
      items: z.array(LifestyleExpenseItemSchema),
      monthlyTotal: z.number().nonnegative(),
    }),
    current: z.object({
      items: z.array(LifestyleExpenseItemSchema),
      monthlyTotal: z.number().nonnegative(),
    }),
    safe: z.object({
      items: z.array(LifestyleExpenseItemSchema),
      monthlyTotal: z.number().nonnegative(),
    }),
    comfortable: z.object({
      items: z.array(LifestyleExpenseItemSchema),
      monthlyTotal: z.number().nonnegative(),
    }),
    wealthy: z.object({
      items: z.array(LifestyleExpenseItemSchema),
      monthlyTotal: z.number().nonnegative(),
    }),
  }),
});

const AssetItemSchema = z.object({
  name: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().default("NT"),
});

const LiabilityItemSchema = z.object({
  name: z.string(),
  amount: z.number().nonnegative(),
});

const NetWorthTrackingSchema = z.object({
  email: z.string().email(),
  recordDate: z.date(),
  assets: z.object({
    liquidCash: z.object({
      items: z.array(AssetItemSchema),
      subtotal: z.number().nonnegative(),
    }),
    reserves: z.object({
      items: z.array(AssetItemSchema),
      subtotal: z.number().nonnegative(),
    }),
    investments: z.object({
      items: z.array(AssetItemSchema),
      subtotal: z.number().nonnegative(),
    }),
    realEstate: z.object({
      items: z.array(AssetItemSchema),
      subtotal: z.number().nonnegative(),
    }),
    other: z.object({
      items: z.array(AssetItemSchema),
      subtotal: z.number().nonnegative(),
    }),
  }),
  liabilities: z.object({
    items: z.array(LiabilityItemSchema),
    subtotal: z.number().nonnegative(),
  }),
});

// ============ Calculation Helpers ============

function calculateLifeStageExpenses(expenses: any) {
  const monthlyTotal = Object.values(expenses).reduce((sum: number, val: any) => sum + Number(val), 0);
  const yearlyTotal = monthlyTotal * 12;
  return { monthlyTotal, yearlyTotal };
}

function calculateNetWorth(assets: any, liabilities: any) {
  const totalAssets = Object.values(assets).reduce((sum: number, category: any) => sum + Number(category.subtotal), 0);
  const totalLiabilities = liabilities.subtotal;
  const netWorth = totalAssets - totalLiabilities;
  return { totalAssets, totalLiabilities, netWorth };
}

// ============ Routers ============

const lifeStageRouter = router({
  create: protectedProcedure
    .input(LifeStageExpensesSchema)
    .mutation(async ({ ctx, input }) => {
      const { monthlyTotal, yearlyTotal } = calculateLifeStageExpenses(input.expenses);
      const requiredNetAsset = yearlyTotal * 10;
      
      const htmlBody = `
        <h2>您的「人生六大階段」財務規劃備份</h2>
        <p>階段：${input.stage}</p>
        <p>年齡：${input.currentAge}</p>
        <p>月總支出：${monthlyTotal}</p>
        <p>年總支出：${yearlyTotal}</p>
        <p>目標淨資產：${requiredNetAsset}</p>
        <hr/>
        <p>感謝您使用有錢又好命學院系統！</p>
      `;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.email,
        subject: "【有錢又好命學院】您的人生六大階段財務規劃",
        html: htmlBody,
      });

      return { success: true };
    }),
  
  // Dummy endpoints for UI compatibility
  list: protectedProcedure.query(() => ({ data: [], total: 0 })),
  getLatest: protectedProcedure.query(() => null),
});

const lifestyleRouter = router({
  create: protectedProcedure
    .input(LifestyleExpensesSchema)
    .mutation(async ({ ctx, input }) => {
      const htmlBody = `
        <h2>您的「五種生活型態」財務規劃備份</h2>
        <p>對象：${input.personType === 'self' ? '自己' : '伴侶'}</p>
        <ul>
          <li>簡約型月支出：${input.lifestyles.frugal.monthlyTotal}</li>
          <li>現況型月支出：${input.lifestyles.current.monthlyTotal}</li>
          <li>安全型月支出：${input.lifestyles.safe.monthlyTotal}</li>
          <li>舒適型月支出：${input.lifestyles.comfortable.monthlyTotal}</li>
          <li>富裕型月支出：${input.lifestyles.wealthy.monthlyTotal}</li>
        </ul>
        <hr/>
        <p>感謝您使用有錢又好命學院系統！</p>
      `;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.email,
        subject: "【有錢又好命學院】您的生活型態財務規劃",
        html: htmlBody,
      });
      return { success: true };
    }),
  
  list: protectedProcedure.query(() => ({ data: [], total: 0 })),
  getLatest: protectedProcedure.query(() => null),
});

const netWorthRouter = router({
  create: protectedProcedure
    .input(NetWorthTrackingSchema)
    .mutation(async ({ ctx, input }) => {
      const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(input.assets, input.liabilities);
      
      const htmlBody = `
        <h2>您的「淨值追蹤」紀錄備份</h2>
        <p>總資產：${totalAssets}</p>
        <p>總負債：${totalLiabilities}</p>
        <p><strong>淨值：${netWorth}</strong></p>
        <hr/>
        <p>感謝您使用有錢又好命學院系統！</p>
      `;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: input.email,
        subject: "【有錢又好命學院】您的淨值追蹤紀錄",
        html: htmlBody,
      });
      return { success: true };
    }),
  
  list: protectedProcedure.query(() => ({ data: [], total: 0 })),
  getLatest: protectedProcedure.query(() => null),
});

const dashboardRouter = router({
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      return {
        lifeStage: { latestRecord: null },
        lifestyle: { latestRecord: null },
        netWorth: { latestRecord: null },
      };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("eps_session", { path: "/" });
      return {
        success: true,
      } as const;
    }),
  }),
  lifeStage: lifeStageRouter,
  lifestyle: lifestyleRouter,
  netWorth: netWorthRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
