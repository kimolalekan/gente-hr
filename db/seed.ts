/**
 * Database seeder — creates the default tenants, users (admin / hr / staff),
 * memberships, preferences, and the full demo dataset the HR pages expect:
 * employees + salary breakdowns, departments, ATS (jobs, applications,
 * screening → interview → offer → hired/rejected), offboarding, employee
 * documents, leave balances/requests, attendance, performance
 * templates/cycles/reviews, payroll runs/entries/payslips, loans,
 * onboarding plans + tasks, notifications, email settings, audit logs
 * (all idempotent).
 *
 *   pnpm db:seed
 *
 * Admin users are members of EVERY tenant (company); HR and staff users belong
 * only to their primary tenant. Every employee in the roster also gets a login
 * (a `users` row + a `member` membership linked to their employee record) so
 * the whole demo team can sign in with OTP. Requires DATABASE_URL. Identity
 * values can be overridden via SEED_* env vars.
 */
import { existsSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  applications,
  applicationStages,
  attendanceRecords,
  auditLogs,
  departments,
  emailLogs,
  emailSettings,
  employeeDocuments,
  employees,
  files,
  interviews,
  jobs,
  leaveBalances,
  leaves,
  loans,
  notifications,
  offboardingChecklistItems,
  offboardings,
  offers,
  onboardingPlans,
  onboardingTasks,
  payrollEntries,
  payrollRuns,
  payslips,
  performanceTemplates,
  reviewCycles,
  reviews,
  salary,
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

/** Local (non-UTC) date string for a Date. */
function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday → Friday of the current week (for attendance demo rows). */
function weekDates(): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return isoDate(date);
  });
}

function timeToHours(checkIn: string, checkOut: string): number {
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  return Math.round((oh + om / 60 - (ih + im / 60)) * 10) / 10;
}

function computeEmi(
  amount: number,
  annualRatePercent: number,
  term: number,
): number {
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(amount / term);
  const factor = (1 + r) ** term;
  return Math.round((amount * r * factor) / (factor - 1));
}

/**
 * Demo annual salary breakdown keyed by the payroll components (basic + hra +
 * allowances + bonus = gross; tax + pension + insurance = deductions).
 */
function breakdownFor(annual: number) {
  return {
    basic: Math.round(annual * 0.6),
    hra: Math.round(annual * 0.15),
    allowances: Math.round(annual * 0.1),
    bonus: Math.round(annual * 0.15),
    tax: Math.round(annual * 0.25),
    pension: Math.round(annual * 0.08),
    insurance: Math.round(annual * 0.05),
  };
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

  /* ---- Demo employees (mirrors src/lib/hr-data.ts) --------------------- */
  // adminEmployeeId is the employee row linked to the admin user.
  const adminEmployeeId = "00000000-0000-0000-0000-000000000003";
  const adminUserId = SEED_USERS[0].id;
  const hrUserId = SEED_USERS[1].id;
  const staffUserId = SEED_USERS[2].id;

  interface SeedEmployee {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    address: { address: string; state: string; country: string };
    status: "active" | "on_leave" | "pending";
    joinedAt: string;
    salary: number;
    managerId: string | null;
    userId?: string | null;
  }

  const SEED_EMPLOYEES: SeedEmployee[] = [
    {
      id: "00000000-0000-0000-0000-000000000101",
      employeeId: "EMP-014",
      name: "Priya Sharma",
      email: "priya.sharma@gente.dev",
      phone: "+44 20 7946 0958",
      department: "Engineering",
      designation: "Head of Engineering",
      address: {
        address: "1 St. Paul's Churchyard",
        state: "England",
        country: "United Kingdom",
      },
      status: "active",
      joinedAt: "2019-03-11",
      salary: 185000,
      managerId: adminEmployeeId,
      userId: hrUserId,
    },
    {
      id: "00000000-0000-0000-0000-000000000102",
      employeeId: "EMP-015",
      name: "Marco Rossi",
      email: "marco.rossi@gente.dev",
      phone: "+39 02 3600 2241",
      department: "Design",
      designation: "Senior Product Designer",
      address: {
        address: "Via Monte Napoleone 8",
        state: "Lombardy",
        country: "Italy",
      },
      status: "active",
      joinedAt: "2021-06-01",
      salary: 112000,
      managerId: adminEmployeeId,
      userId: staffUserId,
    },
    {
      id: "00000000-0000-0000-0000-000000000103",
      employeeId: "EMP-016",
      name: "Sofia Andersson",
      email: "sofia.andersson@gente.dev",
      phone: "+46 8 5400 3312",
      department: "People",
      designation: "People Partner",
      address: {
        address: "Kungsgatan 12",
        state: "Stockholm County",
        country: "Sweden",
      },
      status: "on_leave",
      joinedAt: "2020-01-20",
      salary: 98000,
      managerId: adminEmployeeId,
    },
    {
      id: "00000000-0000-0000-0000-000000000104",
      employeeId: "EMP-017",
      name: "David Chen",
      email: "david.chen@gente.dev",
      phone: "+65 6221 8890",
      department: "Engineering",
      designation: "Staff Engineer",
      address: {
        address: "1 Raffles Place",
        state: "Central Singapore Community Development Council",
        country: "Singapore",
      },
      status: "active",
      joinedAt: "2018-09-04",
      salary: 172000,
      managerId: "00000000-0000-0000-0000-000000000101",
    },
    {
      id: "00000000-0000-0000-0000-000000000105",
      employeeId: "EMP-018",
      name: "Amara Okafor",
      email: "amara.okafor@gente.dev",
      phone: "+234 1 277 6400",
      department: "Finance",
      designation: "Financial Controller",
      address: {
        address: "1 Bankers Way",
        state: "Lagos",
        country: "Nigeria",
      },
      status: "active",
      joinedAt: "2022-02-14",
      salary: 124000,
      managerId: adminEmployeeId,
    },
    {
      id: "00000000-0000-0000-0000-000000000106",
      employeeId: "EMP-019",
      name: "Lucas Meyer",
      email: "lucas.meyer@gente.dev",
      phone: "+49 30 555 0187",
      department: "Sales",
      designation: "Sales Director",
      address: {
        address: "Unter den Linden 10",
        state: "Berlin",
        country: "Germany",
      },
      status: "active",
      joinedAt: "2019-11-05",
      salary: 158000,
      managerId: adminEmployeeId,
    },
    {
      id: "00000000-0000-0000-0000-000000000107",
      employeeId: "EMP-020",
      name: "Elena Petrova",
      email: "elena.petrova@gente.dev",
      phone: "+31 20 244 9081",
      department: "Data",
      designation: "Data Scientist",
      address: {
        address: "Damrak 15",
        state: "North Holland",
        country: "Netherlands",
      },
      status: "active",
      joinedAt: "2021-08-16",
      salary: 121000,
      managerId: "00000000-0000-0000-0000-000000000101",
    },
    {
      id: "00000000-0000-0000-0000-000000000108",
      employeeId: "EMP-021",
      name: "James O'Brien",
      email: "james.obrien@gente.dev",
      phone: "+353 1 234 5566",
      department: "Engineering",
      designation: "Backend Engineer",
      address: {
        address: "1 Grand Canal Square",
        state: "Leinster",
        country: "Ireland",
      },
      status: "pending",
      joinedAt: "2026-07-27",
      salary: 105000,
      managerId: "00000000-0000-0000-0000-000000000104",
    },
    {
      id: "00000000-0000-0000-0000-000000000109",
      employeeId: "EMP-022",
      name: "Yuki Tanaka",
      email: "yuki.tanaka@gente.dev",
      phone: "+81 3 5550 4488",
      department: "Design",
      designation: "Brand Designer",
      address: {
        address: "Shibuya 2-1",
        state: "Tokyo",
        country: "Japan",
      },
      status: "active",
      joinedAt: "2022-05-23",
      salary: 101000,
      managerId: "00000000-0000-0000-0000-000000000102",
    },
    {
      id: "00000000-0000-0000-0000-000000000110",
      employeeId: "EMP-023",
      name: "Fatima Al-Sayed",
      email: "fatima.alsayed@gente.dev",
      phone: "+971 4 350 7732",
      department: "Operations",
      designation: "Operations Lead",
      address: {
        address: "Sheikh Zayed Road",
        state: "Dubai",
        country: "United Arab Emirates",
      },
      status: "active",
      joinedAt: "2020-10-12",
      salary: 118000,
      managerId: adminEmployeeId,
    },
    {
      id: "00000000-0000-0000-0000-000000000111",
      employeeId: "EMP-024",
      name: "Noah Williams",
      email: "noah.williams@gente.dev",
      phone: "+1 212 555 0142",
      department: "Sales",
      designation: "Account Executive",
      address: {
        address: "350 Fifth Avenue",
        state: "New York",
        country: "United States",
      },
      status: "on_leave",
      joinedAt: "2023-01-09",
      salary: 92000,
      managerId: "00000000-0000-0000-0000-000000000106",
    },
    {
      id: "00000000-0000-0000-0000-000000000112",
      employeeId: "EMP-025",
      name: "Aisha Bello",
      email: "aisha.bello@gente.dev",
      phone: "+234 1 277 6455",
      department: "People",
      designation: "People Operations",
      address: {
        address: "2 Admiralty Way",
        state: "Lagos",
        country: "Nigeria",
      },
      status: "active",
      joinedAt: "2023-04-03",
      salary: 84000,
      managerId: "00000000-0000-0000-0000-000000000103",
    },
  ];

  /* ---- Leave balances (from hr-data LEAVE_BALANCES, year 2026) --------- */
  const BALANCES: Array<{
    id: string;
    employeeId: string;
    vacation: { total: number; used: number };
    sick: { total: number; used: number };
    personal: { total: number; used: number };
  }> = [
    {
      id: "00000000-0000-0000-0000-000000000301",
      employeeId: "00000000-0000-0000-0000-000000000101",
      vacation: { total: 25, used: 9 },
      sick: { total: 10, used: 2 },
      personal: { total: 5, used: 1 },
    },
    {
      id: "00000000-0000-0000-0000-000000000302",
      employeeId: "00000000-0000-0000-0000-000000000102",
      vacation: { total: 25, used: 12 },
      sick: { total: 10, used: 0 },
      personal: { total: 5, used: 2 },
    },
    {
      id: "00000000-0000-0000-0000-000000000303",
      employeeId: "00000000-0000-0000-0000-000000000103",
      vacation: { total: 25, used: 18 },
      sick: { total: 10, used: 3 },
      personal: { total: 5, used: 0 },
    },
    {
      id: "00000000-0000-0000-0000-000000000304",
      employeeId: "00000000-0000-0000-0000-000000000104",
      vacation: { total: 25, used: 7 },
      sick: { total: 10, used: 1 },
      personal: { total: 5, used: 1 },
    },
    {
      id: "00000000-0000-0000-0000-000000000305",
      employeeId: "00000000-0000-0000-0000-000000000105",
      vacation: { total: 25, used: 11 },
      sick: { total: 10, used: 0 },
      personal: { total: 5, used: 0 },
    },
    {
      id: "00000000-0000-0000-0000-000000000306",
      employeeId: "00000000-0000-0000-0000-000000000106",
      vacation: { total: 25, used: 15 },
      sick: { total: 10, used: 2 },
      personal: { total: 5, used: 2 },
    },
    {
      id: "00000000-0000-0000-0000-000000000307",
      employeeId: "00000000-0000-0000-0000-000000000107",
      vacation: { total: 25, used: 6 },
      sick: { total: 10, used: 0 },
      personal: { total: 5, used: 0 },
    },
    {
      id: "00000000-0000-0000-0000-000000000308",
      employeeId: "00000000-0000-0000-0000-000000000108",
      vacation: { total: 25, used: 0 },
      sick: { total: 10, used: 0 },
      personal: { total: 5, used: 0 },
    },
    {
      id: "00000000-0000-0000-0000-000000000309",
      employeeId: "00000000-0000-0000-0000-000000000109",
      vacation: { total: 25, used: 8 },
      sick: { total: 10, used: 1 },
      personal: { total: 5, used: 0 },
    },
    {
      id: "00000000-0000-0000-0000-000000000310",
      employeeId: "00000000-0000-0000-0000-000000000110",
      vacation: { total: 25, used: 10 },
      sick: { total: 10, used: 2 },
      personal: { total: 5, used: 1 },
    },
    {
      id: "00000000-0000-0000-0000-000000000311",
      employeeId: "00000000-0000-0000-0000-000000000111",
      vacation: { total: 25, used: 20 },
      sick: { total: 10, used: 4 },
      personal: { total: 5, used: 2 },
    },
    {
      id: "00000000-0000-0000-0000-000000000312",
      employeeId: "00000000-0000-0000-0000-000000000112",
      vacation: { total: 25, used: 3 },
      sick: { total: 10, used: 0 },
      personal: { total: 5, used: 1 },
    },
    {
      id: "00000000-0000-0000-0000-000000000313",
      employeeId: adminEmployeeId,
      vacation: { total: 25, used: 6 },
      sick: { total: 10, used: 1 },
      personal: { total: 5, used: 1 },
    },
  ];

  /* ---- Leave requests (from hr-data LEAVE_REQUESTS) --------------------- */
  const SEED_LEAVES: Array<{
    id: string;
    employeeId: string;
    type: "vacation" | "sick" | "parental" | "other";
    start: string;
    end: string;
    days: number;
    status: "approved" | "pending" | "declined" | "cancelled";
    reason?: string;
  }> = [
    {
      id: "00000000-0000-0000-0000-000000000401",
      employeeId: "00000000-0000-0000-0000-000000000111",
      type: "vacation",
      start: "2026-08-24",
      end: "2026-08-28",
      days: 5,
      status: "pending",
      reason: "Family trip to the Catskills",
    },
    {
      id: "00000000-0000-0000-0000-000000000402",
      employeeId: "00000000-0000-0000-0000-000000000110",
      type: "sick",
      start: "2026-08-18",
      end: "2026-08-19",
      days: 2,
      status: "pending",
      reason: "Migraine — resting at home",
    },
    {
      id: "00000000-0000-0000-0000-000000000403",
      employeeId: "00000000-0000-0000-0000-000000000103",
      type: "parental",
      start: "2026-08-01",
      end: "2026-10-30",
      days: 65,
      status: "approved",
    },
    {
      id: "00000000-0000-0000-0000-000000000404",
      employeeId: "00000000-0000-0000-0000-000000000102",
      type: "vacation",
      start: "2026-09-07",
      end: "2026-09-11",
      days: 5,
      status: "approved",
      reason: "Summer break",
    },
    {
      id: "00000000-0000-0000-0000-000000000405",
      employeeId: "00000000-0000-0000-0000-000000000107",
      type: "other",
      start: "2026-08-20",
      end: "2026-08-20",
      days: 1,
      status: "declined",
      reason: "Conference travel day (policy: use business travel budget)",
    },
    {
      id: "00000000-0000-0000-0000-000000000406",
      employeeId: "00000000-0000-0000-0000-000000000104",
      type: "vacation",
      start: "2026-09-14",
      end: "2026-09-18",
      days: 5,
      status: "pending",
      reason: "Trip to Japan",
    },
    {
      id: "00000000-0000-0000-0000-000000000407",
      employeeId: "00000000-0000-0000-0000-000000000109",
      type: "sick",
      start: "2026-08-14",
      end: "2026-08-14",
      days: 1,
      status: "approved",
    },
    {
      id: "00000000-0000-0000-0000-000000000408",
      employeeId: "00000000-0000-0000-0000-000000000112",
      type: "vacation",
      start: "2026-10-05",
      end: "2026-10-09",
      days: 5,
      status: "pending",
      reason: "Wedding in Abuja",
    },
  ];

  /* ---- Performance templates / cycle / reviews -------------------------- */
  const TEMPLATE_STANDARD = "00000000-0000-0000-0000-000000000601";
  const TEMPLATE_ENGINEERING = "00000000-0000-0000-0000-000000000602";
  const TEMPLATE_MANAGER = "00000000-0000-0000-0000-000000000603";
  const CYCLE_Q3 = "00000000-0000-0000-0000-000000000610";

  /* ---- Payroll demo ------------------------------------------------------ */
  const PAYROLL_PERIOD = "August 2026";
  const payrollRunId = "00000000-0000-0000-0000-000000000801";

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
      settings: { language: "en" },
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
      settings: { language: "en" },
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

    await db
      .insert(userPreferences)
      .values({ userId: user.id, themeMode: "system" })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { themeMode: "system" },
      });
  }
  console.log("  ✓ user_preferences (theme_mode: system)");

  /* ---- Employees + salaries ---------------------------------------- */
  const allEmployees = [
    {
      id: adminEmployeeId,
      employeeId: "EMP-013",
      name: SEED_USERS[0].name,
      email: SEED_USERS[0].email,
      phone: "+44 20 7946 0001",
      department: "Executive",
      designation: "Chief Executive Officer",
      address: {
        address: "1 St. Paul's Churchyard",
        state: "England",
        country: "United Kingdom",
      },
      status: "active" as const,
      joinedAt: "2018-01-15",
      salary: 220000,
      managerId: null,
      userId: adminUserId,
    },
    ...SEED_EMPLOYEES,
  ];

  for (const employee of allEmployees) {
    await db
      .insert(employees)
      .values({
        id: employee.id,
        tenantId,
        userId: employee.userId ?? null,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        address: employee.address,
        managerId: employee.managerId,
        joinDate: employee.joinedAt,
        employmentType: "full_time",
        salary: breakdownFor(employee.salary),
        status: employee.status,
      })
      .onConflictDoUpdate({
        target: employees.id,
        set: {
          name: employee.name,
          email: employee.email,
          status: employee.status,
          department: employee.department,
          designation: employee.designation,
          address: employee.address,
          salary: breakdownFor(employee.salary),
        },
      });
  }
  console.log(`  ✓ employees (${allEmployees.length})`);

  for (const [index, employee] of allEmployees.entries()) {
    const breakdown = breakdownFor(employee.salary);
    await db
      .insert(salary)
      .values({
        id: `00000000-0000-0000-0000-0000000002${String(index + 1).padStart(2, "0")}`,
        tenantId,
        employeeId: employee.id,
        basic: breakdown.basic,
        hra: breakdown.hra,
        allowances: breakdown.allowances,
        bonus: breakdown.bonus,
        tax: breakdown.tax,
        pension: breakdown.pension,
        insurance: breakdown.insurance,
        gross:
          breakdown.basic +
          breakdown.hra +
          breakdown.allowances +
          breakdown.bonus,
        currency: "USD",
        effectiveFrom: employee.joinedAt,
      })
      .onConflictDoNothing({ target: salary.id });
  }
  console.log(`  ✓ salary  (${allEmployees.length} annual breakdowns)`);

  /* ---- Employee login accounts ---------------------------------------- */
  // Everyone in the roster gets a login: a `users` row + a `member`
  // membership in the primary tenant, linked to their employee record, so
  // the whole demo team can sign in with OTP (the 3 primary users above
  // already have accounts).
  let employeeAccounts = 0;
  for (const employee of allEmployees) {
    if (SEED_USERS.some((user) => user.email === employee.email)) continue;
    const userId = `00000000-0000-0000-0000-0000000009${String(
      90 + employeeAccounts,
    ).padStart(2, "0")}`;
    employeeAccounts += 1;
    await db
      .insert(users)
      .values({
        id: userId,
        email: employee.email,
        name: employee.name,
        status: "active",
        superAdmin: false,
      })
      .onConflictDoNothing({ target: users.id });
    await db
      .insert(userTenants)
      .values({
        userId,
        tenantId,
        role: "member",
        status: "active",
        isPrimary: true,
      })
      .onConflictDoNothing({
        target: [userTenants.userId, userTenants.tenantId],
      });
    await db
      .update(employees)
      .set({ userId })
      .where(eq(employees.id, employee.id));
  }
  console.log(
    `  ✓ employee accounts (${employeeAccounts} members linked to roster)`,
  );

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

  /* ---- Leave balances (2026) ---------------------------------------- */
  for (const balance of BALANCES) {
    await db
      .insert(leaveBalances)
      .values({
        id: balance.id,
        tenantId,
        employeeId: balance.employeeId,
        year: 2026,
        vacationTotal: balance.vacation.total,
        vacationUsed: balance.vacation.used,
        sickTotal: balance.sick.total,
        sickUsed: balance.sick.used,
        personalTotal: balance.personal.total,
        personalUsed: balance.personal.used,
      })
      .onConflictDoNothing({
        target: [leaveBalances.employeeId, leaveBalances.year],
      });
  }
  console.log(`  ✓ leave balances (${BALANCES.length} employees, 2026)`);

  /* ---- Leave requests ------------------------------------------------ */
  for (const leave of SEED_LEAVES) {
    await db
      .insert(leaves)
      .values({
        id: leave.id,
        tenantId,
        employeeId: leave.employeeId,
        type: leave.type,
        startDate: leave.start,
        endDate: leave.end,
        days: leave.days,
        reason: leave.reason,
        status: leave.status,
      })
      .onConflictDoNothing({ target: leaves.id });
  }
  console.log(`  ✓ leave requests (${SEED_LEAVES.length})`);

  /* ---- Attendance (current week, demo pattern) ----------------------- */
  const CHECK_INS = ["08:42", "08:58", "09:07", "09:02"];
  const CHECK_OUTS = ["17:38", "17:52", "18:05", "18:22"];
  const BASE_STATUSES = ["present", "present", "late", "remote"];
  const dates = weekDates();
  let attendanceRows = 0;
  for (const [empIndex, employee] of allEmployees.entries()) {
    for (const [dayIndex, date] of dates.entries()) {
      if (employee.status === "on_leave") {
        await db
          .insert(attendanceRecords)
          .values({
            id: `00000000-0000-0000-0000-0000000005${String(attendanceRows).padStart(2, "0")}`,
            tenantId,
            employeeId: employee.id,
            date,
            checkIn: null,
            checkOut: null,
            hours: null,
            status: "on_leave",
            source: "manual",
          })
          .onConflictDoNothing({
            target: [attendanceRecords.employeeId, attendanceRecords.date],
          });
        attendanceRows += 1;
        continue;
      }
      const idx = (empIndex + dayIndex) % CHECK_INS.length;
      const checkIn = CHECK_INS[idx];
      const checkOut = CHECK_OUTS[idx];
      await db
        .insert(attendanceRecords)
        .values({
          id: `00000000-0000-0000-0000-0000000005${String(attendanceRows).padStart(2, "0")}`,
          tenantId,
          employeeId: employee.id,
          date,
          checkIn,
          checkOut,
          hours: timeToHours(checkIn, checkOut),
          status: BASE_STATUSES[idx],
          source: "device",
        })
        .onConflictDoNothing({
          target: [attendanceRecords.employeeId, attendanceRecords.date],
        });
      attendanceRows += 1;
    }
  }
  console.log(
    `  ✓ attendance (${dates.length} days × ${allEmployees.length} employees)`,
  );

  /* ---- Performance ---------------------------------------------------- */
  await db
    .insert(performanceTemplates)
    .values([
      {
        id: TEMPLATE_STANDARD,
        tenantId,
        name: "Standard review",
        description:
          "Default review used for most roles — achievements and growth.",
        active: true,
        sections: [
          {
            name: "Achievements",
            questions: [
              "What went well this period?",
              "Which goals were met or exceeded?",
            ],
          },
          {
            name: "Growth areas",
            questions: [
              "Where should focus go next?",
              "What support is needed to get there?",
            ],
          },
        ],
      },
      {
        id: TEMPLATE_ENGINEERING,
        tenantId,
        name: "Engineering deep-dive",
        description: "Technical depth, delivery and mentorship for engineers.",
        active: true,
        sections: [
          {
            name: "Delivery",
            questions: [
              "How did project delivery go this period?",
              "Was any technical debt introduced or paid down?",
            ],
          },
          {
            name: "Craft & mentorship",
            questions: [
              "Code quality and architecture decisions",
              "Impact on the team through mentoring and review",
            ],
          },
        ],
      },
      {
        id: TEMPLATE_MANAGER,
        tenantId,
        name: "Manager 360",
        description:
          "Feedback for people managers — team, peers and leadership.",
        active: false,
        sections: [
          {
            name: "Team & culture",
            questions: [
              "Team health, hiring and retention",
              "Quality of 1:1s and coaching",
            ],
          },
        ],
      },
    ])
    .onConflictDoNothing({ target: performanceTemplates.id });
  console.log("  ✓ performance templates (3)");

  await db
    .insert(reviewCycles)
    .values({
      id: CYCLE_Q3,
      tenantId,
      name: "Q3 2026",
      period: "quarterly",
      status: "open",
    })
    .onConflictDoNothing({ target: reviewCycles.id });

  await db
    .insert(reviews)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000611",
        tenantId,
        cycleId: CYCLE_Q3,
        employeeId: "00000000-0000-0000-0000-000000000104", // David Chen
        reviewerId: hrUserId,
        reviewerName: "Priya Sharma",
        templateId: TEMPLATE_STANDARD,
        deadline: "2026-08-20",
        deadlineExtended: 1,
        selfRating: 4,
        managerRating: 5,
        overall: 4.5,
        status: "submitted",
        strengths:
          "Deep technical leadership on the API migration; excellent code review culture.",
        growth: "Delegate more; take ownership of cross-team roadmaps.",
        submittedAt: new Date("2026-08-18T10:00:00.000Z"),
      },
      {
        id: "00000000-0000-0000-0000-000000000612",
        tenantId,
        cycleId: CYCLE_Q3,
        employeeId: "00000000-0000-0000-0000-000000000102", // Marco Rossi
        reviewerId: adminUserId,
        reviewerName: "Ada Admin",
        templateId: TEMPLATE_STANDARD,
        deadline: "2026-08-28",
        deadlineExtended: 0,
        selfRating: 4,
        managerRating: 4,
        overall: 4,
        status: "draft",
        strengths:
          "Consistently high design quality and strong user research instincts.",
        growth:
          "Mentor mid-level designers; contribute to the design system roadmap.",
      },
      {
        id: "00000000-0000-0000-0000-000000000613",
        tenantId,
        cycleId: CYCLE_Q3,
        employeeId: "00000000-0000-0000-0000-000000000107", // Elena Petrova
        reviewerId: hrUserId,
        reviewerName: "Priya Sharma",
        templateId: TEMPLATE_ENGINEERING,
        deadline: "2026-08-19",
        deadlineExtended: 0,
        selfRating: 3,
        managerRating: 4,
        overall: 3.5,
        status: "submitted",
        strengths:
          "Great model experimentation cadence and clear documentation.",
        growth: "Present findings to non-technical stakeholders more often.",
        submittedAt: new Date("2026-08-17T14:00:00.000Z"),
      },
    ])
    .onConflictDoNothing({ target: reviews.id });
  console.log("  ✓ performance cycle + reviews (Q3 2026, 3 reviews)");

  /* ---- Email settings -------------------------------------------------- */
  await db
    .insert(emailSettings)
    .values({
      id: "00000000-0000-0000-0000-000000000620",
      tenantId,
      provider: "console",
      credentials: {},
      senderName: "Gente HR",
      senderEmail: "noreply@gente.dev",
      replyTo: null,
      tracking: false,
      batchLimit: 200,
    })
    .onConflictDoNothing({ target: emailSettings.tenantId });
  console.log("  ✓ email settings (console provider)");

  /* ---- ATS: jobs + applications (Agent.md §2) --------------------------- */
  const JOB_DESIGNER = "00000000-0000-0000-0000-000000000721";
  const JOB_ENGINEER = "00000000-0000-0000-0000-000000000722";
  const JOB_BRAND = "00000000-0000-0000-0000-000000000723";
  const JOB_ACCOUNT = "00000000-0000-0000-0000-000000000724";
  await db
    .insert(jobs)
    .values([
      {
        id: JOB_DESIGNER,
        tenantId,
        title: "Senior Product Designer",
        department: "Design",
        location: "London, UK",
        employmentType: "full_time",
        salaryMin: 90000,
        salaryMax: 120000,
        description:
          "Own end-to-end product design across the platform — research, UX, UI and design systems.",
        status: "open",
      },
      {
        id: JOB_ENGINEER,
        tenantId,
        title: "Staff Engineer",
        department: "Engineering",
        location: "Singapore",
        employmentType: "full_time",
        salaryMin: 150000,
        salaryMax: 190000,
        description:
          "Technical leadership on our core platform — architecture, delivery and mentorship.",
        status: "open",
      },
      {
        id: JOB_BRAND,
        tenantId,
        title: "Brand Designer",
        department: "Design",
        location: "Tokyo, Japan",
        employmentType: "full_time",
        salaryMin: 80000,
        salaryMax: 110000,
        description: "Shape the brand across marketing, product and events.",
        status: "draft",
      },
      {
        id: JOB_ACCOUNT,
        tenantId,
        title: "Account Executive",
        department: "Sales",
        location: "New York, US",
        employmentType: "full_time",
        salaryMin: 70000,
        salaryMax: 95000,
        description: "Own enterprise accounts from pipeline to close.",
        status: "closed",
      },
    ])
    .onConflictDoNothing({ target: jobs.id });

  const APP_ZAINAB = "00000000-0000-0000-0000-000000000731";
  const APP_OLIVER = "00000000-0000-0000-0000-000000000732";
  const APP_MEI = "00000000-0000-0000-0000-000000000733";
  const APP_RAVI = "00000000-0000-0000-0000-000000000734";
  const APP_JAMES = "00000000-0000-0000-0000-000000000735";
  const APP_DIANA = "00000000-0000-0000-0000-000000000736";
  await db
    .insert(applications)
    .values([
      {
        id: APP_ZAINAB,
        tenantId,
        jobId: JOB_DESIGNER,
        name: "Zainab Adeyemi",
        email: "zainab.adeyemi@example.com",
        phone: "+234 803 111 2233",
        resumeUrl: "https://example.com/resumes/zainab-adeyemi.pdf",
        coverLetter:
          "Product designer with 6 years across fintech and health — portfolio attached.",
        stage: "new",
      },
      {
        id: APP_OLIVER,
        tenantId,
        jobId: JOB_DESIGNER,
        name: "Oliver Bennett",
        email: "oliver.bennett@example.com",
        phone: "+44 20 7946 0444",
        resumeUrl: null,
        coverLetter: null,
        stage: "screening",
      },
      {
        id: APP_MEI,
        tenantId,
        jobId: JOB_DESIGNER,
        name: "Mei Lin",
        email: "mei.lin@example.com",
        phone: "+65 8111 2233",
        resumeUrl: "https://example.com/resumes/mei-lin.pdf",
        coverLetter:
          "I've followed the design system work closely — would love to contribute.",
        stage: "interview",
      },
      {
        id: APP_RAVI,
        tenantId,
        jobId: JOB_ENGINEER,
        name: "Ravi Patel",
        email: "ravi.patel@example.com",
        phone: "+91 98 0000 1122",
        resumeUrl: "https://example.com/resumes/ravi-patel.pdf",
        coverLetter: null,
        stage: "offer",
      },
      {
        id: APP_JAMES,
        tenantId,
        jobId: JOB_ENGINEER,
        name: "James O'Brien",
        email: "james.obrien@gente.dev",
        phone: "+353 1 234 5566",
        resumeUrl: null,
        coverLetter: null,
        stage: "hired",
        // Hired → links to the employee created by the hand-off (see onboarding).
        employeeId: "00000000-0000-0000-0000-000000000108",
      },
      {
        id: APP_DIANA,
        tenantId,
        jobId: JOB_ENGINEER,
        name: "Diana Prince",
        email: "diana.prince@example.com",
        phone: "+1 212 555 0177",
        resumeUrl: null,
        coverLetter: null,
        stage: "rejected",
      },
    ])
    // Re-seeding resets the pipeline state so e2e runs stay deterministic.
    .onConflictDoUpdate({
      target: applications.id,
      set: {
        stage: sql`excluded.stage`,
        notes: sql`excluded.notes`,
        employeeId: sql`excluded.employee_id`,
        updatedAt: new Date(),
      },
    });

  // Stage history (new → screening → interview → offer → hired/rejected).
  await db
    .insert(applicationStages)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000741",
        tenantId,
        applicationId: APP_OLIVER,
        fromStage: "new",
        toStage: "screening",
        note: "Strong portfolio — shortlisted.",
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000742",
        tenantId,
        applicationId: APP_MEI,
        fromStage: "new",
        toStage: "screening",
        note: "Referred by the design team.",
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000743",
        tenantId,
        applicationId: APP_MEI,
        fromStage: "screening",
        toStage: "interview",
        note: "Passed screening — schedule round 1.",
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000744",
        tenantId,
        applicationId: APP_RAVI,
        fromStage: "new",
        toStage: "screening",
        note: "Top candidate.",
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000745",
        tenantId,
        applicationId: APP_RAVI,
        fromStage: "screening",
        toStage: "interview",
        note: null,
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000746",
        tenantId,
        applicationId: APP_RAVI,
        fromStage: "interview",
        toStage: "offer",
        note: "Offer sent with agreed terms.",
        actorName: "Ada Admin",
      },
      {
        id: "00000000-0000-0000-0000-000000000747",
        tenantId,
        applicationId: APP_JAMES,
        fromStage: "new",
        toStage: "screening",
        note: "Internal referral.",
        actorName: "Ada Admin",
      },
      {
        id: "00000000-0000-0000-0000-000000000748",
        tenantId,
        applicationId: APP_JAMES,
        fromStage: "screening",
        toStage: "interview",
        note: null,
        actorName: "Ada Admin",
      },
      {
        id: "00000000-0000-0000-0000-000000000749",
        tenantId,
        applicationId: APP_JAMES,
        fromStage: "interview",
        toStage: "offer",
        note: "Offer accepted.",
        actorName: "Ada Admin",
      },
      {
        id: "00000000-0000-0000-0000-000000000750",
        tenantId,
        applicationId: APP_JAMES,
        fromStage: "offer",
        toStage: "hired",
        note: "Hired — handed off to onboarding.",
        actorName: "Ada Admin",
      },
      {
        id: "00000000-0000-0000-0000-000000000751",
        tenantId,
        applicationId: APP_DIANA,
        fromStage: "new",
        toStage: "screening",
        note: "Screened by the team.",
        actorName: "Priya Sharma",
      },
      {
        id: "00000000-0000-0000-0000-000000000752",
        tenantId,
        applicationId: APP_DIANA,
        fromStage: "screening",
        toStage: "rejected",
        note: "Not aligned on scope.",
        actorName: "Priya Sharma",
      },
    ])
    .onConflictDoNothing({ target: applicationStages.id });

  await db
    .insert(interviews)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000753",
        tenantId,
        applicationId: APP_MEI,
        round: 1,
        scheduledAt: new Date("2026-08-25T14:00:00.000Z"),
        interviewer: "Priya Sharma",
        feedback: null,
        status: "scheduled",
      },
      {
        id: "00000000-0000-0000-0000-000000000754",
        tenantId,
        applicationId: APP_JAMES,
        round: 1,
        scheduledAt: new Date("2026-07-20T13:00:00.000Z"),
        interviewer: "Ada Admin",
        feedback: "Strong systems thinking and clear communication.",
        status: "completed",
      },
      {
        id: "00000000-0000-0000-0000-000000000755",
        tenantId,
        applicationId: APP_JAMES,
        round: 2,
        scheduledAt: new Date("2026-07-22T15:00:00.000Z"),
        interviewer: "David Chen",
        feedback: "Great technical depth — recommend hire.",
        status: "completed",
      },
    ])
    .onConflictDoNothing({ target: interviews.id });

  await db
    .insert(offers)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000761",
        tenantId,
        applicationId: APP_RAVI,
        salary: 165000,
        startDate: "2026-10-01",
        terms: "Annual salary USD 165,000, quarterly bonus, 30 days leave.",
        status: "sent",
      },
      {
        id: "00000000-0000-0000-0000-000000000762",
        tenantId,
        applicationId: APP_JAMES,
        salary: 105000,
        startDate: "2026-07-27",
        terms: "Annual salary USD 105,000, 25 days leave.",
        status: "accepted",
      },
    ])
    .onConflictDoNothing({ target: offers.id });
  console.log(
    "  ✓ ATS (4 jobs, 6 applications, 12 stage changes, 3 interviews, 2 offers)",
  );

  /* ---- Onboarding plans + tasks ---------------------------------------- */
  await db
    .insert(onboardingPlans)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000631",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000108",
        fullName: "James O'Brien",
        email: "james.obrien@gente.dev",
        phone: "+44 20 7946 0132",
        address: "14 Camden High Street",
        state: "Greater London",
        country: "United Kingdom",
        signedOfferLetter: "signed_offer_james.pdf",
        startDate: "2026-07-27",
        targetDate: "2026-09-01",
        status: "in_progress",
      },
      {
        id: "00000000-0000-0000-0000-000000000632",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000112",
        fullName: "Aisha Bello",
        email: "aisha.bello@gente.dev",
        phone: "+234 803 555 0190",
        address: "27B Adeola Odeku Street",
        state: "Lagos",
        country: "Nigeria",
        signedOfferLetter: null,
        startDate: "2026-08-03",
        targetDate: "2026-08-31",
        status: "in_progress",
      },
      {
        id: "00000000-0000-0000-0000-000000000633",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000102",
        fullName: "Marco Rossi",
        email: "marco.rossi@gente.dev",
        phone: "+39 02 5550 3210",
        address: "Via Roma 42",
        state: "Lombardy",
        country: "Italy",
        signedOfferLetter: "signed_offer_marco.pdf",
        startDate: "2026-04-06",
        targetDate: "2026-04-30",
        status: "completed",
      },
    ])
    .onConflictDoNothing({ target: onboardingPlans.id });

  const STANDARD_TASKS = [
    { name: "ID card issuance", department: "Admin" },
    { name: "Laptop & equipment allocation", department: "IT" },
    { name: "Email & system account creation", department: "IT" },
    { name: "Workspace assignment", department: "Admin" },
    { name: "Welcome kit delivery", department: "HR" },
    { name: "Policy document acknowledgment", department: "HR" },
    { name: "Orientation session scheduling", department: "HR" },
  ] as const;

  const PLAN_TASKS: Array<{
    planId: string;
    employeeId: string;
    due: string;
    statuses: string[];
  }> = [
    {
      planId: "00000000-0000-0000-0000-000000000631",
      employeeId: "00000000-0000-0000-0000-000000000108",
      due: "2026-09-01",
      statuses: [
        "completed",
        "completed",
        "completed",
        "in_progress",
        "pending",
        "pending",
        "pending",
      ],
    },
    {
      planId: "00000000-0000-0000-0000-000000000632",
      employeeId: "00000000-0000-0000-0000-000000000112",
      due: "2026-08-31",
      statuses: [
        "completed",
        "completed",
        "in_progress",
        "in_progress",
        "pending",
        "pending",
        "pending",
      ],
    },
    {
      planId: "00000000-0000-0000-0000-000000000633",
      employeeId: "00000000-0000-0000-0000-000000000102",
      due: "2026-04-30",
      statuses: [
        "completed",
        "completed",
        "completed",
        "completed",
        "completed",
        "completed",
        "completed",
      ],
    },
  ];

  let taskIndex = 0;
  for (const plan of PLAN_TASKS) {
    for (const [taskPos, task] of STANDARD_TASKS.entries()) {
      const taskId = `00000000-0000-0000-0000-0000000006${String(41 + taskIndex).padStart(2, "0")}`;
      taskIndex += 1;
      await db
        .insert(onboardingTasks)
        .values({
          id: taskId,
          tenantId,
          planId: plan.planId,
          employeeId: plan.employeeId,
          name: task.name,
          department: task.department,
          status: plan.statuses[taskPos] as
            "pending" | "in_progress" | "completed",
          dueDate: plan.due,
          sortOrder: taskPos + 1,
          completedAt:
            plan.statuses[taskPos] === "completed" ? new Date() : null,
        })
        .onConflictDoNothing({ target: onboardingTasks.id });
    }
  }
  console.log("  ✓ onboarding plans (3) + tasks (21)");

  /* ---- Offboarding (Agent.md §4) ---------------------------------------- */
  await db
    .insert(offboardings)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000771",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000106", // Lucas Meyer
        reason: "resignation",
        lastWorkingDay: "2026-09-30",
        status: "in_progress",
        exitInterviewNotes: null,
        notes: "Team announced internally — handover in progress.",
      },
      {
        id: "00000000-0000-0000-0000-000000000772",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000111", // Noah Williams
        reason: "contract_end",
        lastWorkingDay: "2026-08-15",
        status: "completed",
        exitInterviewNotes: "Positive exit — may return for a senior role.",
        notes: "Contract ended after renewal discussion.",
      },
    ])
    .onConflictDoNothing({ target: offboardings.id });

  await db
    .insert(offboardingChecklistItems)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000775",
        offboardingId: "00000000-0000-0000-0000-000000000771",
        name: "Company laptop return",
        done: true,
        sortOrder: 1,
      },
      {
        id: "00000000-0000-0000-0000-000000000776",
        offboardingId: "00000000-0000-0000-0000-000000000771",
        name: "Access & credentials revocation",
        done: true,
        sortOrder: 2,
      },
      {
        id: "00000000-0000-0000-0000-000000000777",
        offboardingId: "00000000-0000-0000-0000-000000000771",
        name: "Exit interview",
        done: false,
        sortOrder: 3,
      },
      {
        id: "00000000-0000-0000-0000-000000000778",
        offboardingId: "00000000-0000-0000-0000-000000000771",
        name: "Final settlement",
        done: false,
        sortOrder: 4,
      },
      {
        id: "00000000-0000-0000-0000-000000000779",
        offboardingId: "00000000-0000-0000-0000-000000000772",
        name: "Company laptop return",
        done: true,
        sortOrder: 1,
      },
      {
        id: "00000000-0000-0000-0000-000000000780",
        offboardingId: "00000000-0000-0000-0000-000000000772",
        name: "Access & credentials revocation",
        done: true,
        sortOrder: 2,
      },
      {
        id: "00000000-0000-0000-0000-000000000781",
        offboardingId: "00000000-0000-0000-0000-000000000772",
        name: "Exit interview",
        done: true,
        sortOrder: 3,
      },
    ])
    .onConflictDoNothing({ target: offboardingChecklistItems.id });
  console.log("  ✓ offboarding (2 exits + 7 checklist items)");

  /* ---- Employee documents + files ---------------------------------------- */
  await db
    .insert(files)
    .values({
      id: "00000000-0000-0000-0000-000000000783",
      tenantId,
      uploadedBy: adminUserId,
      name: "employment-contract.pdf",
      mime: "application/pdf",
      size: 24576,
      kind: "document",
      data: Buffer.from("demo employment contract").toString("base64"),
    })
    .onConflictDoNothing({ target: files.id });

  await db
    .insert(employeeDocuments)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000784",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000101", // Priya Sharma
        name: "Employment contract",
        category: "contract",
        status: "verified",
        fileUrl: "/api/files/00000000-0000-0000-0000-000000000783",
        uploadedAt: new Date("2026-01-12T10:00:00.000Z"),
      },
      {
        id: "00000000-0000-0000-0000-000000000785",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000108", // James O'Brien
        name: "Signed offer letter",
        category: "contract",
        status: "pending",
        fileUrl: null,
        uploadedAt: new Date("2026-07-25T09:30:00.000Z"),
      },
    ])
    .onConflictDoNothing({ target: employeeDocuments.id });
  console.log("  ✓ employee documents (2) + file (1)");

  /* ---- Notifications (admin inbox) -------------------------------------- */
  const NOTIFS: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    href: string | null;
    read: boolean;
    time: string;
  }> = [
    {
      id: "00000000-0000-0000-0000-000000000701",
      type: "leave",
      title: "New leave request",
      body: "Noah Williams requested 5 days of vacation from Aug 24.",
      href: "/leave/00000000-0000-0000-0000-000000000401",
      read: false,
      time: "2026-08-19T08:32:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000702",
      type: "loan",
      title: "Loan approved",
      body: "Marco Rossi's personal loan of $5,000 was approved.",
      href: "/payroll/loans/00000000-0000-0000-0000-000000000851",
      read: false,
      time: "2026-08-19T07:45:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000703",
      type: "payroll",
      title: "Payslips ready",
      body: "August 2026 payslips are ready.",
      href: "/payroll/payslips",
      read: false,
      time: "2026-08-19T07:00:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000704",
      type: "performance",
      title: "Review reminder",
      body: "Q3 reviews are open — drafts waiting for manager input.",
      href: "/performance",
      read: true,
      time: "2026-08-18T16:20:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000705",
      type: "onboarding",
      title: "Onboarding task assigned",
      body: "IT: laptop allocation for Aisha Bello is due Aug 28.",
      href: "/onboarding/00000000-0000-0000-0000-000000000632",
      read: true,
      time: "2026-08-18T09:10:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000706",
      type: "system",
      title: "Sign-in from new device",
      body: "A new session started from London, UK.",
      href: null,
      read: true,
      time: "2026-08-17T11:05:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000707",
      type: "leave",
      title: "Leave approved",
      body: "Sofia Andersson's parental leave was approved.",
      href: "/leave/00000000-0000-0000-0000-000000000403",
      read: true,
      time: "2026-08-15T14:00:00.000Z",
    },
    {
      id: "00000000-0000-0000-0000-000000000708",
      type: "payroll",
      title: "Payroll drafted",
      body: "August payroll run was drafted — review before processing.",
      href: `/payroll/${payrollRunId}`,
      read: true,
      time: "2026-08-14T17:30:00.000Z",
    },
  ];
  for (const notification of NOTIFS) {
    await db
      .insert(notifications)
      .values({
        id: notification.id,
        tenantId,
        userId: adminUserId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        read: notification.read,
        createdAt: new Date(notification.time),
      })
      .onConflictDoNothing({ target: notifications.id });
  }
  console.log(`  ✓ notifications (${NOTIFS.length})`);

  /* ---- Payroll run + entries + payslips -------------------------------- */
  // Monthly amounts derive from each employee's annual salary breakdown, so
  // payslips mirror the breakdown components (earnings + deductions).
  const marcoLoanEmi = computeEmi(5000, 8.5, 12);
  const entries: Array<{
    id: string;
    employeeId: string;
    basic: number;
    hra: number;
    allowances: number;
    bonus: number;
    tax: number;
    pension: number;
    insurance: number;
    loanEmi: number;
    gross: number;
    deductions: number;
    net: number;
  }> = [];
  for (const [index, employee] of allEmployees.entries()) {
    const annual = breakdownFor(employee.salary);
    const basic = Math.round(annual.basic / 12);
    const hra = Math.round(annual.hra / 12);
    const allowances = Math.round(annual.allowances / 12);
    const bonus = Math.round(annual.bonus / 12);
    const tax = Math.round(annual.tax / 12);
    const pension = Math.round(annual.pension / 12);
    const insurance = Math.round(annual.insurance / 12);
    const loanEmi =
      employee.id === "00000000-0000-0000-0000-000000000102" // Marco Rossi
        ? marcoLoanEmi
        : 0;
    const gross = basic + hra + allowances + bonus;
    const deductions = tax + pension + insurance + loanEmi;
    entries.push({
      id: `00000000-0000-0000-0000-0000000008${String(11 + index).padStart(2, "0")}`,
      employeeId: employee.id,
      basic,
      hra,
      allowances,
      bonus,
      tax,
      pension,
      insurance,
      loanEmi,
      gross,
      deductions,
      net: gross - deductions,
    });
  }
  const runTotal = entries.reduce((sum, entry) => sum + entry.net, 0);

  await db
    .insert(payrollRuns)
    .values({
      id: payrollRunId,
      tenantId,
      period: PAYROLL_PERIOD,
      processedAt: new Date("2026-08-31T09:00:00.000Z"),
      total: runTotal,
      employees: entries.length,
      status: "completed",
    })
    .onConflictDoNothing({ target: payrollRuns.id });

  for (const entry of entries) {
    await db
      .insert(payrollEntries)
      .values({
        id: entry.id,
        tenantId,
        runId: payrollRunId,
        employeeId: entry.employeeId,
        gross: entry.gross,
        deductions: entry.deductions,
        net: entry.net,
        status: "paid",
      })
      .onConflictDoNothing({ target: payrollEntries.id });

    await db
      .insert(payslips)
      .values({
        id: `00000000-0000-0000-0000-0000000008${String(31 + entries.indexOf(entry)).padStart(2, "0")}`,
        tenantId,
        employeeId: entry.employeeId,
        period: PAYROLL_PERIOD,
        basic: entry.basic,
        hra: entry.hra,
        allowances: entry.allowances,
        bonus: entry.bonus,
        tax: entry.tax,
        pension: entry.pension,
        insurance: entry.insurance,
        loanEmi: entry.loanEmi,
        gross: entry.gross,
        net: entry.net,
        status: "paid",
        generatedAt: new Date("2026-08-31T09:00:00.000Z"),
      })
      .onConflictDoNothing({ target: [payslips.employeeId, payslips.period] });
  }
  console.log(
    `  ✓ payroll (${PAYROLL_PERIOD} run: ${entries.length} entries + payslips, total ${runTotal})`,
  );

  /* ---- Loans ------------------------------------------------------------ */
  await db
    .insert(loans)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000851",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000102", // Marco Rossi
        type: "personal",
        amount: 5000,
        interestRate: 8.5,
        termMonths: 12,
        monthlyEmi: computeEmi(5000, 8.5, 12),
        disbursedAt: "2026-07-01",
        paidMonths: 1,
        status: "active",
      },
      {
        id: "00000000-0000-0000-0000-000000000852",
        tenantId,
        employeeId: "00000000-0000-0000-0000-000000000112", // Aisha Bello
        type: "advance",
        amount: 2000,
        interestRate: 0,
        termMonths: 6,
        monthlyEmi: computeEmi(2000, 0, 6),
        disbursedAt: null,
        paidMonths: 0,
        status: "pending",
      },
    ])
    .onConflictDoNothing({ target: loans.id });
  console.log("  ✓ loans (2)");

  /* ---- Audit + email logs ------------------------------------------------ */
  await db
    .insert(auditLogs)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000861",
        tenantId,
        userId: adminUserId,
        actorName: "Ada Admin",
        action: "leave.approve",
        target: "Sofia Andersson — parental leave",
        category: "leave",
        createdAt: new Date("2026-08-15T14:00:00.000Z"),
      },
      {
        id: "00000000-0000-0000-0000-000000000862",
        tenantId,
        userId: adminUserId,
        actorName: "Ada Admin",
        action: "payroll.run",
        target: "August 2026",
        category: "payroll",
        createdAt: new Date("2026-08-31T09:00:00.000Z"),
      },
    ])
    .onConflictDoNothing({ target: auditLogs.id });

  await db
    .insert(emailLogs)
    .values([
      {
        id: "00000000-0000-0000-0000-000000000871",
        tenantId,
        recipient: "admin@gente.dev",
        templateKey: "welcome",
        provider: "console",
        status: "sent",
        createdAt: new Date("2026-08-01T09:00:00.000Z"),
      },
      {
        id: "00000000-0000-0000-0000-000000000872",
        tenantId,
        recipient: "marco.rossi@gente.dev",
        templateKey: "payslip",
        provider: "console",
        status: "sent",
        createdAt: new Date("2026-08-31T09:05:00.000Z"),
      },
    ])
    .onConflictDoNothing({ target: emailLogs.id });
  console.log("  ✓ audit + email logs");

  await pool.end();
  console.log("Done. Sign in with OTP at /login using any seeded email.");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
