/**
 * Database seeder — creates the default tenants, users (admin / hr / staff),
 * their tenant memberships, preferences, the admin's employee profile, and
 * the company's departments (idempotent).
 *
 *   pnpm db:seed
 *
 * Admin users are members of EVERY tenant (company); HR and staff users belong
 * only to their primary tenant. Requires DATABASE_URL. Identity values can be
 * overridden via SEED_* env vars.
 */
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  departments,
  employees,
  tenants,
  userPreferences,
  users,
  userTenants,
} from "./schema";
import { DEFAULT_TENANT_THEME } from "../src/lib/theme-config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

type SeedRole = "admin" | "hr" | "member";

interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: SeedRole;
  /** Tenant where the membership is marked primary. */
  primaryTenantId: string;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL is required to seed. Copy .env.example to .env and set it.",
    );
    process.exit(1);
  }

  const tenantId =
    process.env.SEED_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "acme";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Acme Inc.";
  const globexTenantId =
    process.env.SEED_GLOBEX_TENANT_ID ?? "00000000-0000-0000-0000-000000000004";

  const SEED_USERS: SeedUser[] = [
    {
      id: process.env.SEED_USER_ID ?? "00000000-0000-0000-0000-000000000002",
      email: (process.env.SEED_USER_EMAIL ?? "admin@gente.dev").toLowerCase(),
      name: process.env.SEED_USER_NAME ?? "Ada Admin",
      role: "admin",
      primaryTenantId: tenantId,
    },
    {
      id: "00000000-0000-0000-0000-000000000005",
      email: (
        process.env.SEED_HR_USER_EMAIL ?? "priya.sharma@gente.dev"
      ).toLowerCase(),
      name: process.env.SEED_HR_USER_NAME ?? "Priya Sharma",
      role: "hr",
      primaryTenantId: tenantId,
    },
    {
      id: "00000000-0000-0000-0000-000000000006",
      email: (
        process.env.SEED_STAFF_USER_EMAIL ?? "marco.rossi@gente.dev"
      ).toLowerCase(),
      name: process.env.SEED_STAFF_USER_NAME ?? "Marco Rossi",
      role: "member",
      primaryTenantId: tenantId,
    },
  ];

  // All tenants (companies) in the seed.
  const tenantIds = [tenantId, globexTenantId];

  /** Admins can access every tenant; hr/staff only their primary tenant. */
  function membershipsFor(user: SeedUser) {
    if (user.role !== "admin") {
      return [
        {
          tenantId: user.primaryTenantId,
          role: user.role,
          isPrimary: true,
        },
      ];
    }
    return tenantIds.map((tid) => ({
      tenantId: tid,
      role: "admin" as const,
      isPrimary: tid === user.primaryTenantId,
    }));
  }

  // Default departments (deterministic ids keep re-seeding idempotent).
  // "Legal" is seeded disabled to demonstrate the active/inactive state.
  const SEED_DEPARTMENTS = [
    {
      id: "00000000-0000-0000-0000-000000000011",
      name: "Technology",
      description:
        "Builds and maintains the product, platform and internal tooling.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000012",
      name: "HR",
      description: "Recruiting, onboarding, HR operations and culture.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000013",
      name: "Finance",
      description: "Accounting, budgeting and financial planning.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000014",
      name: "Sales",
      description: "Revenue, account management and go-to-market.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000015",
      name: "Marketing",
      description: "Brand, campaigns and demand generation.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000016",
      name: "Operations",
      description: "Business operations, facilities and logistics.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000017",
      name: "Design",
      description: "Product design, brand and user experience.",
      active: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000018",
      name: "Legal",
      description: "Legal and compliance — currently paused.",
      active: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000019",
      name: "Executive",
      description: "Company leadership and strategic direction.",
      active: true,
    },
  ];

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  console.log("Seeding…");

  /* ---- Tenants ---------------------------------------------------- */
  await db
    .insert(tenants)
    .values({
      id: tenantId,
      slug: tenantSlug,
      name: tenantName,
      themeConfig: DEFAULT_TENANT_THEME,
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { slug: tenantSlug, name: tenantName },
    });
  console.log(`  ✓ tenant  ${tenantName} (${tenantId}, slug: ${tenantSlug})`);

  await db
    .insert(tenants)
    .values({
      id: globexTenantId,
      slug: "globex",
      name: "Globex Corp.",
      themeConfig: DEFAULT_TENANT_THEME,
    })
    .onConflictDoUpdate({
      target: tenants.id,
      set: { slug: "globex", name: "Globex Corp." },
    });
  console.log(`  ✓ tenant  Globex Corp. (${globexTenantId}, slug: globex)`);

  /* ---- Users + memberships ---------------------------------------- */
  for (const user of SEED_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.name,
        status: "active",
        superAdmin: user.role === "admin",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          name: user.name,
          superAdmin: user.role === "admin",
        },
      });
    console.log(`  ✓ user    ${user.name} (${user.email}, role: ${user.role})`);

    for (const membership of membershipsFor(user)) {
      await db
        .insert(userTenants)
        .values({ ...membership, userId: user.id })
        .onConflictDoUpdate({
          target: [userTenants.userId, userTenants.tenantId],
          set: { role: membership.role, isPrimary: membership.isPrimary },
        });
    }
    console.log(
      `  ✓ memberships (${membershipsFor(user)
        .map((m) => m.role)
        .join(", ")} across ${membershipsFor(user).length} tenant(s))`,
    );

    await db
      .insert(userPreferences)
      .values({ userId: user.id, themeMode: "system" })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { themeMode: "system" },
      });
  }
  console.log("  ✓ user_preferences (theme_mode: system)");

  /* ---- Admin employee profile -------------------------------------- */
  const admin = SEED_USERS[0];
  await db
    .insert(employees)
    .values({
      id: "00000000-0000-0000-0000-000000000003",
      tenantId,
      userId: admin.id,
      employeeId: "EMP-013",
      name: admin.name,
      email: admin.email,
      department: "Executive",
      designation: "Chief Executive Officer",
      location: "London",
      joinDate: "2018-01-15",
      employmentType: "full_time",
      status: "active",
    })
    .onConflictDoUpdate({
      target: employees.id,
      set: {
        tenantId,
        userId: admin.id,
        name: admin.name,
        email: admin.email,
        status: "active",
      },
    });
  console.log("  ✓ employee (EMP-013, linked to admin user)");

  /* ---- Departments -------------------------------------------------- */
  for (const department of SEED_DEPARTMENTS) {
    await db
      .insert(departments)
      .values({
        id: department.id,
        tenantId,
        name: department.name,
        description: department.description,
        active: department.active,
      })
      .onConflictDoUpdate({
        target: departments.id,
        set: {
          name: department.name,
          description: department.description,
          active: department.active,
        },
      });
  }
  console.log(
    `  ✓ departments (${SEED_DEPARTMENTS.length}: Technology, HR, Finance, Sales, Marketing, Operations, Design, Legal, Executive)`,
  );

  await pool.end();
  console.log("Done. Sign in with OTP at /login using any seeded email.");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
