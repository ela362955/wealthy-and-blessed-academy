import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, lifeStageExpenses, lifestyleExpenses, netWorthTracking, verificationCodes } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  let url = process.env.DATABASE_URL;
  if (!url && process.env.MYSQL_HOST) {
    const user = process.env.MYSQL_USERNAME || process.env.MYSQL_USER;
    url = `mysql://${user}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`;
  }

  if (!_db && url) {
    try {
      _db = drizzle(url);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserByEmail(email: string): Promise<typeof users.$inferSelect> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let user = await getUserByEmail(email);
  if (!user) {
    // Generate a random UUID for openId to satisfy schema uniqueness for now
    const openId = crypto.randomUUID();
    await db.insert(users).values({
      openId,
      email,
      loginMethod: "email_otp",
    });
    user = await getUserByEmail(email);
  } else {
    // Update last signed in
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
    user = await getUserByEmail(email);
  }
  return user!;
}

// ============ Verification Codes ============

export async function createVerificationCode(email: string, code: string, expiresInMinutes = 15) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  await db.insert(verificationCodes).values({
    email,
    code,
    expiresAt,
  });
}

export async function verifyAndConsumeCode(email: string, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(verificationCodes)
    .where(and(
      eq(verificationCodes.email, email),
      eq(verificationCodes.code, code)
    ))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);

  if (result.length === 0) return false;

  const entry = result[0];
  
  // Clean up this code (consume it)
  await db.delete(verificationCodes).where(eq(verificationCodes.id, entry.id));

  // Check expiration
  if (entry.expiresAt < new Date()) {
    return false;
  }

  return true;
}


// ============ Life Stage Expenses ============

export async function createLifeStageExpense(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(lifeStageExpenses).values({
    userId,
    stage: data.stage,
    currentAge: data.currentAge,
    stageAgeRange: data.stageAgeRange,
    lifeDescription: data.lifeDescription,
    mindsetDescription: data.mindsetDescription,
    expenses: data.expenses,
    monthlyTotal: data.monthlyTotal,
    yearlyTotal: data.yearlyTotal,
    requiredNetAsset: data.requiredNetAsset,
  });

  return result;
}

export async function getLifeStageExpenses(userId: number, page: number = 1, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offset = (page - 1) * limit;

  const records = await db
    .select()
    .from(lifeStageExpenses)
    .where(eq(lifeStageExpenses.userId, userId))
    .orderBy(desc(lifeStageExpenses.recordDate))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: lifeStageExpenses.id })
    .from(lifeStageExpenses)
    .where(eq(lifeStageExpenses.userId, userId));

  return {
    records,
    total: countResult.length > 0 ? countResult.length : 0,
    page,
    limit,
  };
}

export async function getLifeStageExpenseById(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(lifeStageExpenses)
    .where(and(eq(lifeStageExpenses.userId, userId), eq(lifeStageExpenses.id, id)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateLifeStageExpense(userId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(lifeStageExpenses)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(lifeStageExpenses.userId, userId), eq(lifeStageExpenses.id, id)));

  return result;
}

export async function deleteLifeStageExpense(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(lifeStageExpenses)
    .where(and(eq(lifeStageExpenses.userId, userId), eq(lifeStageExpenses.id, id)));

  return result;
}

export async function getLatestLifeStageExpense(userId: number, stage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(lifeStageExpenses.userId, userId)];
  if (stage) {
    conditions.push(eq(lifeStageExpenses.stage, stage as any));
  }

  const result = await db
    .select()
    .from(lifeStageExpenses)
    .where(and(...conditions))
    .orderBy(desc(lifeStageExpenses.recordDate))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ Lifestyle Expenses ============

export async function createLifestyleExpense(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(lifestyleExpenses).values({
    userId,
    personType: data.personType,
    lifestyles: data.lifestyles,
  });

  return result;
}

export async function getLifestyleExpenses(userId: number, page: number = 1, limit: number = 10, personType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offset = (page - 1) * limit;

  const conditions = [eq(lifestyleExpenses.userId, userId)];
  if (personType) {
    conditions.push(eq(lifestyleExpenses.personType, personType as any));
  }

  const records = await db
    .select()
    .from(lifestyleExpenses)
    .where(and(...conditions))
    .orderBy(desc(lifestyleExpenses.recordDate))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: lifestyleExpenses.id })
    .from(lifestyleExpenses)
    .where(eq(lifestyleExpenses.userId, userId));

  return {
    records,
    total: countResult.length > 0 ? countResult.length : 0,
    page,
    limit,
  };
}

export async function getLifestyleExpenseById(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(lifestyleExpenses)
    .where(and(eq(lifestyleExpenses.userId, userId), eq(lifestyleExpenses.id, id)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateLifestyleExpense(userId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(lifestyleExpenses)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(lifestyleExpenses.userId, userId), eq(lifestyleExpenses.id, id)));

  return result;
}

export async function deleteLifestyleExpense(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(lifestyleExpenses)
    .where(and(eq(lifestyleExpenses.userId, userId), eq(lifestyleExpenses.id, id)));

  return result;
}

export async function getLatestLifestyleExpense(userId: number, personType?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(lifestyleExpenses.userId, userId)];
  if (personType) {
    conditions.push(eq(lifestyleExpenses.personType, personType as any));
  }

  const result = await db
    .select()
    .from(lifestyleExpenses)
    .where(and(...conditions))
    .orderBy(desc(lifestyleExpenses.recordDate))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

// ============ Net Worth Tracking ============

export async function createNetWorthTracking(userId: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(netWorthTracking).values({
    userId,
    recordDate: data.recordDate,
    assets: data.assets,
    liabilities: data.liabilities,
    totalAssets: data.totalAssets,
    totalLiabilities: data.totalLiabilities,
    netWorth: data.netWorth,
  });

  return result;
}

export async function getNetWorthTrackings(userId: number, page: number = 1, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const offset = (page - 1) * limit;

  const records = await db
    .select()
    .from(netWorthTracking)
    .where(eq(netWorthTracking.userId, userId))
    .orderBy(desc(netWorthTracking.recordDate))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: netWorthTracking.id })
    .from(netWorthTracking)
    .where(eq(netWorthTracking.userId, userId));

  return {
    records,
    total: countResult.length > 0 ? countResult.length : 0,
    page,
    limit,
  };
}

export async function getNetWorthTrackingById(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(netWorthTracking)
    .where(and(eq(netWorthTracking.userId, userId), eq(netWorthTracking.id, id)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateNetWorthTracking(userId: number, id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(netWorthTracking)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(netWorthTracking.userId, userId), eq(netWorthTracking.id, id)));

  return result;
}

export async function deleteNetWorthTracking(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(netWorthTracking)
    .where(and(eq(netWorthTracking.userId, userId), eq(netWorthTracking.id, id)));

  return result;
}

export async function getLatestNetWorthTracking(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(netWorthTracking)
    .where(eq(netWorthTracking.userId, userId))
    .orderBy(desc(netWorthTracking.recordDate))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
