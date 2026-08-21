# Complete Feature List & Tech Stack - Minimalist HR Tool with Multi-Tenancy

---

## PROJECT OVERVIEW

### Core Concept

A minimalist HR management tool built as a single Next.js application with integrated API routes, featuring optional multi-tenancy support for managing multiple companies from a single installation.

### Key Differentiators

- **Optional Multi-Tenancy** - Choose between single-company or multi-company mode during initial setup
- **Passwordless Authentication** - OTP and magic link based login for enhanced security
- **Single Codebase** - Frontend and backend in one Next.js project
- **Type-Safe** - Full TypeScript implementation with Drizzle ORM

---

## PROJECT ARCHITECTURE

### Single Project Approach

- Single Next.js project with integrated API routes
- Frontend and backend in one codebase
- Unified deployment on Vercel or Docker
- Shared types and utilities between frontend and backend
- No CORS configuration needed
- Faster development with single codebase

### Multi-Tenancy Architecture

#### Core Concepts

- **Tenant** - A company/organization within the system
- **Super Admin** - Global administrator who can manage all tenants
- **Company Admin** - Administrator for a specific tenant
- **Tenant Isolation** - Complete data separation between companies

#### Modes of Operation

**Single-Tenant Mode (Simpler Setup)**

- Traditional single company setup
- No tenant switching UI
- Simplified database queries
- Ideal for small businesses or single organizations
- Default tenant created during setup

**Multi-Tenant Mode (Advanced)**

- Support for multiple companies
- Complete data isolation between tenants
- Super admin dashboard for tenant management
- Tenant switching capability
- Company-specific branding and settings
- User association with multiple companies
- Ideal for HR service providers or agencies

#### Tenant Features

- Company name, logo, address
- Tenant unique identifier (slug)
- Company settings (timezone, currency, date format)
- Company branding (colors, logo, favicon)
- Company policies (leave policy, work hours)
- Tenant status (active, suspended, trial)
- Subscription/tier management (optional)

---

## 1. EMPLOYEE MANAGEMENT

### Core Profile

- Employee ID (auto-generated, tenant-specific)
- Full name, email, phone
- Department, role/designation
- Join date, work location
- Employment type (full-time/contract/intern)
- Emergency contact details
- Bank account details (for payroll)
- PAN/SSN/Tax ID
- Profile photo upload
- **Multi-Tenant:** Employees belong to specific company

### Document Management

- Upload/store documents (offer letter, contract, NDAs)
- Document expiry tracking & reminders
- Document categories (personal, professional, legal)
- **Multi-Tenant:** Documents isolated per company

### Employee Status

- Active
- Onboarding (in progress)
- Offboarding (in progress)
- Inactive

---

## 2. ONBOARDING

### Task Management

- Pre-defined onboarding checklist templates
- Assign tasks to specific departments (HR, IT, Admin)
- Task status: Pending → In Progress → Completed
- Task due dates
- Notes/comments on each task
- Progress tracking (% completion)
- **Multi-Tenant:** Templates per company

### Standard Tasks (Examples)

- ID card issuance
- Laptop/equipment allocation
- Email & system account creation
- Workspace assignment
- Welcome kit delivery
- Policy document acknowledgment
- Orientation session scheduling

---

## 3. OFFBOARDING

### Exit Process

- Initiate offboarding (with reason)
- Last working day tracking
- Exit interview form/notes
- Resignation acceptance/rejection

### Offboarding Checklist

- Asset return (laptop, phone, ID card)
- System access revocation (email, slack, tools)
- HR exit formalities
- Final settlement processing
- Experience letter generation

### Exit Reasons

- Resignation (voluntary)
- Termination
- Retirement
- Contract end

---

## 4. LEAVE MANAGEMENT

### Leave Requests

- Request leave (types: sick, vacation, personal, other)
- Date range selection
- Reason/notes
- Attach supporting documents (medical certificate)

### Leave Balance

- Available leaves (annual, sick, casual)
- Accrued leaves tracking
- Leave balance summary (used/remaining)

### Approval Workflow

- Manager approval/rejection
- HR override (for escalation)
- Comments on approval/rejection
- Notification emails on status change

### Leave Calendar

- Team calendar view
- See who's on leave
- Conflict detection (overlapping leaves)

---

## 5. ATTENDANCE TRACKING

### Daily Attendance

- Check-in (with timestamp)
- Check-out (with timestamp)
- Location tracking (optional - GPS/office IP)
- Manual entry override (by HR)

### Attendance View

- Daily attendance log
- Monthly attendance summary
- Present/Absent/Leave/Holiday status

### Attendance Reports

- Monthly attendance report
- Employee-wise summary
- Late check-in tracking

---

## 6. PERFORMANCE REVIEWS

### Review Cycles

- Quarterly reviews
- Half-yearly reviews
- Annual reviews
- Custom cycle creation

### Review Form

- Self-assessment (employee)
- Manager evaluation
- Peer feedback (optional)
- Rating system (1-5 or custom scale)
- Goal achievement tracking
- Strengths & areas of improvement
- Future goals/action plan

### Review Management

- Review history per employee
- Overall rating calculation
- Comments/feedback storage
- Review reminders & notifications

---

## 7. PAYROLL

### Salary Management

- Salary structure (basic, HRA, allowances, deductions)
- Gross salary calculation
- Net salary calculation
- Salary revision history
- Effective date tracking
- Salary component breakdown

### Loan Management

- Loan request (personal, advance, vehicle, other)
- Amount, interest rate, tenure
- Monthly EMI calculation
- Loan approval/rejection
- Outstanding balance tracking
- Repayment schedule
- EMI deduction tracking per payslip
- Loan closure status

### Payslip Generation

- Monthly payslip generation (bulk or single)
- Earnings breakdown (basic, HRA, allowances, bonus)
- Deductions breakdown (tax, PF, loan EMI, insurance)
- Gross vs Net pay
- Year-to-date (YTD) summary
- PDF generation & download
- Email delivery to employees
- Payslip history

### Payroll Reporting

- Monthly salary register
- Department-wise payroll summary
- Loan summary report

---

## 8. REPORTS & DASHBOARDS

### Employee Dashboard

- Total employee count
- Department-wise distribution
- Active/Inactive breakdown
- New hires this month
- Employees leaving this month

### Leave Dashboard

- Pending leave requests
- Monthly leave usage
- Leave balance alerts

### Attendance Dashboard

- Today's attendance %
- Monthly attendance trend
- Absenteeism report

### Payroll Dashboard

- Monthly payroll summary
- Total salary processed
- Pending loan EMI summary

### Export Options

- CSV/Excel export for all reports
- PDF downloads (payslips, reports)

---

## 9. NOTIFICATIONS

### Email Notifications

- Leave request submission (to manager)
- Leave approval/rejection (to employee)
- Onboarding task assignment
- Payslip generation alert
- Document expiry reminders
- Loan approval/rejection
- Performance review reminders
- Welcome email to new employees
- Offboarding confirmation
- Salary revision notification
- Login OTP delivery
- Magic link login (optional)

### In-App Notifications

- Real-time notifications within dashboard
- Notification center with read/unread status
- Click to view details

---

## 10. AUTHENTICATION - PASSWORDLESS LOGIN

### Login Flow

- Email-based passwordless authentication
- OTP (One-Time Password) sent via email
- 6-digit numeric OTP
- OTP validity: 10 minutes
- OTP resend functionality (60-second cooldown)
- Magic link option (alternative to OTP)
- Session management with JWT
- Secure cookie-based session storage

### OTP Features

- Request OTP via email
- Verify OTP to log in
- Automatic OTP expiry after 10 minutes
- Maximum 5 OTP attempts per session
- Rate limiting to prevent abuse
- OTP delivery tracking
- Resend OTP with cooldown

### Magic Link Features

- Send magic link via email
- Click link to authenticate
- One-time use only
- Expires in 15 minutes
- Automatic redirect after verification

### User Management

- First-time user auto-creation on login
- User roles assigned by Admin
- User profile completion on first login
- Account status tracking
- **Multi-Tenant:** Users can belong to multiple companies

### Security

- OTP rate limiting (max 5 requests per 15 minutes)
- Failed attempt tracking (lock after 5 failures)
- Session timeout after 7 days
- IP-based rate limiting
- Email verification before OTP sent
- No password to store or manage

---

## 11. EMAIL SERVICE INTEGRATION

### Supported Email Providers

The system supports multiple email service providers with a unified API interface for reliable email delivery.

| Provider               | Key Features                                            | Best For                         |
| ---------------------- | ------------------------------------------------------- | -------------------------------- |
| **Resend**             | Developer-friendly, React email support, modern API     | Modern developer experience      |
| **ZeptoMail**          | High deliverability, dedicated IPs, transactional focus | Enterprise-level reliability     |
| **Mailgun**            | Powerful API, email validation, analytics               | High-volume transactional emails |
| **Brevo (Sendinblue)** | All-in-one platform, SMS integration, CRM features      | Combined email + marketing needs |

### Email Service Features

- Unified API interface across all providers
- Provider switching via environment configuration
- Automatic fallback to secondary provider if primary fails
- Email queue system with retry logic
- Exponential backoff for failed emails
- Email delivery status tracking
- Open and click tracking (where supported)
- Bounce and complaint handling
- Email template management
- Attachment support (payslips, documents)
- Batch email sending capability
- Rate limiting and throttling
- Email validation before sending

### Email Templates

- OTP verification email
- Magic link login email
- Welcome email for new employees
- Leave request notifications
- Leave approval/rejection emails
- Payslip delivery emails
- Onboarding task assignments
- Loan approval/rejection notifications
- Document expiry reminders
- Performance review reminders
- Offboarding confirmation emails
- Salary revision notifications

### Configuration Options

- Primary email provider selection
- Fallback provider configuration
- Custom sender email and name
- Reply-to address configuration
- Email tracking enable/disable
- Template customization
- Batch sending limits

---

## 12. ADMINISTRATION

### Super Admin (Global)

- Manage multiple companies
- Create new companies/tenants
- Switch between companies
- Company-level configuration
- Global settings
- User management across companies
- Tenant status management
- Subscription/tier management

### Company Admin

- Company-specific settings
- User management within company
- Role/permission management
- Company branding
- Company policies

### User Management

- Role-based access control (RBAC)
  - **Super Admin**: Full system access across all companies
  - **Admin**: Full access within company
  - **HR**: Access to all employee data, payroll, reports
  - **Employee**: Self-service (own profile, leaves, payslips)
- User activation/deactivation
- Role assignment for new users
- User list with status
- **Multi-Tenant:** Users can be associated with multiple companies

### Settings

- Company info (name, logo, address)
- Leave policy configuration
- Work hours/days configuration
- Tax & PF deduction settings
- Role/permission management
- Email provider configuration
- Email template customization
- OTP expiry time configuration
- Session timeout configuration
- Security settings (rate limits, attempt limits)

### Audit Logs

- Track all actions (who did what)
- Login history
- OTP request logs
- Payroll changes log
- Employee status changes
- Leave approvals/denials
- Email delivery logs
- Failed login attempts
- **Multi-Tenant:** Audit logs include tenant context

---

## 13. SELF-SERVICE (Employee Portal)

### Employee View

- View own profile
- Update personal details
- View salary & payslips
- Request leave
- Check leave balance
- Mark attendance (check-in/out)
- View own attendance history
- Participate in performance reviews
- View own loans & repayment status
- Upload documents (personal)
- Download payslips
- Login with email + OTP
- Logout session

---

## 14. ROLE-BASED ACCESS CONTROL (RBAC) - DETAILED

### Role Definitions

| Role               | Scope   | Responsibilities                                                                                           | Restrictions                                                             |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Super Admin** 👑 | Global  | System configuration, create/manage companies, global settings, all data across tenants, tenant management | None                                                                     |
| **Admin** 🏢       | Company | Company configuration, user management, all company data, role assignment within company                   | System settings, cross-tenant access                                     |
| **HR** 👔          | Company | Employee lifecycle, onboarding/offboarding, payroll, leaves, attendance, reports within company            | Company settings, tool config, role/permission management, user creation |
| **Employee** 👤    | Self    | Personal profile, attendance, leave requests, payslips, self-reviews                                       | Cannot access other employees' data, cannot approve anything             |

### Permission Matrix by Module

| Module                        | Super Admin | Admin         | HR                 | Employee        |
| ----------------------------- | ----------- | ------------- | ------------------ | --------------- |
| **Tenant Management**         | ✅ Full     | ❌ None       | ❌ None            | ❌ None         |
| **Employee Management**       | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Limited      |
| **Onboarding**                | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Limited      |
| **Offboarding**               | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Limited      |
| **Leave Management**          | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Self-Service |
| **Attendance**                | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Self-Service |
| **Performance Reviews**       | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Self-Service |
| **Payroll**                   | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Self-Service |
| **Reports & Dashboards**      | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Limited      |
| **Notifications**             | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Self-Service |
| **Email Service Integration** | ✅ Full     | ❌ Restricted | ❌ Restricted      | ❌ None         |
| **Authentication**            | ✅ Full     | ✅ Full       | ✅ Full            | ✅ Full         |
| **Administration**            | ✅ Full     | ✅ Full       | ❌ Restricted      | ❌ None         |
| **Self-Service**              | N/A         | N/A           | N/A                | ✅ Full         |
| **Audit Logs**                | ✅ All      | ✅ Company    | ✅ HR Actions Only | ❌ None         |

---

## 15. TECHNICAL STACK

### Frontend & Backend (Single Project)

| Category                  | Technology                        | Version | Purpose                                    |
| ------------------------- | --------------------------------- | ------- | ------------------------------------------ |
| **Framework**             | Next.js                           | 15+     | Full-stack React framework with API routes |
| **Language**              | TypeScript                        | 5+      | Type-safe JavaScript                       |
| **UI Library**            | React                             | 19+     | User interface components                  |
| **Styling**               | Tailwind CSS                      | 4+      | Utility-first CSS framework                |
| **UI Components**         | Shadcn/ui                         | Latest  | Reusable React components                  |
| **Database ORM**          | Drizzle ORM                       | 0.40+   | Type-safe SQL query builder                |
| **Database**              | PostgreSQL                        | 16+     | Primary database                           |
| **Authentication**        | Custom JWT + OTP                  | -       | Passwordless authentication                |
| **Email Providers**       | Resend, Mailgun, Brevo, ZeptoMail | Latest  | Email delivery                             |
| **PDF Generation**        | @react-pdf/renderer               | 4+      | Payslip PDF generation                     |
| **Charts**                | Recharts                          | 2+      | Dashboard visualizations                   |
| **Forms**                 | React Hook Form                   | 7+      | Form handling                              |
| **File Upload**           | Uploadthing                       | Latest  | Document and photo uploads                 |
| **Date Handling**         | date-fns                          | 4+      | Date manipulation                          |
| **Environment**           | dotenv                            | 16+     | Environment variables                      |
| **API Rate Limiting**     | Upstash Ratelimit                 | Latest  | Rate limiting for APIs                     |
| **Background Jobs**       | Vercel Cron Jobs / BullMQ         | Latest  | Scheduled tasks                            |
| **Logging**               | Pino / Winston                    | Latest  | Application logging                        |
| **Testing**               | Vitest / React Testing Library    | Latest  | Unit and integration tests                 |
| **Linting**               | ESLint                            | 9+      | Code quality                               |
| **Formatting**            | Prettier                          | 3+      | Code formatting                            |
| **OTP Generation**        | otplib / custom                   | Latest  | Secure OTP generation                      |
| **JWT**                   | jose                              | 5+      | JWT creation and verification              |
| **Multi-Tenancy**         | Custom implementation             | -       | Tenant isolation with RLS                  |
| **Database Row Security** | PostgreSQL RLS                    | 16+     | Tenant-level data isolation                |

### Deployment

| Platform                   | Purpose                             |
| -------------------------- | ----------------------------------- |
| **Vercel**                 | Primary deployment (recommended)    |
| **Docker**                 | Containerization for custom hosting |
| **AWS RDS / Neon**         | Managed PostgreSQL database         |
| **AWS S3 / Cloudflare R2** | Document storage                    |

---

## 16. DATABASE SCHEMA OVERVIEW (Drizzle ORM)

### Core Tables

**Tenants Table**

- Stores company information
- Fields: id, slug, name, logo, address, timezone, currency, date_format, primary_color, favicon, status, subscription_tier, settings, timestamps

**Users Table**

- Stores user authentication data
- Fields: id, email, name, status, super_admin flag, timestamps

**User Tenants Table**

- Association between users and tenants
- Fields: id, user_id, tenant_id, role, status, timestamps

**OTP Table**

- Manages OTP for passwordless login
- Fields: id, email, otp, expires_at, attempts, verified, timestamps

**Sessions Table**

- Manages user sessions
- Fields: id, user_id, tenant_id, token, expires_at, timestamps

**Employees Table**

- Employee profiles with tenant isolation
- Fields: id, tenant_id, user_id, employee_id, department, designation, join_date, employment_type, emergency_contact (jsonb), bank_details (jsonb), tax_id, profile_photo, status, timestamps

**Other Tenant-Specific Tables** (all include tenant_id)

- onboarding_tasks
- offboarding
- leaves
- attendance
- reviews
- salary
- loans
- payslips
- notifications
- audit_logs

### Tenant Isolation Strategy

**Database-Level Isolation (PostgreSQL RLS)**

- Row Level Security enabled on all tenant tables
- Tenant ID automatically applied to all queries
- Cross-tenant data access prevented at database level

**Application-Level Isolation**

- Tenant context maintained in session
- All API routes validate tenant access
- Query filtering by tenant_id automatically applied

---

## 17. TENANT SETUP FLOW

### Initial Setup - Single Company Mode

1. User launches application
2. Setup Wizard appears
3. Select "Single Company" option
4. Enter company details (name, admin email, admin name)
5. System creates default tenant
6. Admin account created with OTP verification
7. Redirect to company dashboard

### Initial Setup - Multi-Company Mode

1. User launches application
2. Setup Wizard appears
3. Select "Multi-Company" option
4. Create Super Admin account (email, name, OTP verification)
5. Create first company (name, slug, company settings)
6. Set Super Admin as company admin
7. Redirect to Super Admin dashboard
8. Super Admin can now add more companies

### Adding a New Company (Super Admin)

1. Super Admin navigates to "Companies" section
2. Click "Add Company"
3. Enter company details (name, slug, address, timezone, currency, branding)
4. Company created
5. Assign admin user(s) to company
6. Company ready for use

### Switching Companies

1. User clicks company switcher in header
2. Dropdown shows available companies
3. User selects different company
4. Session updated with new tenant_id
5. Dashboard reloads with company data
6. All queries filter by new tenant
7. UI updates with company branding

---

## 18. AUTHENTICATION FLOW WITH TENANTS

### OTP Login Flow

1. User visits /login
2. Enter email address
3. Click "Send OTP"
4. Backend validates email and sends OTP
5. User enters 6-digit OTP
6. Backend verifies OTP
7. User record created/updated
8. System checks user's tenant associations
   - **One tenant** → Set tenant context, redirect to dashboard
   - **Multiple tenants** → Show tenant selection screen
   - **No tenants** → Show error or redirect to setup
9. Session created with JWT and tenant context
10. Redirect to appropriate dashboard

### Magic Link Flow with Tenants

1. User visits /login
2. Enter email address
3. Click "Send Magic Link"
4. Backend generates unique token and sends email
5. User clicks link in email
6. Backend verifies token validity
7. User record created/updated
8. System checks user's tenant associations
   - **One tenant** → Set tenant context, redirect to dashboard
   - **Multiple tenants** → Show tenant selection screen
   - **No tenants** → Show error or redirect to setup
9. Session created with JWT and tenant context
10. Redirect to appropriate dashboard

---

## 19. WHAT'S EXCLUDED (Minimalist Approach)

❌ Advanced recruitment/ATS (job postings, candidate tracking)
❌ Learning Management System (courses, certifications)
❌ Complex shift scheduling & roster management
❌ Advanced project management/task tracking
❌ Benefits management (insurance, perks)
❌ Expense reimbursement system
❌ Advanced tax calculations (beyond basic)
❌ Mobile apps (web-only)
❌ Chat/messaging system
❌ Employee engagement/surveys
❌ Advanced analytics/BI dashboards
❌ Third-party integrations (Slack, Google Workspace)
❌ Password-based authentication (passwordless only)

---

## 20. FEATURE SUMMARY TABLE

| Category                      | Features           | Super Admin | Admin         | HR            | Employee        |
| ----------------------------- | ------------------ | ----------- | ------------- | ------------- | --------------- |
| **Tenant Management**         | 5                  | ✅ Full     | ❌ None       | ❌ None       | ❌ None         |
| **Employee Management**       | 8                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Limited      |
| **Onboarding**                | 4                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Limited      |
| **Offboarding**               | 4                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Limited      |
| **Leave Management**          | 7                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Self-Service |
| **Attendance**                | 5                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Self-Service |
| **Performance Reviews**       | 5                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Self-Service |
| **Payroll**                   | 12                 | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Self-Service |
| **Reports & Dashboards**      | 8                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Limited      |
| **Notifications**             | 6                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Self-Service |
| **Email Service Integration** | 5                  | ✅ Full     | ❌ Restricted | ❌ Restricted | ❌ None         |
| **Authentication**            | 8                  | ✅ Full     | ✅ Full       | ✅ Full       | ✅ Full         |
| **Administration**            | 7                  | ✅ Full     | ✅ Full       | ❌ Restricted | ❌ None         |
| **Self-Service**              | 11                 | N/A         | N/A           | N/A           | ✅ Full         |
| **Audit Logs**                | N/A                | ✅ All      | ✅ Company    | ❌ None       | ❌ None         |
| **TOTAL**                     | **~118+ features** |             |               |               |                 |

---

## 21. SECURITY FEATURES

### Authentication Security

- Passwordless authentication (no passwords to steal)
- 6-digit OTP with 10-minute expiry
- Rate limiting on OTP requests (5 per 15 minutes)
- Maximum OTP attempts (5 attempts)
- OTP delivered via email only
- Secure JWT stored in HTTP-only cookies
- Session timeout (7 days, configurable)
- Session invalidation on logout
- IP-based rate limiting
- Failed attempt logging

### Application Security

- HTTPS enforcement
- Input validation and sanitization (Zod)
- SQL injection prevention (Drizzle ORM)
- XSS protection
- CSRF protection
- Role-based access control (RBAC)
- Insecure Direct Object Reference (IDOR) prevention
- CORS protection (same-origin only)
- Environment variable security
- Audit logging for sensitive operations
- Data encryption for sensitive fields
- API rate limiting

### Multi-Tenant Security

- Tenant isolation at database level (RLS)
- Tenant isolation at application level
- Cross-tenant data access prevention
- Tenant-specific audit logging
- User-tenant association validation
- Tenant context validation on every request
- Tenant switching audit logging

---

## 22. EMAIL PROVIDER COMPARISON

| Feature                 | Resend     | ZeptoMail  | Mailgun     | Brevo      |
| ----------------------- | ---------- | ---------- | ----------- | ---------- |
| **Transactional Email** | ✅         | ✅         | ✅          | ✅         |
| **Bulk Email**          | ✅         | ✅         | ✅          | ✅         |
| **Email Validation**    | ✅         | ✅         | ✅          | ✅         |
| **Open Tracking**       | ✅         | ✅         | ✅          | ✅         |
| **Click Tracking**      | ✅         | ✅         | ✅          | ✅         |
| **Analytics Dashboard** | ✅         | ✅         | ✅          | ✅         |
| **Attachment Support**  | ✅         | ✅         | ✅          | ✅         |
| **Template Management** | ✅         | ✅         | ✅          | ✅         |
| **Batch Sending**       | ✅         | ✅         | ✅          | ✅         |
| **Dedicated IP**        | ❌         | ✅         | ✅          | ❌         |
| **SMS Integration**     | ❌         | ❌         | ❌          | ✅         |
| **React Email Support** | ✅         | ❌         | ❌          | ❌         |
| **Free Tier**           | ✅         | ❌         | ✅          | ✅         |
| **Best For**            | Modern Dev | Enterprise | High Volume | All-in-one |

---

## 23. DEVELOPMENT TIMELINE ESTIMATE

| Phase        | Features                                                | Estimated Time  |
| ------------ | ------------------------------------------------------- | --------------- |
| **Phase 1**  | Project setup, Drizzle ORM, database schema             | 1 week          |
| **Phase 2**  | Multi-tenant architecture, tenant management            | 1.5 weeks       |
| **Phase 3**  | Passwordless auth (OTP + Magic Link), email integration | 2 weeks         |
| **Phase 4**  | Employee management, RBAC with tenant context           | 2 weeks         |
| **Phase 5**  | Leave management, attendance                            | 2 weeks         |
| **Phase 6**  | Onboarding, offboarding                                 | 1.5 weeks       |
| **Phase 7**  | Payroll (salary, loans, payslips)                       | 3-4 weeks       |
| **Phase 8**  | Performance reviews, reports                            | 2 weeks         |
| **Phase 9**  | Email templates, notifications                          | 1.5 weeks       |
| **Phase 10** | Testing, deployment, documentation                      | 2 weeks         |
| **Total**    |                                                         | **18-20 weeks** |

---

## 24. RECOMMENDED DEVELOPMENT ORDER

1. **Setup** - Next.js 15+ project, Drizzle ORM, PostgreSQL
2. **Multi-Tenancy Core** - Tenant schema, tenant middleware, isolation strategies
3. **Authentication** - OTP login flow, email integration (Resend)
4. **User Management** - User creation, role assignment, tenant association
5. **Employee Management** - Core CRUD operations with tenant context
6. **Leave Management** - Requests, approvals, balance
7. **Attendance** - Check-in/out, tracking
8. **Onboarding & Offboarding** - Checklists, status tracking
9. **Payroll** - Salary structure, loans, payslip generation
10. **Email Templates** - All email notifications
11. **Reports & Dashboards** - Analytics, exports
12. **Testing & Deployment** - Quality assurance, production

---

## 25. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hr_tool

# Authentication
JWT_SECRET=your-jwt-secret-key
SESSION_EXPIRY=7d

# Multi-Tenancy
MULTI_TENANT_ENABLED=true  # Set to 'false' for single-company mode
DEFAULT_TENANT_ID=  # For single-tenant mode

# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RATE_LIMIT_REQUESTS=5
OTP_RATE_LIMIT_WINDOW_MINUTES=15

# Email Configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxx

# Optional: Other Email Providers
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
BREVO_API_KEY=xxxxx
ZEPTOMAIL_API_KEY=xxxxx
ZEPTOMAIL_DOMAIN=api.zeptomail.com

# Email Settings
EMAIL_FROM=noreply@yourcompany.com
EMAIL_FROM_NAME=HR Portal
EMAIL_REPLY_TO=support@yourcompany.com

# Fallback Email Provider
EMAIL_FALLBACK_PROVIDER=mailgun
EMAIL_FALLBACK_ENABLED=true

# Storage (for documents)
UPLOADTHING_SECRET=sk_xxxxx
UPLOADTHING_APP_ID=app_xxxxx

# App
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

---

## 26. KEY ADVANTAGES OF THIS ARCHITECTURE

### Single Project Benefits

- One codebase for frontend and backend
- Shared types between frontend and backend
- No CORS configuration needed
- Easier deployment and maintenance
- Faster development with context switching eliminated
- Cost effective (one hosting platform)
- Built-in API routes with Next.js
- Server components can directly access database

### Passwordless Auth Benefits

- No passwords to manage or store
- No password reset flow needed
- Reduced security risks (no password breaches)
- Better user experience (no passwords to remember)
- Modern and secure authentication
- Email-based verification built-in
- Reduced support tickets for password issues

### Multi-Tenancy Benefits

- Single codebase serving multiple companies
- Complete data isolation between tenants
- Company-specific branding and settings
- Reduced infrastructure costs (one deployment)
- Simplified maintenance (one codebase)
- Scalable to thousands of tenants
- Optional - can be disabled for single-company use

### Drizzle ORM Benefits

- Type-safe SQL query builder
- Full TypeScript support
- Lightweight and fast
- No complex ORM overhead
- Easy migrations
- Great for complex queries
- Active development community

---

## 27. MULTI-TENANT ARCHITECTURE DECISIONS

### Decision 1: Optional Multi-Tenancy

**Why:** Not all organizations need multi-tenancy. By making it optional, we keep the system simple for single companies while enabling advanced capabilities for those who need it.

**Implementation:**

- Environment variable: MULTI_TENANT_ENABLED
- Single-tenant mode uses default tenant
- Multi-tenant mode enables all tenant features
- Setup wizard guides the choice

### Decision 2: Database-Level Isolation

**Why:** PostgreSQL RLS provides the strongest security guarantees and prevents accidental data leaks between tenants.

**Implementation:**

- Enable RLS on all tenant tables
- Set tenant context in session
- Automatic filtering on all queries
- Application-level validation as additional layer

### Decision 3: User Association Model

**Why:** Users need to work across multiple companies (e.g., HR consultants, contractors).

**Implementation:**

- User-tenant association table
- Users can have different roles per tenant
- Tenant switching UI for users with multiple companies
- Session stores current tenant context

### Decision 4: Tenant-Specific Branding

**Why:** Each company wants its own look and feel.

**Implementation:**

- Store branding settings in tenant table
- Dynamically apply CSS variables
- Company logo in header
- Favicon and meta tags

---

**Total Features: ~118+**  
**Tech Stack: Next.js 15+ (Frontend + Backend) with TypeScript, Drizzle ORM, PostgreSQL, Passwordless Auth (OTP)**  
**Deployment: Vercel (Primary)**  
**Estimated Development: 4.5-5 months**  
**Multi-Tenancy: Optional, configurable during setup**

---

_This document provides a complete feature list and technical specification for building a minimalist HR tool with a single Next.js project, Drizzle ORM, passwordless authentication architecture, and optional multi-tenancy support for multiple companies._
