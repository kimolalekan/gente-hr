/**
 * Theme persistence store.
 *
 * When `DATABASE_URL` is set, tenant theme + user mode preferences persist to
 * Postgres via Drizzle (see db/schema.ts). Otherwise — e.g. local demo without
 * a database — an in-memory store is used so the UI is fully functional.
 *
 * A real deployment should use the DB path (and a connection pool rather than
 * the per-call pool used here for simplicity).
 */
import "server-only";
import { eq } from "drizzle-orm";
import { getTenantId, getUserId } from "./auth";
import {
  DEFAULT_TENANT_THEME,
  isThemeMode,
  type TenantTheme,
  type ThemeMode,
} from "../theme-config";

let memoryTheme: TenantTheme = {
  ...DEFAULT_TENANT_THEME,
  updatedAt: new Date(0).toISOString(),
};
let memoryMode: ThemeMode = "system";

const DB_PATH_ENABLED = Boolean(process.env.DATABASE_URL);

/**
 * Circuit breaker: once the DB proves unreachable we keep using the in-memory
 * store for the rest of the process instead of retrying (and logging) on
 * every request.
 */
let dbAvailable = DB_PATH_ENABLED;

function shouldUseDb(): boolean {
  return DB_PATH_ENABLED && dbAvailable;
}

function markDbUnavailable(error: unknown): void {
  if (!dbAvailable) return;
  dbAvailable = false;
  console.warn(
    `[theme-store] Database unreachable — using the in-memory store for the rest of this process. ${(error as Error).message}`,
  );
}

export async function getTenantTheme(): Promise<TenantTheme> {
  if (shouldUseDb()) {
    try {
      return await getTenantThemeDb();
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  return { ...memoryTheme };
}

export async function saveTenantTheme(
  theme: TenantTheme,
): Promise<TenantTheme> {
  if (shouldUseDb()) {
    try {
      return await saveTenantThemeDb(theme);
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  memoryTheme = { ...theme };
  return { ...memoryTheme };
}

export async function getUserMode(): Promise<ThemeMode> {
  if (shouldUseDb()) {
    try {
      return await getUserModeDb();
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  return memoryMode;
}

export async function saveUserMode(mode: ThemeMode): Promise<ThemeMode> {
  if (shouldUseDb()) {
    try {
      return await saveUserModeDb(mode);
    } catch (error) {
      markDbUnavailable(error);
    }
  }
  memoryMode = mode;
  return memoryMode;
}

/* ------------------------------------------------------------------ */
/* Postgres (Drizzle) implementations — lazily imported so the app can */
/* run without the `pg` driver ever being touched.                     */
/* ------------------------------------------------------------------ */

async function getTenantThemeDb(): Promise<TenantTheme> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { tenants } = await import("@db/schema");

  const tenantId = await getTenantId();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const rows = await db
      .select({ themeConfig: tenants.themeConfig })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const config = rows[0]?.themeConfig;
    return (
      config ?? {
        ...DEFAULT_TENANT_THEME,
        updatedAt: new Date(0).toISOString(),
      }
    );
  } finally {
    await pool.end();
  }
}

async function saveTenantThemeDb(theme: TenantTheme): Promise<TenantTheme> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { tenants } = await import("@db/schema");

  const tenantId = await getTenantId();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    await db
      .update(tenants)
      .set({ themeConfig: theme, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));
    return theme;
  } finally {
    await pool.end();
  }
}

async function getUserModeDb(): Promise<ThemeMode> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { userPreferences } = await import("@db/schema");

  const userId = await getUserId();
  if (!userId) return "system";
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    const rows = await db
      .select({ themeMode: userPreferences.themeMode })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);
    const mode = rows[0]?.themeMode;
    return mode && isThemeMode(mode) ? mode : "system";
  } finally {
    await pool.end();
  }
}

async function saveUserModeDb(mode: ThemeMode): Promise<ThemeMode> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const { userPreferences } = await import("@db/schema");

  const userId = await getUserId();
  if (!userId) return mode;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  try {
    const db = drizzle(pool);
    await db
      .insert(userPreferences)
      .values({ userId, themeMode: mode, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { themeMode: mode, updatedAt: new Date() },
      });
    return mode;
  } finally {
    await pool.end();
  }
}
