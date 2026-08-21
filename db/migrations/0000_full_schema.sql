-- Gente HR — full database schema (single reference migration).
-- Mirrors db/schema.ts. Every tenant-scoped table carries tenant_id so
-- PostgreSQL Row-Level Security (or application-level filtering) can enforce
-- tenant isolation. See Agent.md §16 and §27.

-- ─── Tenants & multi-tenancy ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Acme Inc.',
  logo text,
  address text,
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'USD',
  date_format text NOT NULL DEFAULT 'MMM d, yyyy',
  status text NOT NULL DEFAULT 'active',
  subscription_tier text NOT NULL DEFAULT 'growth',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_config jsonb NOT NULL DEFAULT '{"themeId":"default","mode":"system"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User ↔ tenant association with per-tenant role (RBAC).
CREATE TABLE IF NOT EXISTS user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- ─── Authentication ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_user_id_idx ON otp_codes (user_id);
CREATE INDEX IF NOT EXISTS otp_codes_created_at_idx ON otp_codes (created_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('light', 'dark', 'system')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── Employee management ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  employee_id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  department text,
  designation text,
  location text,
  manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  join_date date,
  employment_type text NOT NULL DEFAULT 'full_time',
  emergency_contact jsonb,
  bank_details jsonb,
  tax_id text,
  profile_photo text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employees_tenant_id_idx ON employees (tenant_id);

CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employee_documents_tenant_id_idx ON employee_documents (tenant_id);

-- ─── Departments ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS departments_tenant_id_idx ON departments (tenant_id);

-- ─── Onboarding ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  target_date date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS onboarding_plans_tenant_id_idx ON onboarding_plans (tenant_id);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES onboarding_plans(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  department text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS onboarding_tasks_tenant_id_idx ON onboarding_tasks (tenant_id);

-- ─── Offboarding ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reason text NOT NULL,
  last_working_day date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  exit_interview_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offboardings_tenant_id_idx ON offboardings (tenant_id);

CREATE TABLE IF NOT EXISTS offboarding_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id uuid NOT NULL REFERENCES offboardings(id) ON DELETE CASCADE,
  name text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

-- ─── Leave management ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leaves_tenant_id_idx ON leaves (tenant_id);

CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year integer NOT NULL,
  vacation_total integer NOT NULL DEFAULT 25,
  vacation_used integer NOT NULL DEFAULT 0,
  sick_total integer NOT NULL DEFAULT 10,
  sick_used integer NOT NULL DEFAULT 0,
  personal_total integer NOT NULL DEFAULT 5,
  personal_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year)
);

-- ─── Attendance ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in text,
  check_out text,
  hours numeric(4, 2),
  status text NOT NULL DEFAULT 'present',
  location text,
  source text NOT NULL DEFAULT 'device',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);
CREATE INDEX IF NOT EXISTS attendance_tenant_id_idx ON attendance_records (tenant_id);

-- ─── Performance reviews ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_cycles_tenant_id_idx ON review_cycles (tenant_id);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name text,
  self_rating numeric(2, 1),
  manager_rating numeric(2, 1),
  overall numeric(2, 1),
  status text NOT NULL DEFAULT 'draft',
  strengths text,
  growth text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_tenant_id_idx ON reviews (tenant_id);

-- ─── Payroll ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic integer NOT NULL DEFAULT 0,
  hra integer NOT NULL DEFAULT 0,
  allowances integer NOT NULL DEFAULT 0,
  bonus integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  pension integer NOT NULL DEFAULT 0,
  insurance integer NOT NULL DEFAULT 0,
  gross integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  effective_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS salary_tenant_id_idx ON salary (tenant_id);

CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount integer NOT NULL,
  interest_rate numeric(4, 2) NOT NULL DEFAULT 0,
  term_months integer NOT NULL,
  monthly_emi integer NOT NULL,
  disbursed_at date,
  paid_months integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loans_tenant_id_idx ON loans (tenant_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  total integer NOT NULL DEFAULT 0,
  employees integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payroll_runs_tenant_id_idx ON payroll_runs (tenant_id);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  gross integer NOT NULL DEFAULT 0,
  deductions integer NOT NULL DEFAULT 0,
  net integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payroll_entries_tenant_id_idx ON payroll_entries (tenant_id);

CREATE TABLE IF NOT EXISTS payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period text NOT NULL,
  basic integer NOT NULL DEFAULT 0,
  hra integer NOT NULL DEFAULT 0,
  allowances integer NOT NULL DEFAULT 0,
  bonus integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  pension integer NOT NULL DEFAULT 0,
  insurance integer NOT NULL DEFAULT 0,
  loan_emi integer NOT NULL DEFAULT 0,
  gross integer NOT NULL DEFAULT 0,
  net integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period)
);
CREATE INDEX IF NOT EXISTS payslips_tenant_id_idx ON payslips (tenant_id);

-- ─── Notifications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_tenant_id_idx ON notifications (tenant_id);

-- ─── Audit logs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  target text,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON audit_logs (tenant_id);

-- ─── Email service ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'console',
  fallback_provider text NOT NULL DEFAULT 'console',
  sender_name text NOT NULL DEFAULT 'Gente HR',
  sender_email text NOT NULL DEFAULT 'noreply@gente.dev',
  reply_to text,
  tracking boolean NOT NULL DEFAULT false,
  batch_limit integer NOT NULL DEFAULT 200,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  subject text,
  body text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  template_key text,
  provider text,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_logs_tenant_id_idx ON email_logs (tenant_id);

-- ─── Demo seed (optional; `pnpm db:seed` also creates this) ──────────────

INSERT INTO tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'acme', 'Acme Inc.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, name, super_admin)
VALUES ('00000000-0000-0000-0000-000000000002', 'admin@gente.dev', 'Ada Admin', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_tenants (user_id, tenant_id, role, is_primary)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'admin',
  true
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;
