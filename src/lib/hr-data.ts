/**
 * Shared HR types, formatters and label maps.
 *
 * All page data now comes from the API endpoints (`src/app/api/*`); this
 * module only carries the TypeScript shapes the UI is written against, plus a
 * few pure helpers (date/currency formatting, status labels, onboarding
 * progress). There is deliberately NO demo data here anymore.
 */

/* ------------------------------------------------------------------ */
/* Employees                                                           */
/* ------------------------------------------------------------------ */

export type EmployeeStatus = "active" | "on_leave" | "pending";

/** Structured employee location — street, state/province and country. */
export interface EmployeeAddress {
  address?: string;
  state?: string;
  country?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  address: EmployeeAddress | null;
  status: EmployeeStatus;
  joinedAt: string; // ISO date
  salary: number;
  manager: string;
  phone: string;
}

/** Human-readable address line, e.g. "1 Main St, Lagos, Nigeria". */
export function formatAddress(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const address = value as Record<string, unknown>;
  return [address.address, address.state, address.country]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    )
    .join(", ");
}

/* ------------------------------------------------------------------ */
/* Payroll breakdown                                                    */
/* ------------------------------------------------------------------ */

/** One line of the payslip breakdown (earnings or deduction). */
export interface PayrollComponent {
  key: string;
  label: string;
  enabled: boolean;
}

/** How a payslip is broken down — configured in Settings → Payroll. */
export interface PayrollBreakdown {
  earnings: PayrollComponent[];
  deductions: PayrollComponent[];
}

/** Amount fields a payslip carries, keyed by the breakdown component keys. */
export interface PayslipAmounts {
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  tax: number;
  pension: number;
  insurance: number;
  loanEmi: number;
}

export const DEFAULT_PAYROLL_BREAKDOWN: PayrollBreakdown = {
  earnings: [
    { key: "basic", label: "Basic salary", enabled: true },
    { key: "hra", label: "HRA", enabled: true },
    { key: "allowances", label: "Transport allowance", enabled: true },
    { key: "bonus", label: "Bonus", enabled: true },
  ],
  deductions: [
    { key: "tax", label: "Income tax", enabled: true },
    { key: "pension", label: "Pension", enabled: true },
    { key: "insurance", label: "Insurance", enabled: true },
    { key: "loanEmi", label: "Loan EMI", enabled: true },
  ],
};

/**
 * Merge a saved breakdown (tenant settings) over the defaults, keyed by
 * component key. Invalid/unknown entries fall back to the default component.
 */
export function mergePayrollBreakdown(saved: unknown): PayrollBreakdown {
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved)
      ? (saved as Record<string, unknown>)
      : {};
  const resolve = (
    defaults: PayrollComponent[],
    raw: unknown,
  ): PayrollComponent[] => {
    const list = Array.isArray(raw) ? (raw as unknown[]) : [];
    return defaults.map((component) => {
      const match = list.find(
        (item) =>
          item !== null &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          (item as Record<string, unknown>).key === component.key,
      );
      if (!match) return component;
      const savedComponent = match as Record<string, unknown>;
      return {
        key: component.key,
        label:
          typeof savedComponent.label === "string" &&
          savedComponent.label.trim().length > 0
            ? savedComponent.label.trim()
            : component.label,
        enabled:
          typeof savedComponent.enabled === "boolean"
            ? savedComponent.enabled
            : component.enabled,
      };
    });
  };
  return {
    earnings: resolve(DEFAULT_PAYROLL_BREAKDOWN.earnings, source.earnings),
    deductions: resolve(
      DEFAULT_PAYROLL_BREAKDOWN.deductions,
      source.deductions,
    ),
  };
}

/**
 * Resolve a payslip's earnings/deductions rows from the configured
 * breakdown — only enabled components, with their configured labels.
 */
export function payslipBreakdownRows(
  breakdown: PayrollBreakdown,
  amounts: PayslipAmounts,
): {
  earnings: { label: string; value: number }[];
  deductions: { label: string; value: number }[];
} {
  const resolve = (components: PayrollComponent[]) =>
    components
      .filter((component) => component.enabled)
      .map((component) => ({
        label: component.label,
        value: amounts[component.key as keyof PayslipAmounts] ?? 0,
      }));
  return {
    earnings: resolve(breakdown.earnings),
    deductions: resolve(breakdown.deductions),
  };
}

/** Amount keys an employee salary breakdown carries (annual, excl. loan EMI). */
export const SALARY_KEYS = [
  "basic",
  "hra",
  "allowances",
  "bonus",
  "tax",
  "pension",
  "insurance",
] as const;

export type SalaryKey = (typeof SALARY_KEYS)[number];

/**
 * Merge a saved employee salary breakdown (JSON field on the employee) over
 * zero defaults, keyed by the payroll component keys.
 */
export function mergeSalaryBreakdown(saved: unknown): Record<string, number> {
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved)
      ? (saved as Record<string, unknown>)
      : {};
  const result: Record<string, number> = {};
  for (const key of SALARY_KEYS) {
    const value = Number(source[key]);
    result[key] = Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
  }
  return result;
}

/** Annual gross pay = sum of the earnings components. */
export function salaryGross(breakdown: Record<string, number>): number {
  return (
    (breakdown.basic ?? 0) +
    (breakdown.hra ?? 0) +
    (breakdown.allowances ?? 0) +
    (breakdown.bonus ?? 0)
  );
}

/* ------------------------------------------------------------------ */
/* Leave                                                               */
/* ------------------------------------------------------------------ */

export type LeaveType = "vacation" | "sick" | "parental" | "other";
export type LeaveStatus = "approved" | "pending" | "declined" | "cancelled";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  start: string;
  end: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
}

export interface LeaveBalance {
  employeeId: string;
  vacation: { total: number; used: number };
  sick: { total: number; used: number };
  personal: { total: number; used: number };
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick leave",
  parental: "Parental leave",
  other: "Other",
};

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

export type AttendanceStatus =
  "present" | "late" | "remote" | "on_leave" | "absent";

export interface AttendanceRecord {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: AttendanceStatus;
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface OnboardingTask {
  id: string;
  name: string;
  department: "HR" | "IT" | "Admin";
  status: TaskStatus;
  due: string;
}

export interface OnboardingPlan {
  id: string;
  /** Null until the invite is accepted and an employee record exists. */
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  state: string;
  country: string;
  /** Signed offer letter submitted by the employee (file name). */
  signedOfferLetter?: string;
  startDate: string;
  targetDate: string;
  status: "invited" | "in_progress" | "completed";
  tasks: OnboardingTask[];
}

export function getOnboardingProgress(plan: OnboardingPlan): number {
  const done = plan.tasks.filter((task) => task.status === "completed").length;
  return plan.tasks.length > 0
    ? Math.round((done / plan.tasks.length) * 100)
    : 0;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

/* ------------------------------------------------------------------ */
/* Offboarding                                                         */
/* ------------------------------------------------------------------ */

export type ExitReason =
  "resignation" | "termination" | "retirement" | "contract_end";

export interface OffboardingChecklistItem {
  id: string;
  name: string;
  done: boolean;
}

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
  contract_end: "Contract end",
};

/* ------------------------------------------------------------------ */
/* ATS — Recruitment & Hiring                                          */
/* ------------------------------------------------------------------ */

export type JobStatus = "draft" | "open" | "closed";
export type ApplicationStage =
  "new" | "screening" | "interview" | "offer" | "hired" | "rejected";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";
export type OfferStatus = "sent" | "accepted" | "declined";

/** Job posting as returned by the ATS API. */
export interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  status: JobStatus;
  /** Screening questions candidates answer when applying. */
  questions: string[];
  /** Optional screening quiz assigned to the job. */
  quizId: string | null;
  quizName: string | null;
  applications: number;
  createdAt: string;
}

/** Candidate application as returned by the ATS API. */
export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  state: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  stage: ApplicationStage;
  notes: string | null;
  answers: Record<string, string> | null;
  quizResult: QuizResult | null;
  createdAt: string;
}

/** Multiple-choice screening quiz question (configured by HR/admin). */
export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

/** Screening quiz as served to candidates — correct answers are stripped. */
export interface QuizForCandidate {
  id: string;
  name: string;
  description: string | null;
  questions: Array<{ question: string; options: string[] }>;
}

/** A candidate's quiz outcome: score, total and chosen option indices. */
export interface QuizResult {
  score: number;
  total: number;
  answers: number[];
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export const APPLICATION_STAGES: ApplicationStage[] = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  new: "New",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  intern: "Intern",
};

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
};

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

export type LoanType = "personal" | "advance" | "vehicle" | "other";
export type LoanStatus = "pending" | "approved" | "active" | "paid";

export interface Loan {
  id: string;
  employeeId: string;
  type: LoanType;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthly: number;
  disbursedAt: string;
  paidMonths: number;
  status: LoanStatus;
}

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  personal: "Personal",
  advance: "Salary advance",
  vehicle: "Vehicle",
  other: "Other",
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export interface AppNotification {
  id: string;
  type:
    | "leave"
    | "onboarding"
    | "payroll"
    | "loan"
    | "performance"
    | "interview"
    | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
}

export const NOTIFICATION_TYPE_LABELS: Record<AppNotification["type"], string> =
  {
    leave: "Leave",
    onboarding: "Onboarding",
    payroll: "Payroll",
    loan: "Loans",
    performance: "Performance",
    interview: "Interviews",
    system: "System",
  };

/* ------------------------------------------------------------------ */
/* Audit logs                                                          */
/* ------------------------------------------------------------------ */

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  category: "auth" | "payroll" | "leave" | "employee" | "email" | "settings";
  time: string;
}

export const AUDIT_CATEGORY_LABELS: Record<AuditLog["category"], string> = {
  auth: "Authentication",
  payroll: "Payroll",
  leave: "Leave",
  employee: "Employees",
  email: "Email",
  settings: "Settings",
};

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export { formatDate } from "./i18n/dates";
