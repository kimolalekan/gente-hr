# Gente — Multi-Tenant HR Platform

A complete HR management system for companies of any size. One installation serves multiple companies with their own branding, language, and settings.

[![Docker build](https://github.com/kimolalekan/gente-hr/actions/workflows/docker.yml/badge.svg)](https://github.com/kimolalekan/gente-hr/actions/workflows/docker.yml)
[![Docker](https://img.shields.io/badge/docker-ghcr.io-2496ed?logo=docker&logoColor=white)](https://github.com/kimolalekan/gente-hr/pkgs/container/gente-hr)

---

## What It Does

Manage your entire people workflow in one place:

- **Hiring** — Post jobs, screen candidates, schedule interviews, send offers
- **Onboarding** — Invite new hires, collect their details, track task completion
- **Attendance** — Daily check-in/out, team presence overview
- **Leave** — Request time off, approve requests, view team calendar
- **Payroll** — Run monthly payroll, generate payslips, manage employee loans
- **Performance** — Create review cycles with self and manager feedback
- **Offboarding** — Manage exits with checklists and exit interviews

---

## For Companies

### Each Company Gets:

- Custom branding (logo, colors, favicon)
- Own language and timezone
- Separate employee data and settings
- Custom email configuration

### Roles:

- **Admin** — Full access to everything
- **HR** — Manage employees, hiring, payroll, and reviews
- **Member** — Self-service: view profile, request leave, submit reviews

---

## For Users

### Employee Experience:

- Passwordless login with 6-digit code (no passwords to remember)
- Personal dashboard with everything you need
- Request leave, check attendance, view payslips
- Complete self-reviews and manager feedback
- Update personal details and documents

---

## Getting Started

### What You Need:

- Linux, macOS, or Windows
- **Node.js 24+ (LTS)** and **pnpm 11+** installed
- **PostgreSQL 16+** database
- **Email API** from zeptomail, mailgun, or resend

### Installation Steps:

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up the database**

   ```bash
   pnpm db:migrate
   ```

3. **Load demo data** (to test the system)

   ```bash
   pnpm db:seed
   ```

4. **Start the application**

   ```bash
   pnpm dev
   ```

5. **Open your browser** at `http://localhost:4001`

### First-Time Setup:

- Visit `/setup` to configure your workspace
- Set your company name, currency, timezone, and language
- Choose a color theme
- Configure email for sending notifications

---

## Docker

The app ships as a container image published to **GitHub Container Registry** by the [`Docker` GitHub Action](.github/workflows/docker.yml): on every push to `main` it builds the image and tags it `latest` + commit SHA, and version tags (`v1.2.3`) produce semver-tagged images.

```bash
# Pull the latest image
# docker pull ghcr.io/kimolalekan/gente-hr:latest

# Run it against a Postgres database
# docker run --rm -p 4001:4001 \
#   -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/gente \
#   -e AUTH_SESSION_SECRET=change-me \
#   ghcr.io/kimolalekan/gente-hr:latest
```

Or run the full stack (app + database) with Compose — first boot applies migrations and seeds the demo data:

```bash
docker compose up -d --build
```

See `docs.md` → Deployment for details.

---

## Login

### How It Works:

1. Enter your email address on the login page
2. Receive a 6-digit code (emailed or shown in console during setup)
3. Enter the code — no password needed
4. You're in!

### Demo Accounts (for testing):

| Email                    | Role                |
| ------------------------ | ------------------- |
| `admin@gente.dev`        | Admin (full access) |
| `priya.sharma@gente.dev` | HR manager          |
| `marco.rossi@gente.dev`  | Employee            |

---

## Administration

### Settings Panel (`/settings`) lets you:

**Company**

- Update company profile and description
- Set working days and office hours
- Configure employee ID format

**Branding**

- Upload logo and favicon
- Choose or create custom color theme
- Set light/dark mode

**Email**

- Configure email provider (Resend, Mailgun, Brevo, etc.)
- Test email delivery

**Users**

- Invite new employees
- Assign roles (Admin, HR, Member)
- Manage departments

---

## Supported Languages

- English
- Spanish
- French
- Portuguese

Dates, numbers, and calendars automatically adapt to the user's language.

---

## System Requirements

| Requirement | Minimum                      |
| ----------- | ---------------------------- |
| Node.js     | 22+                          |
| Database    | PostgreSQL 16+               |
| RAM         | 2 GB                         |
| Storage     | 10 GB (depends on documents) |

---

## Support

### Documentation

- Full architecture guide in `docs.md`
- API documentation available in the codebase

### Getting Help

- Check the setup wizard for guided configuration
- Demo data included to test all features before going live

---

## License

Released under the [MIT License](LICENSE) © 2026 Olalekan Alegre.
