import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Runs once before the test suite: loads env (so the test runner and the
 * signed-cookie helper use the same secrets as the server) and resets the
 * database — dropping the `public` and `drizzle` (migration tracking) schemas,
 * then re-applying migrations + seeds — so every run starts from a pristine
 * dataset (several tests mutate rows).
 */
export default function globalSetup(): void {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  console.log("[e2e] Resetting the database (drop schema → migrate → seed)…");
  execSync(
    "node -e \"const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;').then(()=>p.end()).catch(e=>{console.error(e.message);process.exit(1)})\"",
    { stdio: "inherit" },
  );
  execSync("pnpm db:migrate", { stdio: "inherit" });
  execSync("pnpm db:seed", { stdio: "inherit" });
  console.log("[e2e] Database ready.");
}
