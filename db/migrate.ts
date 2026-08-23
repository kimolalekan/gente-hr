/**
 * Applies pending Drizzle migrations from `db/migrations` (journal-tracked).
 *
 *   pnpm db:migrate
 *
 * Requires DATABASE_URL. Migrations are generated from `db/schema.ts` with
 * `pnpm db:generate` (drizzle-kit) and applied here in journal order via the
 * Drizzle migrator, which records them in the `__drizzle_migrations` table.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

if (existsSync(".env")) process.loadEnvFile(".env");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is required. Copy .env.example to .env.local and set it.",
    );
    process.exit(1);
  }

  const migrationsFolder = fileURLToPath(
    new URL("./migrations", import.meta.url),
  );

  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool);
    console.log("Applying Drizzle migrations…");
    await migrate(db, { migrationsFolder });
    console.log("✓ Schema applied.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
