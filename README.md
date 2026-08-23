# Gente HR — Multi-Tenant HR Platform

A full-stack, minimalist HR tool for companies, built as a single Next.js
project. Covers the complete employee lifecycle — recruiting (ATS), onboarding,
the employee record, payroll, performance and offboarding — plus leave,
attendance, reports, notifications and full company settings with multi-tenant
isolation (see the [product spec](./Agent.md) for the detailed feature list and
[API.md](./API.md) for every endpoint).

## Features

### Recruitment & hiring (ATS)

- **Jobs** — create/edit postings (title, department, location, employment
  type, salary range); status `draft → open → closed`; application counts
- **Public apply page** — `/apply/[jobId]` lets candidates apply to open jobs
  (name, email, phone, resume link, cover letter); one application per email
- **Pipeline board** — kanban across `New → Screening → Interview → Offer →
Hired/Rejected`, filterable by job
- **Screening & interviews** — forward stage moves with recruiter notes, stage
  history timeline, interview rounds with feedback
- **Offers & hiring** — record offer terms (salary, start date); **Hire**
  hands the candidate off to onboarding (creates the employee + onboarding
  plan); reject with a reason

### Employees

- Directory with search, filters (department/status) and CSV export
- Profile pages: contact, manager, documents, leave history, attendance,
  leave balance, payslips
- **Salary breakdown** — earnings/deductions stored as JSON on the employee,
  driven by the configurable payslip breakdown (Settings → Payroll); HR/admin
  set per-component annual amounts (basic, HRA, transport allowance, bonus,
  tax, pension, insurance) with a live gross total
- Documents per employee (contracts, ID, bank details)

### Payroll

- **Salary structures** with annual breakdown per component
- **Payroll runs** — preview, run and review monthly payroll
- **Payslips** — per-employee monthly breakdown (earnings/deductions),
  period + date-range filtering, YTD gross, **branded PDF download** (tenant
  logo + name)
- **Loans** — requests, EMI schedules, approval → active → paid tracking

### People operations

- **Onboarding** — new-hire plans with HR/IT/Admin task checklists; invite →
  employee self-service completion; hired ATS applications arrive here
- **Offboarding** — exit processes, reasons, checklist items, exit notes
- **Leave** — requests with approval workflow, balances per type/year,
  team calendar with conflict flags
- **Attendance** — daily check-in, weekly trend, department breakdown,
  remote/late/leave/absent summary
- **Performance** — review cycles, templates (sections + questions), self/
  manager ratings, strengths & growth feedback

### Platform

- **Multi-tenancy** — companies isolated per tenant; super-admin can manage
  every organization; org switcher in the header
- **Passwordless auth** — OTP (email provider or console in dev), stateless
  signed session cookie
- **Reports & dashboards** — workforce analytics per role (admin/HR/staff)
- **Notifications** — in-app center (leave, payroll, onboarding, loans,
  performance, system)
- **Settings** — company profile (name, website, about, support email,
  **language** English/French/Portuguese/Spanish, timezone, currency, office
  days, employee-ID prefix), branding & theme, users, departments, employee
  form-field config, payslip breakdown config, audit logs, email provider
- **Branding & themes** — 8 predefined themes, custom palette editor with
  WCAG contrast checks, light/dark/system modes, logo/favicon

## Stack

- **Next.js 15** (App Router, RSC + Route Handlers) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** — every color utility maps to CSS custom properties, so themes swap at runtime without re-rendering
- **Drizzle ORM** + **Postgres 16** — multi-tenant schema with migrations
- **Playwright** — end-to-end tests against the seeded dataset
- **lucide-react** icons · zero other UI dependencies (components are hand-rolled, shadcn-style)

## Quick start

```bash
pnpm install
docker compose up -d          # Postgres 16 → localhost:5432/gente
pnpm db:migrate && pnpm db:seed   # apply schema + seed demo tenants/data
pnpm dev                      # → http://localhost:3000
```

The seeder is idempotent and creates two companies (Acme Inc. + Globex Corp.),
admin/HR/staff accounts, and demo data for every module (employees + salary
breakdowns, ATS jobs/applications, onboarding/offboarding, leave, attendance,
performance, payroll, loans, notifications). Sign in with OTP at `/login`
using any seeded email (e.g. `admin@gente.dev`) — codes print to the server
console in development.

| URL                                                                                                                                                                                                                   | Purpose                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `/login`                                                                                                                                                                                                              | Passwordless sign-in (OTP via email provider or console in dev)                     |
| `/`                                                                                                                                                                                                                   | Overview dashboard (stats, attendance, quick actions, recent employees)             |
| `/employees` · `/employees/[id]` · `/employees/[id]/edit`                                                                                                                                                             | Directory (search/filter/export) + profile + HR/admin edit (incl. salary breakdown) |
| `/ats` · `/ats/jobs` · `/ats/jobs/new` · `/ats/jobs/[id]` · `/ats/jobs/[id]/edit`                                                                                                                                     | Jobs: list, create, detail with applications                                        |
| `/ats/applications` · `/ats/applications/[id]`                                                                                                                                                                        | Pipeline board + application detail (stage moves, interviews, offers, hire/reject)  |
| `/apply/[jobId]`                                                                                                                                                                                                      | **Public** application form (no sign-in required)                                   |
| `/attendance`                                                                                                                                                                                                         | Daily attendance, weekly trend, department breakdown                                |
| `/leave` · `/leave/[id]`                                                                                                                                                                                              | Approvals, requests, balances, team calendar + request details                      |
| `/payroll` · `/payroll/[id]`                                                                                                                                                                                          | Payroll overview, run history + run detail                                          |
| `/payroll/payslips` · `/payroll/payslips/[id]`                                                                                                                                                                        | Monthly payslips with earnings/deductions breakdown + PDF download                  |
| `/payroll/loans` · `/payroll/loans/[id]`                                                                                                                                                                              | Employee loans + repayment schedules                                                |
| `/performance` · `/performance/[id]` · `/performance/templates`                                                                                                                                                       | Review cycles, ratings, feedback, templates                                         |
| `/onboarding` · `/onboarding/[id]`                                                                                                                                                                                    | New-hire task checklists (HR/IT/Admin)                                              |
| `/offboarding` · `/offboarding/[id]`                                                                                                                                                                                  | Exit processes, reasons, checklists                                                 |
| `/reports`                                                                                                                                                                                                            | Workforce analytics reports                                                         |
| `/notifications`                                                                                                                                                                                                      | In-app notification center (read/unread)                                            |
| `/settings/general` · `/settings/branding` · `/settings/users` · `/settings/departments` · `/settings/employee-config` · `/settings/payroll` · `/settings/audit-logs` · `/settings/email` · `/settings/notifications` | Company settings (admin-only)                                                       |

## Authentication (passwordless OTP)

**Postgres is required for login** — OTP codes are stored only in the
`otp_codes` table (hashed, 10-minute expiry, 5 attempts max, 60s resend
throttle); there is no in-memory fallback. Start the database first
(`docker compose up -d`), then `pnpm db:migrate && pnpm db:seed`.

1. Go to `/login` and enter your work email.
2. The 6-digit code is delivered via the **email provider** or the **console
   provider**: set `RESEND_API_KEY` for real delivery (no extra dependency),
   otherwise the code is printed to the server console.
3. Verify → the server issues a **stateless signed session cookie**
   (`gente_session`, httpOnly + secure, HMAC-signed with
   `AUTH_SESSION_SECRET`). Sessions are **not stored in the database or
   localStorage** — the cookie is the session
   (`src/lib/server/session-token.ts`).

Signing out simply clears the cookie. The seeder is configurable via `SEED_*`
env vars (see `.env.example`).

## Database & migrations

```bash
cp .env.example .env.local   # set DATABASE_URL
pnpm db:generate             # schema → SQL migration (db/migrations)
pnpm db:migrate              # apply migrations
pnpm db:seed                 # seed demo tenants + full demo dataset
```

The schema (`db/schema.ts`, single fresh migration `db/migrations/0000_*.sql`)
covers every module: multi-tenancy (`tenants`, `users`, `user_tenants`),
passwordless auth (`otp_codes`), employees + documents + salary breakdown,
ATS (`jobs`, `applications`, `application_stages`, `interviews`, `offers`),
departments, onboarding/offboarding, leave + balances, attendance, performance
(templates/cycles/reviews), payroll (salary, loans, runs, entries, payslips),
notifications, audit logs, files and email config/logs.

Theming persists to Postgres when `DATABASE_URL` is set (`tenants.theme_config`,
`user_preferences`); if the DB is unreachable the theme store falls back to an
in-memory copy for the rest of the process so the UI stays functional. All
other stores (auth, tenants) are Postgres-only.

## How the theming works

1. **Server render** — the root layout reads the tenant theme + user mode from
   the store and embeds the resolved palette in the HTML.
2. **Bootstrap script** (`ThemeScript`) — runs before first paint: sets every
   `--*` CSS variable on `<html>`, toggles the `.dark` class, sets
   `data-theme`/`data-mode`, caches to localStorage. **Zero FOUC.**
3. **ThemeProvider** (client) — re-applies variables on any change, watches
   `prefers-color-scheme`, and persists changes through the API routes
   (optimistically, rolling back on failure).
4. **Mode resolution** — explicit user preference → company default mode →
   OS setting (`resolveEffectiveMode` in `src/lib/theme-config.ts`).

The 8 predefined palettes live in `src/lib/themes.ts` (light + dark values for
all 17 variables). The custom theme editor validates hex input, normalizes
`#rgb` → `#rrggbb`, runs an automated WCAG 2.1 contrast check (AA = 4.5:1) for
every critical color pair, and supports export/import of themes as JSON.

## Testing

```bash
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit
pnpm test:e2e          # Playwright — resets the DB, boots the dev server
pnpm test:e2e:ui       # interactive Playwright UI runner
```

The e2e suite (27 tests in `e2e/`) walks every feature area — settings (incl.
the language dropdown), employees + salary breakdown, the ATS pipeline
(jobs → applications → stage moves), onboarding/offboarding/leave/attendance,
payroll (payslips + PDF), performance, reports and notifications — against the
seeded demo data. The global setup drops and rebuilds the schema, so each run
is deterministic.

## Scripts

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm db:generate  # drizzle-kit generate (schema → SQL migration)
pnpm db:migrate   # apply migrations
pnpm db:push      # push schema directly (dev)
pnpm db:seed      # seed demo tenants + dataset
pnpm db:studio    # drizzle studio
pnpm test:e2e     # Playwright end-to-end tests
```

## Notes & future work

- Logo/favicon uploads store a data URL (capped at 512KB). For production,
  upload to blob/CDN storage and persist the URL — the `TenantTheme` shape
  already supports it.
- Phase 2/3 ideas from the spec (fonts, spacing, seasonal themes, A/B testing)
  are listed in `Agent.md` and are intentionally not implemented.
