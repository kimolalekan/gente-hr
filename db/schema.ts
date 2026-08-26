import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import type { TenantTheme, ThemeMode } from "../src/lib/theme-config";

/**
 * Full Gente HR schema — every tenant-scoped table carries `tenant_id` so
 * PostgreSQL Row-Level Security (or application-level filtering) can enforce
 * tenant isolation. See Agent.md §17 (database schema) and §28 (decisions).
 *
 * NOTE: Money is stored as whole currency units (integers) for simplicity.
 */

/* ------------------------------------------------------------------ */
/* Tenants & multi-tenancy                                             */
/* ------------------------------------------------------------------ */

/** Companies. Branding lives in `theme_config` (Agent.md §28, Decision 4). */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logo: text("logo"),
  address: text("address"),
  timezone: text("timezone").notNull().default("UTC"),
  currency: text("currency").notNull().default("USD"),
  dateFormat: text("date_format").notNull().default("MMM d, yyyy"),
  status: text("status").notNull().default("active"), // active | suspended
  subscriptionTier: text("subscription_tier").notNull().default("growth"), // free | growth | enterprise
  settings: jsonb("settings")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  themeConfig: jsonb("theme_config")
    .$type<TenantTheme>()
    .notNull()
    .default({ themeId: "default", mode: "system" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Accounts. No tenant column here — tenant association and per-tenant role
 * live in `user_tenants` (Agent.md §28, Decision 3), so one person can work
 * across multiple companies with different roles in each.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active | inactive
  superAdmin: boolean("super_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** User ↔ tenant association with a per-tenant role (RBAC: admin | hr | member). */
export const userTenants = pgTable(
  "user_tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // admin | hr | member
    status: text("status").notNull().default("active"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_tenants_user_tenant_uidx").on(
      table.userId,
      table.tenantId,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Authentication                                                      */
/* ------------------------------------------------------------------ */

/**
 * One-time sign-in codes. Only the SHA-256 hash is stored (secure), keyed by
 * both user and email for lookups before the account exists.
 */
export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Per-user color mode preference ("light" | "dark" | "system"). */
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  themeMode: text("theme_mode").$type<ThemeMode>().notNull().default("system"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Employee management                                                 */
/* ------------------------------------------------------------------ */

/** Employee profiles — tenant isolated (Agent.md §1). */
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    employeeId: text("employee_id").notNull(), // e.g. "EMP-013"
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    department: text("department"),
    designation: text("designation"),
    address: jsonb("address").$type<Record<string, unknown>>(),
    managerId: uuid("manager_id").references((): AnyPgColumn => employees.id, {
      onDelete: "set null",
    }),
    joinDate: date("join_date"),
    employmentType: text("employment_type").notNull().default("full_time"), // full_time | part_time | contract | intern
    emergencyContact:
      jsonb("emergency_contact").$type<Record<string, unknown>>(),
    bankDetails: jsonb("bank_details").$type<Record<string, unknown>>(),
    salary: jsonb("salary").$type<Record<string, number> | null>(),
    governmentId: jsonb("government_id").$type<Record<string, unknown>>(),
    healthInsurance: jsonb("health_insurance").$type<Record<string, unknown>>(),
    pension: jsonb("pension").$type<Record<string, unknown>>(),
    taxId: text("tax_id"),
    profilePhoto: text("profile_photo"),
    status: text("status").notNull().default("active"), // active | on_leave | pending
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("employees_tenant_idx").on(table.tenantId)],
);

/** Employee document records (contracts, ID, bank details…). */
export const employeeDocuments = pgTable(
  "employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // contract | identity | finance | contact
    status: text("status").notNull().default("pending"), // verified | pending | expired
    fileUrl: text("file_url"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("employee_documents_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* ATS — Recruitment & Hiring                                          */
/* ------------------------------------------------------------------ */

/** Job postings (Agent.md §2) — multi-tenant, status draft → open → closed. */
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    department: text("department"),
    location: text("location"),
    employmentType: text("employment_type").notNull().default("full_time"), // full_time | part_time | contract | intern
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    description: text("description"),
    /** Screening questions candidates answer when applying. */
    questions: jsonb("questions").$type<string[]>().notNull().default([]),
    /** Optional screening quiz taken during the application. */
    quizId: uuid("quiz_id").references(() => quizzes.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("draft"), // draft | open | closed
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("jobs_tenant_idx").on(table.tenantId)],
);

/** Candidate applications tracked through the pipeline (Agent.md §2). */
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    country: text("country"),
    state: text("state"),
    resumeUrl: text("resume_url"),
    coverLetter: text("cover_letter"),
    stage: text("stage").notNull().default("new"), // new | screening | interview | offer | hired | rejected
    notes: text("notes"),
    /** Answers to the job's screening questions (question → answer). */
    answers: jsonb("answers").$type<Record<string, string>>(),
    /** Quiz result: score, total questions and chosen option indices. */
    quizResult: jsonb("quiz_result").$type<{
      score: number;
      total: number;
      answers: number[];
    } | null>(),
    /** Set when the application is hired — links to the created employee. */
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("applications_job_email_uidx").on(table.jobId, table.email),
    index("applications_tenant_idx").on(table.tenantId),
  ],
);

/** Stage change history + recruiter notes per application. */
export const applicationStages = pgTable(
  "application_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    fromStage: text("from_stage").notNull(),
    toStage: text("to_stage").notNull(),
    note: text("note"),
    actorName: text("actor_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("application_stages_tenant_idx").on(table.tenantId)],
);

/** Interview rounds against a candidate (Agent.md §2). */
export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    round: integer("round").notNull().default(1),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    interviewer: text("interviewer"),
    /** Interviewer panel (employee id + name + email), for invites. */
    panelists: jsonb("panelists")
      .$type<Array<{ id: string; name: string; email: string }>>()
      .notNull()
      .default([]),
    feedback: text("feedback"),
    status: text("status").notNull().default("scheduled"), // scheduled | completed | cancelled
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("interviews_tenant_idx").on(table.tenantId)],
);

/** Offer terms sent to a candidate (Agent.md §2). */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    salary: integer("salary"),
    startDate: date("start_date"),
    terms: text("terms"),
    status: text("status").notNull().default("sent"), // sent | accepted | declined
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("offers_tenant_idx").on(table.tenantId)],
);

/** Screening quizzes assigned to jobs (Agent.md §2 — interviews/screening). */
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    questions: jsonb("questions")
      .$type<
        Array<{ question: string; options: string[]; correctIndex: number }>
      >()
      .notNull()
      .default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("quizzes_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Departments                                                         */
/* ------------------------------------------------------------------ */

/** Company departments — employees reference these by name. */
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("departments_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

/** A new-hire onboarding plan (invite → employee self-service → hired). */
export const onboardingPlans = pgTable(
  "onboarding_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Null until the invite is accepted and an employee record is created. */
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    state: text("state"),
    country: text("country"),
    signedOfferLetter: text("signed_offer_letter"),
    startDate: date("start_date").notNull(),
    targetDate: date("target_date").notNull(),
    status: text("status").notNull().default("invited"), // invited | in_progress | completed
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("onboarding_plans_tenant_idx").on(table.tenantId)],
);

/** Individual onboarding checklist tasks (assigned to HR / IT / Admin). */
export const onboardingTasks = pgTable(
  "onboarding_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => onboardingPlans.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    department: text("department").notNull(), // HR | IT | Admin
    status: text("status").notNull().default("pending"), // pending | in_progress | completed
    dueDate: date("due_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("onboarding_tasks_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Offboarding                                                         */
/* ------------------------------------------------------------------ */

/** Exit processes (Agent.md §4). */
export const offboardings = pgTable(
  "offboardings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(), // resignation | termination | retirement | contract_end
    lastWorkingDay: date("last_working_day").notNull(),
    status: text("status").notNull().default("in_progress"), // in_progress | completed
    exitInterviewNotes: text("exit_interview_notes"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("offboardings_tenant_idx").on(table.tenantId)],
);

/** Offboarding exit checklist items (asset return, access revocation…). */
export const offboardingChecklistItems = pgTable(
  "offboarding_checklist_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offboardingId: uuid("offboarding_id")
      .notNull()
      .references(() => offboardings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    done: boolean("done").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
);

/* ------------------------------------------------------------------ */
/* Leave management                                                    */
/* ------------------------------------------------------------------ */

/** Leave requests with approval workflow (Agent.md §5). */
export const leaves = pgTable(
  "leaves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // vacation | sick | parental | other
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: integer("days").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("pending"), // approved | pending | declined
    decidedBy: uuid("decided_by").references(() => users.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("leaves_tenant_idx").on(table.tenantId)],
);

/** Per-employee annual leave balances (used / remaining). */
export const leaveBalances = pgTable(
  "leave_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    vacationTotal: integer("vacation_total").notNull().default(25),
    vacationUsed: integer("vacation_used").notNull().default(0),
    sickTotal: integer("sick_total").notNull().default(10),
    sickUsed: integer("sick_used").notNull().default(0),
    personalTotal: integer("personal_total").notNull().default(5),
    personalUsed: integer("personal_used").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("leave_balances_employee_year_uidx").on(
      table.employeeId,
      table.year,
    ),
  ],
);

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

/** Daily attendance records (Agent.md §6) — one row per employee per day. */
export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    checkIn: text("check_in"), // "08:58"
    checkOut: text("check_out"),
    hours: numeric("hours", { precision: 4, scale: 2 }).$type<number>(),
    status: text("status").notNull().default("present"), // present | late | remote | on_leave | absent
    location: text("location"),
    source: text("source").notNull().default("device"), // device | manual
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_employee_date_uidx").on(
      table.employeeId,
      table.date,
    ),
    index("attendance_tenant_idx").on(table.tenantId),
  ],
);

/* ------------------------------------------------------------------ */
/* Performance reviews                                                 */
/* ------------------------------------------------------------------ */

/** Review templates — sections and questions (HR/Admin define these). */
export const performanceTemplates = pgTable(
  "performance_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sections: jsonb("sections")
      .$type<Array<{ name: string; questions: string[] }>>()
      .notNull()
      .default([]),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("performance_templates_tenant_idx").on(table.tenantId)],
);

/** Review cycles (quarterly, half-yearly, annual, custom). */
export const reviewCycles = pgTable(
  "review_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    period: text("period").notNull(),
    status: text("status").notNull().default("open"), // open | closed
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("review_cycles_tenant_idx").on(table.tenantId)],
);

/** Performance reviews: self + manager ratings, feedback (Agent.md §7). */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => reviewCycles.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewerName: text("reviewer_name"),
    templateId: text("template_id"),
    deadline: date("deadline"),
    deadlineExtended: integer("deadline_extended").notNull().default(0),
    selfRating: numeric("self_rating", {
      precision: 2,
      scale: 1,
    }).$type<number>(),
    managerRating: numeric("manager_rating", {
      precision: 2,
      scale: 1,
    }).$type<number>(),
    overall: numeric("overall", { precision: 2, scale: 1 }).$type<number>(),
    status: text("status").notNull().default("draft"), // draft | submitted
    strengths: text("strengths"),
    growth: text("growth"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("reviews_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Payroll                                                             */
/* ------------------------------------------------------------------ */

/** Salary structures + revision history (one row per effective period). */
export const salary = pgTable(
  "salary",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    basic: integer("basic").notNull().default(0),
    hra: integer("hra").notNull().default(0),
    allowances: integer("allowances").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    pension: integer("pension").notNull().default(0),
    insurance: integer("insurance").notNull().default(0),
    gross: integer("gross").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    effectiveFrom: date("effective_from").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("salary_tenant_idx").on(table.tenantId)],
);

/** Employee loans: amount, EMI, repayment tracking (Agent.md §8). */
export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // personal | advance | vehicle | other
    amount: integer("amount").notNull(),
    interestRate: numeric("interest_rate", { precision: 4, scale: 2 })
      .$type<number>()
      .notNull()
      .default(0),
    termMonths: integer("term_months").notNull(),
    monthlyEmi: integer("monthly_emi").notNull(),
    disbursedAt: date("disbursed_at"),
    paidMonths: integer("paid_months").notNull().default(0),
    status: text("status").notNull().default("pending"), // pending | approved | active | paid
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("loans_tenant_idx").on(table.tenantId)],
);

/** Monthly payroll runs. */
export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // "August 2026"
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    total: integer("total").notNull().default(0),
    employees: integer("employees").notNull().default(0),
    status: text("status").notNull().default("draft"), // completed | processing | draft
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("payroll_runs_tenant_idx").on(table.tenantId)],
);

/** Per-employee lines inside a payroll run. */
export const payrollEntries = pgTable(
  "payroll_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    gross: integer("gross").notNull().default(0),
    deductions: integer("deductions").notNull().default(0),
    net: integer("net").notNull().default(0),
    status: text("status").notNull().default("pending"), // paid | pending
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("payroll_entries_tenant_idx").on(table.tenantId)],
);

/** Monthly payslips with earnings/deductions breakdown. */
export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    basic: integer("basic").notNull().default(0),
    hra: integer("hra").notNull().default(0),
    allowances: integer("allowances").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    pension: integer("pension").notNull().default(0),
    insurance: integer("insurance").notNull().default(0),
    loanEmi: integer("loan_emi").notNull().default(0),
    gross: integer("gross").notNull().default(0),
    net: integer("net").notNull().default(0),
    status: text("status").notNull().default("pending"), // paid | pending
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payslips_employee_period_uidx").on(
      table.employeeId,
      table.period,
    ),
    index("payslips_tenant_idx").on(table.tenantId),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/** In-app notifications (Agent.md §10). */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // leave | onboarding | payroll | loan | performance | system
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notifications_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Audit logs                                                          */
/* ------------------------------------------------------------------ */

/** Who did what — includes tenant context (Agent.md §13). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    target: text("target"),
    category: text("category").notNull(), // auth | payroll | leave | employee | email | settings
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("audit_logs_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Email service                                                       */
/* ------------------------------------------------------------------ */

/** Per-tenant email provider configuration (Agent.md §12). */
export const emailSettings = pgTable("email_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("console"), // resend | zeptomail | mailgun | brevo | console
  /** Provider credentials keyed by field (apiKey, apiSecret, …). */
  credentials: jsonb("credentials").$type<Record<string, string>>().default({}),
  senderName: text("sender_name").notNull().default("Gente HR"),
  senderEmail: text("sender_email").notNull().default("noreply@gente.dev"),
  replyTo: text("reply_to"),
  tracking: boolean("tracking").notNull().default(false),
  batchLimit: integer("batch_limit").notNull().default(200),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

/** Uploaded files (passport photos, offer letters, documents…). */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    mime: text("mime").notNull().default("application/octet-stream"),
    size: integer("size").notNull().default(0),
    kind: text("kind").notNull().default("document"), // document | photo | letter
    /** Base64/data-URL content — demo storage; production uses object storage. */
    data: text("data"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("files_tenant_idx").on(table.tenantId)],
);

/* ------------------------------------------------------------------ */
/* Inferred types                                                      */
/* ------------------------------------------------------------------ */

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserTenant = typeof userTenants.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationStage = typeof applicationStages.$inferSelect;
export type Interview = typeof interviews.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type OnboardingPlan = typeof onboardingPlans.$inferSelect;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;
export type Offboarding = typeof offboardings.$inferSelect;
export type OffboardingChecklistItem =
  typeof offboardingChecklistItems.$inferSelect;
export type Leave = typeof leaves.$inferSelect;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type ReviewCycle = typeof reviewCycles.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Salary = typeof salary.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type EmailSetting = typeof emailSettings.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type PerformanceTemplate = typeof performanceTemplates.$inferSelect;
