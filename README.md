# Gente HR — Company Branding & Theme Settings

Full-stack implementation of the [branding & theme specification](./Agent.md):
tenant-level theming for the Gente HR platform with 8 predefined color themes,
a custom theme editor with WCAG contrast checking, and light / dark / system
color modes — applied across the entire dashboard. Includes passwordless OTP
authentication (email provider or console in development) and a database
seeder for the default tenant + admin user.

## Stack

- **Next.js 15** (App Router, RSC + Route Handlers) · **React 19** · **TypeScript** (strict)
- **Tailwind CSS v4** — every color utility maps to CSS custom properties, so themes swap at runtime without re-rendering
- **Drizzle ORM** + Postgres (`tenants.theme_config` JSONB, `user_preferences` table)
- **lucide-react** icons · zero other UI dependencies (components are hand-rolled, shadcn-style)

## Quick start

```bash
npm install
npm run dev          # → http://localhost:3000
```

No database required: without `DATABASE_URL` the app uses an in-memory store so
you can try the full flow immediately.

| URL                                                                                       | Purpose                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/login`                                                                                  | Passwordless sign-in (OTP via email provider or console in dev)                                  |
| `/`                                                                                       | Overview dashboard (stats, attendance, quick actions, recent employees)                          |
| `/employees` · `/employees/[id]`                                                          | Employee directory (search/filter) + profile (contact, docs, attendance, leave)                  |
| `/attendance`                                                                             | Daily attendance, weekly trend, department breakdown                                             |
| `/leave` · `/leave/[id]`                                                                  | Approvals, requests, balances, team calendar + request details                                   |
| `/payroll` · `/payroll/[id]`                                                              | Payroll overview, run history + run detail (by department/employee)                              |
| `/payroll/loans` · `/payroll/loans/[id]`                                                  | Employee loans + repayment schedules                                                             |
| `/payroll/payslips` · `/payroll/payslips/[id]`                                            | Monthly payslips with earnings/deductions breakdown                                              |
| `/performance` · `/performance/[id]`                                                      | Review cycles, ratings, strengths/growth feedback                                                |
| `/onboarding` · `/onboarding/[id]`                                                        | New-hire task checklists (HR/IT/Admin)                                                           |
| `/offboarding` · `/offboarding/[id]`                                                      | Exit processes, reasons, checklists                                                              |
| `/reports`                                                                                | Workforce analytics reports                                                                      |
| `/notifications`                                                                          | In-app notification center (read/unread)                                                         |
| `/settings/general` · `/users` · `/audit-logs` · `/email` · `/billing` · `/notifications` | Company settings                                                                                 |
| `/settings/branding`                                                                      | **Admin theme editor** — mode, 8 predefined themes, custom palette, contrast check, logo/favicon |
| `/api/tenant/theme`                                                                       | `GET` / `PATCH` tenant theme config (validated + sanitized)                                      |
| `/api/user/preferences`                                                                   | `GET` / `PATCH` signed-in user's color-mode preference                                           |
| `/api/auth/*`                                                                             | `request-otp`, `verify-otp`, `logout`, `me`                                                      |

## Authentication (passwordless OTP)

**Postgres is required for login** — OTP codes are stored only in the `otp_codes`
table (hashed, 10-minute expiry, 5 attempts max, 60s resend throttle); there is
no in-memory fallback. Start the database first:

```bash
docker compose up -d          # Postgres 16 → localhost:5432/gente
pnpm db:migrate && pnpm db:seed   # apply schema + seed tenant/admin@gente.dev
```

Then sign in:

1. Go to `/login` and enter your work email.
2. The 6-digit code is delivered via the **email provider** or the **console provider**:
   - Set `RESEND_API_KEY` → delivered through the [Resend](https://resend.com) API (no extra dependency).
   - Otherwise (development) → printed to the server console.
3. Verify the code → the server issues a **stateless signed session cookie**
   (`gente_session`, httpOnly + secure, HMAC-signed with `AUTH_SESSION_SECRET`).
   Sessions are **not stored in the database or localStorage** — the cookie is
   the session (`src/lib/server/session-token.ts`).

Signing out simply clears the cookie. The seeder is idempotent and
configurable via `SEED_*` env vars (see `.env.example`).

## Postgres persistence

```bash
cp .env.example .env.local  # set DATABASE_URL
pnpm db:migrate             # applies db/migrations/0000_full_schema.sql
pnpm db:seed                # seeds tenant + admin user + employee profile
```

The full schema (see `db/schema.ts` and `db/migrations/0000_full_schema.sql`)
covers every module: multi-tenancy (`tenants`, `users`, `user_tenants`),
passwordless auth (`otp_codes`, `sessions`), employee profiles + documents,
onboarding/offboarding checklists, leave + balances, attendance, performance
reviews, salary/loans/payroll/payslips, notifications, audit logs, and email
service config/templates/logs. The store layers
(`src/lib/server/theme-store.ts`, `src/lib/server/auth-store.ts`) fall back to
in-memory implementations if the DB is unreachable, so the app never hard-fails.

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

The 8 predefined palettes live in `src/lib/themes.ts`, transcribed verbatim
from the spec (light + dark values for all 17 variables). The custom theme
editor validates hex input, normalizes `#rgb` → `#rrggbb`, runs an automated
WCAG 2.1 contrast check (AA = 4.5:1) for every critical color pair, and
supports export/import of themes as JSON.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:generate  # drizzle-kit generate (schema → SQL migration)
npm run db:migrate   # apply migrations
npm run db:seed      # seed default tenant + admin user
npm run db:studio    # drizzle studio
```

## Notes & future work

- Logo/favicon uploads store a data URL (capped at 512KB). For production,
  upload to blob/CDN storage and persist the URL — the `TenantTheme` shape
  already supports it.
- Phase 2/3 ideas from the spec (fonts, spacing, seasonal themes, A/B testing)
  are listed in `Agent.md` and are intentionally not implemented.
