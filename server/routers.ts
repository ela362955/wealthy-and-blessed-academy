import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// ============ Validation Schemas ============

const LifeStageExpensesSchema = z.object({
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
      const requiredNetAsset = yearlyTotal * 10; // 假設 10 年規劃期

      await db.createLifeStageExpense(ctx.user.id, {
        ...input,
        monthlyTotal,
        yearlyTotal,
        requiredNetAsset,
      });

      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().default(10),
      stage: z.enum(["1", "2", "3", "4", "5", "6"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getLifeStageExpenses(ctx.user.id, input.page, input.limit);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await db.getLifeStageExpenseById(ctx.user.id, input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      ...LifeStageExpensesSchema.partial().shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      if (updateData.expenses) {
        const { monthlyTotal, yearlyTotal } = calculateLifeStageExpenses(updateData.expenses);
        const requiredNetAsset = yearlyTotal * 10;
        Object.assign(updateData, { monthlyTotal, yearlyTotal, requiredNetAsset });
      }

      await db.updateLifeStageExpense(ctx.user.id, id, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteLifeStageExpense(ctx.user.id, input.id);
      return { success: true };
    }),

  getLatest: protectedProcedure
    .input(z.object({
      stage: z.enum(["1", "2", "3", "4", "5", "6"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getLatestLifeStageExpense(ctx.user.id, input.stage);
    }),
});

const lifestyleRouter = router({
  create: protectedProcedure
    .input(LifestyleExpensesSchema)
    .mutation(async ({ ctx, input }) => {
      await db.createLifestyleExpense(ctx.user.id, input);
      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().default(10),
      personType: z.enum(["self", "partner"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getLifestyleExpenses(ctx.user.id, input.page, input.limit, input.personType);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await db.getLifestyleExpenseById(ctx.user.id, input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      ...LifestyleExpensesSchema.partial().shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      await db.updateLifestyleExpense(ctx.user.id, id, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteLifestyleExpense(ctx.user.id, input.id);
      return { success: true };
    }),

  getLatest: protectedProcedure
    .input(z.object({
      personType: z.enum(["self", "partner"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getLatestLifestyleExpense(ctx.user.id, input.personType);
    }),
});

const netWorthRouter = router({
  create: protectedProcedure
    .input(NetWorthTrackingSchema)
    .mutation(async ({ ctx, input }) => {
      const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(input.assets, input.liabilities);

      await db.createNetWorthTracking(ctx.user.id, {
        ...input,
        totalAssets,
        totalLiabilities,
        netWorth,
      });

      return { success: true };
    }),

  list: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().default(10),
    }))
    .query(async ({ ctx, input }) => {
      return await db.getNetWorthTrackings(ctx.user.id, input.page, input.limit);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await db.getNetWorthTrackingById(ctx.user.id, input.id);
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      ...NetWorthTrackingSchema.partial().shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      if (updateData.assets || updateData.liabilities) {
        const assets = updateData.assets || {};
        const liabilities = updateData.liabilities || {};
        const { totalAssets, totalLiabilities, netWorth } = calculateNetWorth(assets, liabilities);
        Object.assign(updateData, { totalAssets, totalLiabilities, netWorth });
      }

      await db.updateNetWorthTracking(ctx.user.id, id, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteNetWorthTracking(ctx.user.id, input.id);
      return { success: true };
    }),

  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getLatestNetWorthTracking(ctx.user.id);
    }),
});

const dashboardRouter = router({
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const lifeStageLatest = await db.getLatestLifeStageExpense(ctx.user.id);
      const lifestyleLatest = await db.getLatestLifestyleExpense(ctx.user.id);
      const netWorthLatest = await db.getLatestNetWorthTracking(ctx.user.id);

      return {
        lifeStage: {
          latestRecord: lifeStageLatest,
        },
        lifestyle: {
          latestRecord: lifestyleLatest,
        },
        netWorth: {
          latestRecord: netWorthLatest,
        },
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
