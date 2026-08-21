/**
 * Applies the schema migration SQL directly (single reference file).
 *
 *   pnpm db:migrate
 *
 * Requires DATABASE_URL. Idempotent: all statements use IF NOT EXISTS /
 * ON CONFLICT DO NOTHING.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

if (existsSync('.env')) process.loadEnvFile('.env');
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required. Copy .env.example to .env.local and set it.');
    process.exit(1);
  }

  const sqlPath = fileURLToPath(new URL('./migrations/0000_full_schema.sql', import.meta.url));
  const sql = readFileSync(sqlPath, 'utf8');

  const pool = new Pool({ connectionString });
  try {
    console.log('Applying db/migrations/0000_full_schema.sql…');
    await pool.query(sql);
    console.log('✓ Schema applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
