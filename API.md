# Gente HR — API Endpoints & Implementation Map

Every page/feature in the app, and the REST endpoints needed to make it real.
**All endpoints below are implemented** (route handlers under `src/app/api/…`)
and backed by the Postgres schema in `db/schema.ts` (apply with
`pnpm db:migrate && pnpm db:seed`). The UI pages still render demo state from
`src/lib/hr-data.ts`; swapping them to `fetch` the endpoints below is the
remaining wiring work.

---

## 1. Conventions

- **Auth**: stateless signed `gente_session` cookie (httpOnly, HMAC-SHA256). All
  endpoints below assume it unless marked **public**.
- **RBAC**: per-tenant role from the session (`admin` | `hr` | `member`).
  - `admin` — everything in the tenant (config, users, billing, branding).
  - `hr` — operational modules (employees, onboarding/offboarding, leave,
    attendance, payroll, performance, reports, notifications, audit-view).
  - `member` — self-service only (own profile, leave, attendance, payslips,
    loans, notifications).
  - Super-admin (global) — cross-tenant management.
    Role guards must be enforced server-side on every route, not just in the UI.
- **Tenant scoping**: every query filters by the session `tenantId`; no
  cross-tenant reads/writes.
- **Envelope**: `{ ok: true, data }` or `{ ok: false, error }`. Errors:
  `400` invalid input, `401` unauthenticated, `403` wrong role, `404` missing,
  `409` conflict, `422` validation, `429` rate limit, `503` DB unavailable.
- **Pagination**: query `?page=1&pageSize=20` → `{ items, total, page, pageSize }`.
- **Search**: `?q=` (name/email/code substring, case-insensitive).
- **File uploads**: `multipart/form-data`; see §18. Stored file ids/urls are
  returned and persisted on the record.
- **Audit**: state-changing admin/HR actions write to `audit_logs`
  (actor = session user, category per module).

---

## 2. Auth & Sessions

| Method  | Path                      | Role   | Purpose                                                   |
| ------- | ------------------------- | ------ | --------------------------------------------------------- |
| ✅ POST | `/api/auth/request-otp`   | public | Send sign-in code (email or console in dev); rate-limited |
| ✅ POST | `/api/auth/verify-otp`    | public | Verify code → sets session cookie                         |
| ✅ POST | `/api/auth/logout`        | any    | Clear session cookie                                      |
| ✅ GET  | `/api/auth/me`            | any    | Current user `{ id, name, email, role, tenantId }`        |
| ✅ POST | `/api/auth/switch-tenant` | any    | Re-sign session with another tenant the user belongs to   |

---

## 3. Multi-Tenancy

| Method | Path                               | Role        | Purpose                                                                                                                                                                                                                       |
| ------ | ---------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/tenants`                     | any         | Organizations the user belongs to (header switcher) — currently server-rendered via `tenant-store`, may become an API                                                                                                         |
| GET    | `/api/tenants/current`             | any         | Active tenant profile (name, slug, settings)                                                                                                                                                                                  |
| PATCH  | `/api/tenants/current`             | admin       | Update company profile (general settings)                                                                                                                                                                                     |
| GET    | `/api/tenants`                     | super-admin | All tenants (global)                                                                                                                                                                                                          |
| POST   | `/api/tenants`                     | super-admin | Create a company + default admin. Body: `{ name, slug?, timezone?, currency?, adminEmail? }`. The creator is added as an admin member so they can switch into the new org; `adminEmail` (optional) links an additional admin. |
| PATCH  | `/api/tenants/:id`                 | super-admin | Suspend / change tier / edit tenant                                                                                                                                                                                           |
| POST   | `/api/tenants/:id/members`         | super-admin | Add a user to a tenant with a role                                                                                                                                                                                            |
| PATCH  | `/api/tenants/:id/members/:userId` | super-admin | Change membership role/status                                                                                                                                                                                                 |
| DELETE | `/api/tenants/:id/members/:userId` | super-admin | Remove membership                                                                                                                                                                                                             |

---

## 4. First-Run Setup (wizard)

| Method | Path                | Role   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/setup/status` | public | Whether the workspace is configured → `{ configured: boolean }`; used to redirect away from `/setup` once done                                                                                                                                                                                                                                                                                                                                                                               |
| POST   | `/api/setup`        | public | **Provision workspace** (mirrors the 5-step `/setup` wizard: Organization → Admin → Email → Branding & theme → Review). Body: `{ organization: { name, website?, timezone, currency, logoUrl? }, admin: { email }, email: { provider, credentials, senderName, senderEmail }, theme: { themeId, mode, custom? } }` → create tenant + admin user + admin membership (all tenants), persist email provider config and branding/theme, send the admin invite email. `409` if already configured |

Notes: the logo is browser-read as a data URL (or a file id from `/api/files`).
The admin invite email carries a login link; the admin then signs in with OTP.

---

## 5. Theme & Preferences (existing)

| Method   | Path                    | Role  | Purpose                                            |
| -------- | ----------------------- | ----- | -------------------------------------------------- |
| ✅ GET   | `/api/tenant/theme`     | any   | Tenant theme config (themeId, mode, custom, logo…) |
| ✅ PATCH | `/api/tenant/theme`     | admin | Save branding/theme                                |
| ✅ GET   | `/api/user/preferences` | any   | Current user color mode                            |
| ✅ PATCH | `/api/user/preferences` | any   | Update own color mode                              |

---

## 6. Employees

| Method | Path                                  | Role                    | Purpose                                                                                                                                             |
| ------ | ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/employees`                      | admin, hr               | List (search `?q=`, filter `?department=`, `?status=`, pagination)                                                                                  |
| GET    | `/api/employees/export`               | admin, hr               | Employee directory as CSV (`?format=csv`, optional `?department=` filter)                                                                           |
| POST   | `/api/employees`                      | admin, hr               | Create employee (name, email, phone, role, department, location, manager, salary, join date, status)                                                |
| GET    | `/api/employees/:id`                  | admin, hr; member (own) | Employee profile incl. contact, employment, structured address (address/state/country), bank, IDs, emergency contact, tax, health coverage, pension |
| PATCH  | `/api/employees/:id`                  | admin, hr               | Edit profile (name, email, role, department, salary, status…)                                                                                       |
| DELETE | `/api/employees/:id`                  | admin                   | Remove employee (or archive)                                                                                                                        |
| GET    | `/api/employees/:id/documents`        | admin, hr; member (own) | Documents on file                                                                                                                                   |
| POST   | `/api/employees/:id/documents`        | admin, hr; member (own) | Upload document (category, file)                                                                                                                    |
| DELETE | `/api/employees/:id/documents/:docId` | admin, hr               | Remove document                                                                                                                                     |
| PATCH  | `/api/employees/:id/documents/:docId` | admin, hr               | Verify / mark expired                                                                                                                               |
| GET    | `/api/employees/:id/attendance`       | admin, hr; member (own) | Attendance history                                                                                                                                  |
| GET    | `/api/employees/:id/leave-balance`    | admin, hr; member (own) | Leave balances                                                                                                                                      |
| GET    | `/api/employees/:id/leave`            | admin, hr; member (own) | Leave history                                                                                                                                       |
| GET    | `/api/employees/:id/payslips`         | admin, hr; member (own) | Payslips                                                                                                                                            |

**Employee self-service "complete profile"** (fields configured in Employee
Config) are collected during onboarding (§9) and/or via:

| Method | Path                                | Role         | Purpose                                                                                                                |
| ------ | ----------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| PATCH  | `/api/employees/:id/profile-fields` | member (own) | Update own bank, government ID, emergency contact, tax, pension (health coverage is HR/admin-managed after onboarding) |

---

## 7. Departments

| Method | Path                          | Role      | Purpose                               |
| ------ | ----------------------------- | --------- | ------------------------------------- |
| GET    | `/api/departments`            | admin, hr | List (search, `?active=`, pagination) |
| POST   | `/api/departments`            | admin     | Create (name, description)            |
| PATCH  | `/api/departments/:id`        | admin     | Edit name/description                 |
| PATCH  | `/api/departments/:id/status` | admin     | Enable / disable                      |
| DELETE | `/api/departments/:id`        | admin     | Delete (409 if employees assigned)    |

---

## 8. ATS (Recruitment & Hiring)

Pipeline: **Create jobs → Applications → Screening → Interview → Offer → Hired/Rejected → Onboarding** (§9). Hired applications create the employee record + onboarding plan.

### Jobs

| Method | Path                      | Role       | Purpose                                                               |
| ------ | ------------------------- | ---------- | --------------------------------------------------------------------- |
| GET    | `/api/ats/jobs`           | admin, hr  | List jobs (`?q=`, `?status=`, pagination) + application counts        |
| POST   | `/api/ats/jobs`           | admin, hr  | Create job posting (title, department, location, type, salary range)  |
| GET    | `/api/ats/jobs/:id`       | admin, hr  | Job detail + applications by stage                                    |
| PATCH  | `/api/ats/jobs/:id`       | admin, hr  | Update job / status (draft → open → closed)                           |
| DELETE | `/api/ats/jobs/:id`       | admin      | Delete job posting                                                    |
| GET    | `/api/ats/jobs/:id/apply` | **public** | Job info for the public apply page (open jobs only)                   |
| POST   | `/api/ats/jobs/:id/apply` | **public** | Submit an application (name, email, phone, resume link, cover letter) |

### Applications

| Method | Path                                                | Role      | Purpose                                                            |
| ------ | --------------------------------------------------- | --------- | ------------------------------------------------------------------ |
| GET    | `/api/ats/applications`                             | admin, hr | List (`?jobId=`, `?stage=`, pagination)                            |
| POST   | `/api/ats/applications`                             | admin, hr | Add candidate manually                                             |
| GET    | `/api/ats/applications/:id`                         | admin, hr | Detail: candidate, stage history, interviews, offer, employee link |
| PATCH  | `/api/ats/applications/:id`                         | admin, hr | Update candidate / notes                                           |
| DELETE | `/api/ats/applications/:id`                         | admin     | Remove application                                                 |
| POST   | `/api/ats/applications/:id/stage`                   | admin, hr | Move forward (screening → interview → offer) + note → history      |
| POST   | `/api/ats/applications/:id/interviews`              | admin, hr | Schedule next interview round (datetime, interviewer)              |
| PATCH  | `/api/ats/applications/:id/interviews/:interviewId` | admin, hr | Update interview status/feedback                                   |
| POST   | `/api/ats/applications/:id/offer`                   | admin, hr | Send offer (salary, start date, terms) → stage offer               |
| POST   | `/api/ats/applications/:id/hire`                    | admin, hr | **Hire**: create employee + onboarding plan (§9), stage → hired    |
| POST   | `/api/ats/applications/:id/reject`                  | admin, hr | Reject (note) → stage rejected                                     |

Pages: `/ats/jobs`, `/ats/jobs/new`, `/ats/jobs/:id` (+ `/edit`), `/ats/applications` (pipeline board), `/ats/applications/:id`, public apply `/apply/:jobId`.

---

## 9. Onboarding (invite → employee self-service)

| Method | Path                                | Role               | Purpose                                                                                                                                                                                                                                                               |
| ------ | ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/onboarding`                   | admin, hr          | List plans (status filter)                                                                                                                                                                                                                                            |
| POST   | `/api/onboarding`                   | admin, hr          | **Invite**: `{ fullName, email }` → create plan (status `invited`) + **send email with completion link/token**                                                                                                                                                        |
| GET    | `/api/onboarding/:id`               | admin, hr          | Plan detail (new-hire info, tasks, offer-letter status)                                                                                                                                                                                                               |
| PATCH  | `/api/onboarding/:id`               | admin, hr          | Edit invite details / cancel invite                                                                                                                                                                                                                                   |
| GET    | `/api/onboarding/complete?token=`   | **public**         | Load invite context for the emailed link (name, email)                                                                                                                                                                                                                |
| PUT    | `/api/onboarding/complete`          | **public** (token) | **Employee submits details**: contact (phone, address, state, country), passport photograph (file), signed offer letter file, bank, government ID, emergency contact, tax, pension → plan → `in_progress`, create user/employee (health coverage is HR/admin-managed) |
| PATCH  | `/api/onboarding/:id/tasks/:taskId` | admin, hr          | Mark onboarding task done / in progress                                                                                                                                                                                                                               |
| POST   | `/api/onboarding/:id/resend`        | admin, hr          | Resend invite email                                                                                                                                                                                                                                                   |

Email triggers: invite sent (with completion link), welcome once complete.

---

## 10. Offboarding

| Method | Path                                     | Role      | Purpose                                                                                              |
| ------ | ---------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/api/offboarding`                       | admin, hr | List exits                                                                                           |
| POST   | `/api/offboarding`                       | admin, hr | Start: `{ employeeId, reason, lastWorkingDay, checklistNames[], notes?, terminationLetter? (file) }` |
| GET    | `/api/offboarding/:id`                   | admin, hr | Exit detail                                                                                          |
| PATCH  | `/api/offboarding/:id/checklist/:itemId` | admin, hr | Toggle checklist item done                                                                           |
| PATCH  | `/api/offboarding/:id`                   | admin, hr | Update reason/last day/notes                                                                         |
| POST   | `/api/offboarding/:id/complete`          | admin, hr | Mark exit completed                                                                                  |

Email triggers: offboarding started (employee notified), exit confirmation.

---

## 11. Leave

| Method | Path                     | Role                             | Purpose                                                          |
| ------ | ------------------------ | -------------------------------- | ---------------------------------------------------------------- |
| GET    | `/api/leave`             | admin, hr — all; member — own    | List requests (filter status/employee, pagination)               |
| POST   | `/api/leave`             | member                           | Request leave `{ type, start, end, reason }` (validates balance) |
| GET    | `/api/leave/:id`         | admin, hr; member (own)          | Request detail                                                   |
| PATCH  | `/api/leave/:id/approve` | admin, hr                        | Approve → deduct balance, notify employee                        |
| PATCH  | `/api/leave/:id/reject`  | admin, hr                        | Reject (reason)                                                  |
| PATCH  | `/api/leave/:id/cancel`  | admin, hr, member (own, pending) | Cancel                                                           |
| PATCH  | `/api/leave/:id/extend`  | admin, hr                        | Extend `{ extraDays }` → end date + days                         |
| GET    | `/api/leave/calendar`    | admin, hr                        | Month view (per-day leave, conflict flags)                       |
| GET    | `/api/leave/balances`    | admin, hr; member (own)          | Balances per year/type                                           |

Email triggers: request submitted, approved/rejected/cancelled, deadline warnings.

---

## 12. Attendance

| Method | Path                                       | Role                    | Purpose                                                |
| ------ | ------------------------------------------ | ----------------------- | ------------------------------------------------------ |
| GET    | `/api/attendance`                          | admin, hr; member (own) | List records (filter date range/status, pagination)    |
| POST   | `/api/attendance/check-in`                 | member                  | Check in (location, source)                            |
| POST   | `/api/attendance/check-out`                | member                  | Check out → computes hours/status                      |
| PATCH  | `/api/attendance/:id`                      | admin, hr               | Correct a record (late/absent/remote)                  |
| GET    | `/api/attendance/summary`                  | admin, hr               | Today's stats: present, late, remote, on leave, absent |
| GET    | `/api/attendance/week-trend`               | admin, hr               | Weekly headcount trend                                 |
| GET    | `/api/attendance/departments`              | admin, hr               | Department breakdown                                   |
| GET    | `/api/attendance/report?from=&to=&format=` | admin, hr               | Attendance report (JSON/CSV), default last 7 days      |

---

## 13. Performance

### Templates

| Method | Path                                    | Role                     | Purpose                                                           |
| ------ | --------------------------------------- | ------------------------ | ----------------------------------------------------------------- |
| GET    | `/api/performance/templates`            | admin, hr; member (view) | List templates                                                    |
| POST   | `/api/performance/templates`            | admin, hr                | Create `{ name, description, sections: [{ name, questions[] }] }` |
| PATCH  | `/api/performance/templates/:id`        | admin, hr                | Edit                                                              |
| PATCH  | `/api/performance/templates/:id/status` | admin, hr                | Activate / deactivate                                             |
| DELETE | `/api/performance/templates/:id`        | admin, hr                | Delete (409 if in use)                                            |

### Reviews

| Method | Path                                    | Role                     | Purpose                                                                                                       |
| ------ | --------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/performance/reviews`              | admin, hr; member (own)  | List reviews (cycle/template/status filters)                                                                  |
| POST   | `/api/performance/reviews`              | admin, hr                | **Start review**: `{ templateId, employeeId, deadline }` → create draft + **email employee with review link** |
| GET    | `/api/performance/reviews/:id`          | admin, hr; member (own)  | Review detail                                                                                                 |
| PATCH  | `/api/performance/reviews/:id/deadline` | admin, hr                | **Extend deadline** `{ extraDays }` (+extension count, notify employee)                                       |
| PATCH  | `/api/performance/reviews/:id`          | member (own)             | Submit self-review answers (per template sections)                                                            |
| PATCH  | `/api/performance/reviews/:id/manager`  | admin, hr                | Submit manager rating + strengths/growth                                                                      |
| GET    | `/api/performance/cycles`               | admin, hr; member (view) | Review cycles                                                                                                 |

Email triggers: review started (employee), deadline extended, review submitted.

---

## 14. Payroll

| Method | Path                                | Role                    | Purpose                                                                                                                   |
| ------ | ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/payroll/runs`                 | admin, hr               | Run history                                                                                                               |
| POST   | `/api/payroll/runs`                 | admin, hr               | **Run payroll**: `{ period?, email }` → compute payslips, mark run processing→completed, **email payroll PDF to address** |
| GET    | `/api/payroll/runs/:id`             | admin, hr               | Run detail (gross/deductions/net, by department, entries)                                                                 |
| GET    | `/api/payroll/runs/preview?period=` | admin, hr               | Preview totals before running                                                                                             |
| GET    | `/api/payroll/salary`               | admin, hr               | Salary records                                                                                                            |
| POST   | `/api/payroll/salary`               | admin, hr               | Set/update salary `{ employeeId, basic, allowances…, effectiveFrom }`                                                     |
| GET    | `/api/payroll/loans`                | admin, hr; member (own) | Loans (`?from=&to=` date range, default last 7 days)                                                                      |
| POST   | `/api/payroll/loans`                | admin, hr               | Create loan `{ employeeId, type, amount, interestRate, termMonths }` (compute EMI)                                        |
| PATCH  | `/api/payroll/loans/:id/approve`    | admin, hr               | Approve/disburse                                                                                                          |
| GET    | `/api/payroll/loans/:id`            | admin, hr; member (own) | Loan detail + repayment schedule                                                                                          |
| GET    | `/api/payroll/payslips?period=`     | admin, hr; member (own) | Payslips (`?from=&to=` date range, default last 7 days)                                                                   |
| GET    | `/api/payroll/payslips/:id`         | admin, hr; member (own) | Payslip detail (earnings/deductions breakdown)                                                                            |
| GET    | `/api/payroll/payslips/:id/pdf`     | admin, hr; member (own) | Download payslip PDF                                                                                                      |
| POST   | `/api/payroll/payslips/:id/email`   | admin, hr               | Email payslip to employee                                                                                                 |

Email triggers: payroll run complete (PDF to chosen address + each employee's
payslip), loan approved.

---

## 15. Reports & Exports

| Method | Path                                | Role                        | Purpose                                                                                                                                         |
| ------ | ----------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/reports`                      | admin, hr; member (limited) | Report catalog + summary metrics                                                                                                                |
| GET    | `/api/reports/:id`                  | admin, hr                   | Report detail (employees, leave, attendance, payroll). Date-sensitive reports accept `?from=&to=` (`YYYY-MM-DD`), defaulting to the last 7 days |
| GET    | `/api/reports/:id/export?format=csv | pdf`                        | admin, hr                                                                                                                                       | Export report (respects the same `from`/`to` range) |
| GET    | `/api/reports/export-all?format=`   | admin, hr                   | Export combined workforce report (respects `from`/`to`)                                                                                         |

---

## 16. Notifications

| Method | Path                              | Role | Purpose                        |
| ------ | --------------------------------- | ---- | ------------------------------ |
| GET    | `/api/notifications`              | any  | Own notifications (pagination) |
| PATCH  | `/api/notifications/:id/read`     | any  | Mark one read                  |
| POST   | `/api/notifications/read-all`     | any  | Mark all read                  |
| GET    | `/api/notifications/unread-count` | any  | Badge count for header bell    |

Server-side creation: any module that emits an email should also create an
in-app notification row for the relevant user.

---

## 17. Settings

### General

| Method | Path                    | Role             | Purpose                                                                                                       |
| ------ | ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/settings/company` | admin, hr (view) | Company profile (name, website, support email, language, timezone, currency, office days, employee ID prefix) |
| PATCH  | `/api/settings/company` | admin            | Update profile (incl. office days, `employeePrefix`, language: en/fr/pt/es)                                   |

### Users (admin management)

| Method | Path                    | Role        | Purpose                                                                                         |
| ------ | ----------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/api/users?role=admin` | admin       | List admin users (all-tenant access)                                                            |
| POST   | `/api/users/invite`     | admin       | Invite admin `{ fullName, email }` → user + admin memberships in **all tenants** + invite email |
| PATCH  | `/api/users/:id`        | admin       | Activate / deactivate                                                                           |
| PATCH  | `/api/users/:id/role`   | super-admin | Change global role                                                                              |

### Employee Config (form fields)

| Method | Path                            | Role  | Purpose                                                                                                                  |
| ------ | ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/settings/employee-config` | admin | Current field config (groups, enabled, required) — bank, government ID, emergency contact, tax, Health Coverage, Pension |
| PUT    | `/api/settings/employee-config` | admin | Save config → used by onboarding/employee forms                                                                          |

### Payroll (payslip breakdown)

| Method | Path                    | Role  | Purpose                                                                                           |
| ------ | ----------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/settings/payroll` | admin | Payslip breakdown config (earnings/deductions components, labels, enabled) — merged over defaults |
| PUT    | `/api/settings/payroll` | admin | Save breakdown config → drives which components/labels appear on payslips                         |

### Email provider

| Method | Path                       | Role  | Purpose                                                        |
| ------ | -------------------------- | ----- | -------------------------------------------------------------- |
| GET    | `/api/settings/email`      | admin | Provider + credentials (masked) + sender/tracking/batch config |
| PUT    | `/api/settings/email`      | admin | Save provider credentials (encrypted) + config                 |
| POST   | `/api/settings/email/test` | admin | Send test email with chosen provider                           |

### Billing

| Method | Path                        | Role  | Purpose                        |
| ------ | --------------------------- | ----- | ------------------------------ |
| GET    | `/api/billing`              | admin | Plan, payment method, invoices |
| PATCH  | `/api/billing/method`       | admin | Update payment method          |
| POST   | `/api/billing/upgrade`      | admin | Change plan                    |
| GET    | `/api/billing/invoices`     | admin | Invoice list                   |
| GET    | `/api/billing/invoices/:id` | admin | Invoice detail                 |

### Audit logs

| Method | Path              | Role                              | Purpose                                          |
| ------ | ----------------- | --------------------------------- | ------------------------------------------------ |
| GET    | `/api/audit-logs` | admin (all), hr (HR actions only) | Audit trail (category/actor filters, pagination) |

---

## 18. Files & Uploads

| Method | Path             | Role   | Purpose                                                                                                                                                            |
| ------ | ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/files`     | any    | Upload (`multipart`): signed offer letter, passport photograph, termination letter, employee documents, payslip PDFs → returns `{ fileId, url, name, size, mime }` |
| GET    | `/api/files/:id` | scoped | Download (auth + ownership/tenant check)                                                                                                                           |
| DELETE | `/api/files/:id` | scoped | Remove                                                                                                                                                             |

Storage: local disk/S3 abstraction; never trust client paths — always serve by
`fileId` with permission checks. `public/flags/*.svg` are static assets, not
uploads. The setup wizard's logo is passed as a data URL to `/api/setup`
(alternatively uploaded to `/api/files` first and referenced by id).

---

## 19. Cross-Cutting Work

1. **RBAC middleware**: an auth helper (e.g. `requireRole(…, ["admin","hr"])`)
   reused by every route handler; member routes must scope queries to the
   session user's employee record.
2. **Repository layer**: replace `hr-data.ts` demo lookups with Drizzle queries
   behind typed repositories (employee, leave, payroll, etc.).
3. **Audit logging**: one helper that appends to `audit_logs` for admin/HR
   mutations.
4. **Email service**: route all email through the configured provider from
   `/api/settings/email`; dev falls back to console (already the pattern in
   `src/lib/server/email.ts`).
5. **Validation**: shared Zod-style schemas per resource (currently inline
   regex checks in auth routes).
6. **Rate limiting** on OTP, invites, and payroll-run endpoints.

---

## 20. Build Order Suggestion

1. **Setup provisioning** — `GET /api/setup/status` + `POST /api/setup` (tenant,
   admin, email provider, theme) so a new workspace is fully configurable.
2. Repository layer + `GET` list endpoints (employees, departments, leave,
   attendance, payroll, notifications) — unblocks all pages.
3. Mutations with demo state today (leave approve/extend/cancel, department
   CRUD, employee edit) — highest user-visible impact.
4. Onboarding invite → completion round-trip (token + public submit + user
   creation) and its email.
5. Performance reviews (start + extend + submission) and payroll run (preview,
   run, PDF email).
6. Settings persistence (company, employee-config, email provider, billing).
7. Super-admin multi-tenant management + RLS policies.
