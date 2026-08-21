/**
 * HR demo data for the Gente platform pages. In a production deployment this
 * would come from the database; the page components are written against these
 * types so swapping in Drizzle queries later is mechanical.
 */

export type EmployeeStatus = "active" | "on_leave" | "pending";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  location: string;
  status: EmployeeStatus;
  joinedAt: string; // ISO date
  salary: number;
  manager: string;
  phone: string;
}

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

export interface PayrollRun {
  id: string;
  period: string;
  processedAt: string;
  total: number;
  employees: number;
  status: "completed" | "processing" | "draft";
}

export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  metric: string;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

/** Company departments (demo data — mirrors the `departments` table). */
export const DEPARTMENTS_DATA: Department[] = [
  {
    id: "dept_001",
    name: "Engineering",
    description:
      "Builds and maintains the product, platform and internal tooling.",
    active: true,
  },
  {
    id: "dept_002",
    name: "Design",
    description: "Product design, brand and user experience.",
    active: true,
  },
  {
    id: "dept_003",
    name: "Finance",
    description: "Accounting, budgeting and financial planning.",
    active: true,
  },
  {
    id: "dept_004",
    name: "People",
    description: "Recruiting, onboarding, HR operations and culture.",
    active: true,
  },
  {
    id: "dept_005",
    name: "Sales",
    description: "Revenue, account management and go-to-market.",
    active: true,
  },
  {
    id: "dept_006",
    name: "Operations",
    description: "Business operations, facilities and logistics.",
    active: true,
  },
  {
    id: "dept_007",
    name: "Data",
    description: "Analytics, data engineering and business intelligence.",
    active: true,
  },
  {
    id: "dept_008",
    name: "Executive",
    description: "Company leadership and strategic direction.",
    active: true,
  },
  {
    id: "dept_009",
    name: "Legal",
    description: "Legal and compliance — currently paused.",
    active: false,
  },
];

/** Active department names, for filters and selects. */
export const DEPARTMENTS: string[] = DEPARTMENTS_DATA.filter(
  (department) => department.active,
).map((department) => department.name);

export const EMPLOYEES: Employee[] = [
  {
    id: "emp_001",
    name: "Priya Sharma",
    email: "priya.sharma@gente.dev",
    role: "Head of Engineering",
    department: "Engineering",
    location: "London",
    status: "active",
    joinedAt: "2019-03-11",
    salary: 185000,
    manager: "Ada Admin",
    phone: "+44 20 7946 0958",
  },
  {
    id: "emp_002",
    name: "Marco Rossi",
    email: "marco.rossi@gente.dev",
    role: "Senior Product Designer",
    department: "Design",
    location: "Milan",
    status: "active",
    joinedAt: "2021-06-01",
    salary: 112000,
    manager: "Ada Admin",
    phone: "+39 02 3600 2241",
  },
  {
    id: "emp_003",
    name: "Sofia Andersson",
    email: "sofia.andersson@gente.dev",
    role: "People Partner",
    department: "People",
    location: "Stockholm",
    status: "on_leave",
    joinedAt: "2020-01-20",
    salary: 98000,
    manager: "Ada Admin",
    phone: "+46 8 5400 3312",
  },
  {
    id: "emp_004",
    name: "David Chen",
    email: "david.chen@gente.dev",
    role: "Staff Engineer",
    department: "Engineering",
    location: "Singapore",
    status: "active",
    joinedAt: "2018-09-04",
    salary: 172000,
    manager: "Priya Sharma",
    phone: "+65 6221 8890",
  },
  {
    id: "emp_005",
    name: "Amara Okafor",
    email: "amara.okafor@gente.dev",
    role: "Financial Controller",
    department: "Finance",
    location: "Lagos",
    status: "active",
    joinedAt: "2022-02-14",
    salary: 124000,
    manager: "Ada Admin",
    phone: "+234 1 277 6400",
  },
  {
    id: "emp_006",
    name: "Lucas Meyer",
    email: "lucas.meyer@gente.dev",
    role: "Sales Director",
    department: "Sales",
    location: "Berlin",
    status: "active",
    joinedAt: "2019-11-05",
    salary: 158000,
    manager: "Ada Admin",
    phone: "+49 30 555 0187",
  },
  {
    id: "emp_007",
    name: "Elena Petrova",
    email: "elena.petrova@gente.dev",
    role: "Data Scientist",
    department: "Data",
    location: "Amsterdam",
    status: "active",
    joinedAt: "2021-08-16",
    salary: 121000,
    manager: "Priya Sharma",
    phone: "+31 20 244 9081",
  },
  {
    id: "emp_008",
    name: "James O'Brien",
    email: "james.obrien@gente.dev",
    role: "Backend Engineer",
    department: "Engineering",
    location: "Dublin",
    status: "pending",
    joinedAt: "2026-07-27",
    salary: 105000,
    manager: "David Chen",
    phone: "+353 1 234 5566",
  },
  {
    id: "emp_009",
    name: "Yuki Tanaka",
    email: "yuki.tanaka@gente.dev",
    role: "Brand Designer",
    department: "Design",
    location: "Tokyo",
    status: "active",
    joinedAt: "2022-05-23",
    salary: 101000,
    manager: "Marco Rossi",
    phone: "+81 3 5550 4488",
  },
  {
    id: "emp_010",
    name: "Fatima Al-Sayed",
    email: "fatima.alsayed@gente.dev",
    role: "Operations Lead",
    department: "Operations",
    location: "Dubai",
    status: "active",
    joinedAt: "2020-10-12",
    salary: 118000,
    manager: "Ada Admin",
    phone: "+971 4 350 7732",
  },
  {
    id: "emp_011",
    name: "Noah Williams",
    email: "noah.williams@gente.dev",
    role: "Account Executive",
    department: "Sales",
    location: "New York",
    status: "on_leave",
    joinedAt: "2023-01-09",
    salary: 92000,
    manager: "Lucas Meyer",
    phone: "+1 212 555 0142",
  },
  {
    id: "emp_012",
    name: "Aisha Bello",
    email: "aisha.bello@gente.dev",
    role: "People Operations",
    department: "People",
    location: "Lagos",
    status: "active",
    joinedAt: "2023-04-03",
    salary: 84000,
    manager: "Sofia Andersson",
    phone: "+234 1 277 6455",
  },
  {
    id: "emp_013",
    name: "Ada Admin",
    email: "admin@gente.dev",
    role: "Chief Executive Officer",
    department: "Executive",
    location: "London",
    status: "active",
    joinedAt: "2018-01-15",
    salary: 220000,
    manager: "Board of Directors",
    phone: "+44 20 7946 0001",
  },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lv_001",
    employeeId: "emp_011",
    type: "vacation",
    start: "2026-08-24",
    end: "2026-08-28",
    days: 5,
    status: "pending",
    reason: "Family trip to the Catskills",
  },
  {
    id: "lv_002",
    employeeId: "emp_010",
    type: "sick",
    start: "2026-08-18",
    end: "2026-08-19",
    days: 2,
    status: "pending",
    reason: "Migraine — resting at home",
  },
  {
    id: "lv_003",
    employeeId: "emp_003",
    type: "parental",
    start: "2026-08-01",
    end: "2026-10-30",
    days: 65,
    status: "approved",
  },
  {
    id: "lv_004",
    employeeId: "emp_002",
    type: "vacation",
    start: "2026-09-07",
    end: "2026-09-11",
    days: 5,
    status: "approved",
    reason: "Summer break",
  },
  {
    id: "lv_005",
    employeeId: "emp_007",
    type: "other",
    start: "2026-08-20",
    end: "2026-08-20",
    days: 1,
    status: "declined",
    reason: "Conference travel day (policy: use business travel budget)",
  },
  {
    id: "lv_006",
    employeeId: "emp_004",
    type: "vacation",
    start: "2026-09-14",
    end: "2026-09-18",
    days: 5,
    status: "pending",
    reason: "Trip to Japan",
  },
  {
    id: "lv_007",
    employeeId: "emp_009",
    type: "sick",
    start: "2026-08-14",
    end: "2026-08-14",
    days: 1,
    status: "approved",
  },
  {
    id: "lv_008",
    employeeId: "emp_012",
    type: "vacation",
    start: "2026-10-05",
    end: "2026-10-09",
    days: 5,
    status: "pending",
    reason: "Wedding in Abuja",
  },
];

export const LEAVE_BALANCES: LeaveBalance[] = [
  {
    employeeId: "emp_001",
    vacation: { total: 25, used: 9 },
    sick: { total: 10, used: 2 },
    personal: { total: 5, used: 1 },
  },
  {
    employeeId: "emp_002",
    vacation: { total: 25, used: 12 },
    sick: { total: 10, used: 0 },
    personal: { total: 5, used: 2 },
  },
  {
    employeeId: "emp_003",
    vacation: { total: 25, used: 18 },
    sick: { total: 10, used: 3 },
    personal: { total: 5, used: 0 },
  },
  {
    employeeId: "emp_004",
    vacation: { total: 25, used: 7 },
    sick: { total: 10, used: 1 },
    personal: { total: 5, used: 1 },
  },
  {
    employeeId: "emp_005",
    vacation: { total: 25, used: 11 },
    sick: { total: 10, used: 0 },
    personal: { total: 5, used: 0 },
  },
  {
    employeeId: "emp_006",
    vacation: { total: 25, used: 15 },
    sick: { total: 10, used: 2 },
    personal: { total: 5, used: 2 },
  },
  {
    employeeId: "emp_007",
    vacation: { total: 25, used: 6 },
    sick: { total: 10, used: 0 },
    personal: { total: 5, used: 0 },
  },
  {
    employeeId: "emp_008",
    vacation: { total: 25, used: 0 },
    sick: { total: 10, used: 0 },
    personal: { total: 5, used: 0 },
  },
  {
    employeeId: "emp_009",
    vacation: { total: 25, used: 8 },
    sick: { total: 10, used: 1 },
    personal: { total: 5, used: 0 },
  },
  {
    employeeId: "emp_010",
    vacation: { total: 25, used: 10 },
    sick: { total: 10, used: 2 },
    personal: { total: 5, used: 1 },
  },
  {
    employeeId: "emp_011",
    vacation: { total: 25, used: 20 },
    sick: { total: 10, used: 4 },
    personal: { total: 5, used: 2 },
  },
  {
    employeeId: "emp_012",
    vacation: { total: 25, used: 3 },
    sick: { total: 10, used: 0 },
    personal: { total: 5, used: 1 },
  },
];

export const PAYROLL_RUNS: PayrollRun[] = [
  {
    id: "pr_003",
    period: "August 2026",
    processedAt: "2026-08-31",
    total: 412000,
    employees: 248,
    status: "draft",
  },
  {
    id: "pr_002",
    period: "July 2026",
    processedAt: "2026-07-31",
    total: 408540,
    employees: 244,
    status: "completed",
  },
  {
    id: "pr_001",
    period: "June 2026",
    processedAt: "2026-06-30",
    total: 401220,
    employees: 241,
    status: "completed",
  },
];

export interface PayrollEntry {
  employeeId: string;
  gross: number;
  deductions: number;
  net: number;
  status: "paid" | "pending";
}

/** Deterministic per-run payroll lines computed from employee salaries. */
export function getPayrollEntries(runId: string): PayrollEntry[] {
  const run = PAYROLL_RUNS.find((item) => item.id === runId);
  if (!run) return [];
  const paid = run.status === "completed";
  const processingPaid = run.status === "processing";
  return EMPLOYEES.map((employee, index) => {
    const gross = Math.round(employee.salary / 12);
    const deductions = Math.round(gross * 0.22);
    return {
      employeeId: employee.id,
      gross,
      deductions,
      net: gross - deductions,
      status: paid || (processingPaid && index % 2 === 0) ? "paid" : "pending",
    };
  });
}

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

/** Today's attendance snapshot (2026-08-19). */
export const ATTENDANCE_TODAY: AttendanceRecord[] = [
  {
    employeeId: "emp_001",
    date: "2026-08-19",
    checkIn: "08:58",
    checkOut: "17:52",
    hours: 8.4,
    status: "present",
  },
  {
    employeeId: "emp_002",
    date: "2026-08-19",
    checkIn: "09:31",
    checkOut: "18:05",
    hours: 7.9,
    status: "late",
  },
  {
    employeeId: "emp_003",
    date: "2026-08-19",
    checkIn: "—",
    checkOut: "—",
    hours: 0,
    status: "on_leave",
  },
  {
    employeeId: "emp_004",
    date: "2026-08-19",
    checkIn: "08:42",
    checkOut: "17:20",
    hours: 8.1,
    status: "present",
  },
  {
    employeeId: "emp_005",
    date: "2026-08-19",
    checkIn: "09:05",
    checkOut: "17:45",
    hours: 8.0,
    status: "present",
  },
  {
    employeeId: "emp_006",
    date: "2026-08-19",
    checkIn: "08:30",
    checkOut: "18:30",
    hours: 9.0,
    status: "present",
  },
  {
    employeeId: "emp_007",
    date: "2026-08-19",
    checkIn: "—",
    checkOut: "—",
    hours: 0,
    status: "remote",
  },
  {
    employeeId: "emp_008",
    date: "2026-08-19",
    checkIn: "—",
    checkOut: "—",
    hours: 0,
    status: "absent",
  },
  {
    employeeId: "emp_009",
    date: "2026-08-19",
    checkIn: "09:02",
    checkOut: "17:58",
    hours: 8.3,
    status: "present",
  },
  {
    employeeId: "emp_010",
    date: "2026-08-19",
    checkIn: "—",
    checkOut: "—",
    hours: 0,
    status: "remote",
  },
  {
    employeeId: "emp_011",
    date: "2026-08-19",
    checkIn: "—",
    checkOut: "—",
    hours: 0,
    status: "on_leave",
  },
  {
    employeeId: "emp_012",
    date: "2026-08-19",
    checkIn: "09:12",
    checkOut: "17:30",
    hours: 7.8,
    status: "present",
  },
  {
    employeeId: "emp_013",
    date: "2026-08-19",
    checkIn: "08:50",
    checkOut: "18:10",
    hours: 8.7,
    status: "present",
  },
];

export const ATTENDANCE_WEEK_TREND = [
  { day: "Mon", presentPct: 96 },
  { day: "Tue", presentPct: 94 },
  { day: "Wed", presentPct: 97 },
  { day: "Thu", presentPct: 92 },
  { day: "Fri", presentPct: 95 },
];

const WEEK_DAYS = [
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
];

/** Deterministic attendance for one employee across the current work week. */
export function getAttendanceWeek(employeeId: string): AttendanceRecord[] {
  const employee = getEmployeeById(employeeId);
  if (!employee) return [];
  const seed = parseInt(employee.id.slice(-2), 10);
  const inTimes = ["08:42", "08:55", "09:07", "09:14"];
  const outTimes = ["17:38", "17:52", "18:05", "18:22"];
  return WEEK_DAYS.map((date, index) => {
    const roll = (seed + index * 2) % 7;
    const status: AttendanceStatus =
      employee.status === "on_leave"
        ? "on_leave"
        : roll === 0
          ? "remote"
          : roll === 1
            ? "late"
            : "present";
    const slot = (seed + index) % inTimes.length;
    return {
      employeeId,
      date,
      checkIn: status === "present" || status === "late" ? inTimes[slot] : "—",
      checkOut:
        status === "present" || status === "late" ? outTimes[slot] : "—",
      hours:
        status === "present"
          ? 8 + ((seed + index) % 5) / 10
          : status === "late"
            ? 7.7
            : 0,
      status,
    };
  });
}

export interface Invoice {
  id: string;
  period: string;
  amount: number;
  status: "paid" | "pending";
  issuedAt: string;
  dueAt: string;
  lineItems: Array<{ description: string; quantity: number; amount: number }>;
}

export const INVOICES: Invoice[] = [
  {
    id: "inv_003",
    period: "August 2026",
    amount: 1240,
    status: "pending",
    issuedAt: "2026-08-01",
    dueAt: "2026-08-31",
    lineItems: [
      {
        description: "Growth plan — 248 employees × $4",
        quantity: 248,
        amount: 992,
      },
      { description: "Custom branding add-on", quantity: 1, amount: 200 },
      { description: "Priority support", quantity: 1, amount: 48 },
    ],
  },
  {
    id: "inv_002",
    period: "July 2026",
    amount: 1224,
    status: "paid",
    issuedAt: "2026-07-01",
    dueAt: "2026-07-31",
    lineItems: [
      {
        description: "Growth plan — 244 employees × $4",
        quantity: 244,
        amount: 976,
      },
      { description: "Custom branding add-on", quantity: 1, amount: 200 },
      { description: "Priority support", quantity: 1, amount: 48 },
    ],
  },
  {
    id: "inv_001",
    period: "June 2026",
    amount: 1212,
    status: "paid",
    issuedAt: "2026-06-01",
    dueAt: "2026-06-30",
    lineItems: [
      {
        description: "Growth plan — 241 employees × $4",
        quantity: 241,
        amount: 964,
      },
      { description: "Custom branding add-on", quantity: 1, amount: 200 },
      { description: "Priority support", quantity: 1, amount: 48 },
    ],
  },
];

export const REPORTS: ReportDefinition[] = [
  {
    id: "rep_001",
    title: "Headcount by department",
    description:
      "Current headcount and open roles per team, with 6-month trend.",
    metric: "248 employees",
  },
  {
    id: "rep_002",
    title: "Turnover & retention",
    description:
      "Voluntary and involuntary turnover, plus retention by tenure band.",
    metric: "11.4% annual",
  },
  {
    id: "rep_003",
    title: "Absenteeism",
    description:
      "Leave usage and sick days per department compared with benchmarks.",
    metric: "2.1 days avg",
  },
  {
    id: "rep_004",
    title: "Payroll summary",
    description: "Gross/net payroll by month, department and country.",
    metric: "$412k this month",
  },
  {
    id: "rep_005",
    title: "Hiring funnel",
    description:
      "Applications → interviews → offers → hires across active openings.",
    metric: "8.2% conversion",
  },
  {
    id: "rep_006",
    title: "Compensation review",
    description:
      "Band penetration and equity distribution for the next review cycle.",
    metric: "92% in band",
  },
];

export function getEmployee(id: string): Employee | undefined {
  return EMPLOYEES.find((employee) => employee.id === id);
}

export function getEmployeeById(id: string): Employee | undefined {
  return getEmployee(id);
}

export function getLeaveBalance(employeeId: string): LeaveBalance | undefined {
  return LEAVE_BALANCES.find((balance) => balance.employeeId === employeeId);
}

export function getLeaveRequest(id: string): LeaveRequest | undefined {
  return LEAVE_REQUESTS.find((request) => request.id === id);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick leave",
  parental: "Parental leave",
  other: "Other",
};

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
  /** Placeholder until the invite is accepted and an employee record exists. */
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

const STANDARD_TASKS: Array<Omit<OnboardingTask, "id" | "status" | "due">> = [
  { name: "ID card issuance", department: "Admin" },
  { name: "Laptop & equipment allocation", department: "IT" },
  { name: "Email & system account creation", department: "IT" },
  { name: "Workspace assignment", department: "Admin" },
  { name: "Welcome kit delivery", department: "HR" },
  { name: "Policy document acknowledgment", department: "HR" },
  { name: "Orientation session scheduling", department: "HR" },
];

function buildTasks(
  statuses: TaskStatus[],
  due = "2026-08-28",
): OnboardingTask[] {
  return STANDARD_TASKS.map((task, index) => ({
    id: `task_${index + 1}`,
    name: task.name,
    department: task.department,
    status: statuses[index] ?? "pending",
    due,
  }));
}

export const ONBOARDING_PLANS: OnboardingPlan[] = [
  {
    id: "ob_001",
    employeeId: "emp_008", // James O'Brien
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
    tasks: buildTasks([
      "completed",
      "completed",
      "completed",
      "in_progress",
      "pending",
      "pending",
      "pending",
    ]),
  },
  {
    id: "ob_002",
    employeeId: "emp_012", // Aisha Bello
    fullName: "Aisha Bello",
    email: "aisha.bello@gente.dev",
    phone: "+234 803 555 0190",
    address: "27B Adeola Odeku Street",
    state: "Lagos",
    country: "Nigeria",
    startDate: "2026-08-03",
    targetDate: "2026-08-31",
    status: "in_progress",
    tasks: buildTasks([
      "completed",
      "completed",
      "in_progress",
      "in_progress",
      "pending",
      "pending",
      "pending",
    ]),
  },
  {
    id: "ob_003",
    employeeId: "emp_002", // Marco Rossi (historical)
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
    tasks: buildTasks([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
    ]),
  },
];

export function getOnboardingPlan(id: string): OnboardingPlan | undefined {
  return ONBOARDING_PLANS.find((plan) => plan.id === id);
}

/** Create an onboarding invite for a person who doesn't exist yet. The rest of
 * their details are collected from the emailed link (employee onboarding form). */
export function createOnboardingPlan(input: {
  fullName: string;
  email: string;
}): OnboardingPlan {
  const start = new Date();
  const target = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return {
    id: `ob_${Date.now().toString(36)}`,
    employeeId: `newhire_${Date.now().toString(36)}`,
    fullName: input.fullName,
    email: input.email,
    phone: "",
    address: "",
    state: "",
    country: "",
    startDate: start.toISOString().slice(0, 10),
    targetDate: target.toISOString().slice(0, 10),
    status: "invited",
    tasks: buildTasks(
      Array(STANDARD_TASKS.length).fill("pending"),
      target.toISOString().slice(0, 10),
    ),
  };
}

export function getOnboardingProgress(plan: OnboardingPlan): number {
  const done = plan.tasks.filter((task) => task.status === "completed").length;
  return Math.round((done / plan.tasks.length) * 100);
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

export interface Offboarding {
  id: string;
  employeeId: string;
  reason: ExitReason;
  lastWorkingDay: string;
  status: "in_progress" | "completed";
  /** Termination letter attached by the company (file name). */
  terminationLetter?: string;
  checklist: OffboardingChecklistItem[];
  notes?: string;
}

/** Available exit-checklist items (selectable when starting an offboarding). */
export const EXIT_CHECKLIST: Array<
  Omit<OffboardingChecklistItem, "id" | "done">
> = [
  { name: "Asset return (laptop, phone, ID card)" },
  { name: "System access revocation (email, tools)" },
  { name: "HR exit formalities" },
  { name: "Final settlement processing" },
  { name: "Experience letter generation" },
];

function buildChecklist(doneFlags: boolean[]): OffboardingChecklistItem[] {
  return EXIT_CHECKLIST.map((item, index) => ({
    id: `exit_${index + 1}`,
    name: item.name,
    done: doneFlags[index] ?? false,
  }));
}

export const OFFBOARDINGS: Offboarding[] = [
  {
    id: "off_001",
    employeeId: "emp_006", // Lucas Meyer
    reason: "resignation",
    lastWorkingDay: "2026-09-30",
    status: "in_progress",
    terminationLetter: "termination_letter_lucas_meyer.pdf",
    checklist: buildChecklist([true, true, true, false, false]),
    notes: "Moving to a competitor — handover to the EMEA team in progress.",
  },
  {
    id: "off_002",
    employeeId: "emp_010", // Fatima Al-Sayed
    reason: "contract_end",
    lastWorkingDay: "2026-08-31",
    status: "in_progress",
    terminationLetter: "termination_letter_fatima_al_sayed.pdf",
    checklist: buildChecklist([true, true, false, false, false]),
    notes: "12-month contract completes end of August.",
  },
];

export function getOffboarding(id: string): Offboarding | undefined {
  return OFFBOARDINGS.find((item) => item.id === id);
}

/** Create a fresh offboarding with the selected checklist items. */
export function createOffboarding(
  employeeId: string,
  reason: ExitReason,
  lastWorkingDay: string,
  checklistNames: string[],
  notes?: string,
  terminationLetter?: string,
): Offboarding {
  return {
    id: `off_${Date.now().toString(36)}`,
    employeeId,
    reason,
    lastWorkingDay,
    status: "in_progress",
    terminationLetter,
    checklist: checklistNames.map((name, index) => ({
      id: `exit_${Date.now().toString(36)}_${index}`,
      name,
      done: false,
    })),
    notes,
  };
}

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  resignation: "Resignation",
  termination: "Termination",
  retirement: "Retirement",
  contract_end: "Contract end",
};

/* ------------------------------------------------------------------ */
/* Performance reviews                                                 */
/* ------------------------------------------------------------------ */

export interface ReviewCycle {
  id: string;
  name: string;
  period: string;
  status: "open" | "closed";
}

export const REVIEW_CYCLES: ReviewCycle[] = [
  {
    id: "cy_2026_h1",
    name: "H1 2026",
    period: "Jan – Jun 2026",
    status: "closed",
  },
  {
    id: "cy_2026_q3",
    name: "Q3 2026",
    period: "Jul – Sep 2026",
    status: "open",
  },
];

export interface PerformanceTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReviewSection[];
  active: boolean;
}

export interface ReviewSection {
  id: string;
  name: string;
  questions: string[];
}

export const PERFORMANCE_TEMPLATES: PerformanceTemplate[] = [
  {
    id: "tpl_standard",
    name: "Standard review",
    description:
      "Default review used for most roles — achievements and growth.",
    active: true,
    sections: [
      {
        id: "tpl_standard_s1",
        name: "Achievements",
        questions: [
          "What went well this period?",
          "Which goals were met or exceeded?",
        ],
      },
      {
        id: "tpl_standard_s2",
        name: "Growth areas",
        questions: [
          "Where should focus go next?",
          "What support is needed to get there?",
        ],
      },
    ],
  },
  {
    id: "tpl_engineering",
    name: "Engineering deep-dive",
    description: "Technical depth, delivery and mentorship for engineers.",
    active: true,
    sections: [
      {
        id: "tpl_engineering_s1",
        name: "Delivery",
        questions: [
          "How did project delivery go this period?",
          "Was any technical debt introduced or paid down?",
        ],
      },
      {
        id: "tpl_engineering_s2",
        name: "Craft & mentorship",
        questions: [
          "Code quality and architecture decisions",
          "Impact on the team through mentoring and review",
        ],
      },
    ],
  },
  {
    id: "tpl_manager",
    name: "Manager 360",
    description: "Feedback for people managers — team, peers and leadership.",
    active: false,
    sections: [
      {
        id: "tpl_manager_s1",
        name: "Team & culture",
        questions: [
          "Team health, hiring and retention",
          "Quality of 1:1s and coaching",
        ],
      },
    ],
  },
];

export function getPerformanceTemplate(
  id: string,
): PerformanceTemplate | undefined {
  return PERFORMANCE_TEMPLATES.find((template) => template.id === id);
}

export interface PerformanceReview {
  id: string;
  cycleId: string;
  employeeId: string;
  reviewer: string;
  templateId: string;
  deadline: string;
  /** How many times the deadline has been extended. */
  deadlineExtended?: number;
  selfRating: number;
  managerRating: number;
  overall: number;
  status: "draft" | "submitted";
  strengths: string;
  growth: string;
}

/** Start a review from a template (the invite email is sent by the UI). */
export function createReview(input: {
  employeeId: string;
  templateId: string;
  deadline: string;
  reviewer: string;
}): PerformanceReview {
  return {
    id: `rev_${Date.now().toString(36)}`,
    cycleId: "cy_2026_q3",
    employeeId: input.employeeId,
    templateId: input.templateId,
    reviewer: input.reviewer,
    deadline: input.deadline,
    status: "draft",
    selfRating: 0,
    managerRating: 0,
    overall: 0,
    strengths: "",
    growth: "",
  };
}

export const REVIEWS: PerformanceReview[] = [
  {
    id: "rev_001",
    employeeId: "emp_004",
    cycleId: "cy_2026_q3",
    reviewer: "Priya Sharma",
    templateId: "tpl_standard",
    deadline: "2026-08-20",
    deadlineExtended: 1,
    selfRating: 4,
    managerRating: 5,
    overall: 4.5,
    status: "submitted",
    strengths:
      "Deep technical leadership on the API migration; excellent code review culture.",
    growth: "Delegate more; take ownership of cross-team roadmaps.",
  },
  {
    id: "rev_002",
    employeeId: "emp_002",
    cycleId: "cy_2026_q3",
    reviewer: "Ada Admin",
    templateId: "tpl_standard",
    deadline: "2026-08-28",
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
    id: "rev_003",
    employeeId: "emp_007",
    cycleId: "cy_2026_q3",
    reviewer: "Priya Sharma",
    templateId: "tpl_engineering",
    deadline: "2026-08-19",
    selfRating: 3,
    managerRating: 4,
    overall: 3.5,
    status: "submitted",
    strengths: "Great model experimentation cadence and clear documentation.",
    growth:
      "Move experiments to production more decisively; communicate tradeoffs earlier.",
  },
  {
    id: "rev_004",
    employeeId: "emp_001",
    cycleId: "cy_2026_h1",
    reviewer: "Ada Admin",
    templateId: "tpl_standard",
    deadline: "2026-06-30",
    selfRating: 5,
    managerRating: 5,
    overall: 5,
    status: "submitted",
    strengths:
      "Outstanding delivery and team building; platform stability improved markedly.",
    growth: "Succession planning for senior engineers.",
  },
  {
    id: "rev_005",
    employeeId: "emp_005",
    cycleId: "cy_2026_h1",
    reviewer: "Ada Admin",
    templateId: "tpl_standard",
    deadline: "2026-06-28",
    selfRating: 4,
    managerRating: 4,
    overall: 4,
    status: "submitted",
    strengths: "Clean monthly close and strong cost control during hiring.",
    growth: "Automate reconciliation workflows to reduce manual effort.",
  },
  {
    id: "rev_006",
    employeeId: "emp_012",
    cycleId: "cy_2026_h1",
    reviewer: "Sofia Andersson",
    templateId: "tpl_standard",
    deadline: "2026-06-29",
    selfRating: 3,
    managerRating: 3,
    overall: 3,
    status: "submitted",
    strengths: "Reliable execution on onboarding and compliance tasks.",
    growth: "Take the lead on policy documentation and process design.",
  },
];

export function getReview(id: string): PerformanceReview | undefined {
  return REVIEWS.find((review) => review.id === id);
}

export function getCycle(cycleId: string): ReviewCycle | undefined {
  return REVIEW_CYCLES.find((cycle) => cycle.id === cycleId);
}

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

export const LOANS: Loan[] = [
  {
    id: "ln_001",
    employeeId: "emp_005",
    type: "vehicle",
    amount: 12000,
    interestRate: 6,
    termMonths: 24,
    monthly: 532,
    disbursedAt: "2026-02-01",
    paidMonths: 6,
    status: "active",
  },
  {
    id: "ln_002",
    employeeId: "emp_002",
    type: "personal",
    amount: 5000,
    interestRate: 4,
    termMonths: 12,
    monthly: 426,
    disbursedAt: "2026-05-01",
    paidMonths: 3,
    status: "active",
  },
  {
    id: "ln_003",
    employeeId: "emp_011",
    type: "advance",
    amount: 2000,
    interestRate: 0,
    termMonths: 6,
    monthly: 333,
    disbursedAt: "2026-07-01",
    paidMonths: 1,
    status: "active",
  },
  {
    id: "ln_004",
    employeeId: "emp_007",
    type: "personal",
    amount: 8000,
    interestRate: 5,
    termMonths: 18,
    monthly: 464,
    disbursedAt: "2025-11-01",
    paidMonths: 9,
    status: "paid",
  },
  {
    id: "ln_005",
    employeeId: "emp_006",
    type: "vehicle",
    amount: 15000,
    interestRate: 6,
    termMonths: 24,
    monthly: 665,
    disbursedAt: "2026-08-05",
    paidMonths: 0,
    status: "pending",
  },
];

export function getLoan(id: string): Loan | undefined {
  return LOANS.find((loan) => loan.id === id);
}

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  personal: "Personal",
  advance: "Salary advance",
  vehicle: "Vehicle",
  other: "Other",
};

export interface RepaymentRow {
  month: number;
  principal: number;
  interest: number;
  emi: number;
  balance: number;
  paid: boolean;
}

/** Approximate flat-rate repayment schedule for a loan. */
export function getRepaymentSchedule(loan: Loan): RepaymentRow[] {
  const principalPerMonth = loan.amount / loan.termMonths;
  let balance = loan.amount;
  return Array.from({ length: loan.termMonths }, (_, index) => {
    const principal = Math.round(principalPerMonth);
    const interest = Math.round((balance * loan.interestRate) / 100 / 12);
    balance = Math.max(0, balance - principal);
    return {
      month: index + 1,
      principal,
      interest,
      emi: principal + interest,
      balance,
      paid: index < loan.paidMonths,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Payslips                                                            */
/* ------------------------------------------------------------------ */

export interface Payslip {
  id: string;
  employeeId: string;
  period: string;
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  tax: number;
  pension: number;
  insurance: number;
  loanEmi: number;
  gross: number;
  net: number;
  status: "paid" | "pending";
}

/** Deterministic payslips for a given period, derived from salaries + loans. */
export function getPayslips(period = "August 2026"): Payslip[] {
  return EMPLOYEES.map((employee) => {
    const gross = Math.round(employee.salary / 12);
    const basic = Math.round(gross * 0.5);
    const hra = Math.round(gross * 0.2);
    const allowances = Math.round(gross * 0.2);
    const bonus = gross - basic - hra - allowances;
    const activeLoan = LOANS.find(
      (loan) => loan.employeeId === employee.id && loan.status === "active",
    );
    const loanEmi = activeLoan ? activeLoan.monthly : 0;
    const tax = Math.round(gross * 0.12);
    const pension = Math.round(gross * 0.05);
    const insurance = Math.round(gross * 0.02);
    return {
      id: `ps_${employee.id.replace("emp_", "")}_0826`,
      employeeId: employee.id,
      period,
      basic,
      hra,
      allowances,
      bonus,
      tax,
      pension,
      insurance,
      loanEmi,
      gross,
      net: gross - tax - pension - insurance - loanEmi,
      status: "paid",
    };
  });
}

export function getPayslip(id: string): Payslip | undefined {
  return getPayslips().find((payslip) => payslip.id === id);
}

/* ------------------------------------------------------------------ */
/* In-app notifications                                                */
/* ------------------------------------------------------------------ */

export interface AppNotification {
  id: string;
  type: "leave" | "onboarding" | "payroll" | "loan" | "performance" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf_001",
    type: "leave",
    title: "New leave request",
    body: "Noah Williams requested 5 days of vacation from Aug 24.",
    time: "2026-08-19T08:32:00",
    read: false,
    href: "/leave/lv_001",
  },
  {
    id: "ntf_002",
    type: "loan",
    title: "Loan approved",
    body: "Marco Rossi’s personal loan of $5,000 was approved.",
    time: "2026-08-19T07:45:00",
    read: false,
    href: "/payroll/loans/ln_002",
  },
  {
    id: "ntf_003",
    type: "payroll",
    title: "Payslips ready",
    body: "August 2026 payslips are ready for 248 employees.",
    time: "2026-08-19T07:00:00",
    read: false,
    href: "/payroll/payslips",
  },
  {
    id: "ntf_004",
    type: "performance",
    title: "Review reminder",
    body: "Q3 reviews are open — 3 drafts waiting for manager input.",
    time: "2026-08-18T16:20:00",
    read: true,
    href: "/performance",
  },
  {
    id: "ntf_005",
    type: "onboarding",
    title: "Onboarding task assigned",
    body: "IT: laptop allocation for Aisha Bello is due Aug 28.",
    time: "2026-08-18T09:10:00",
    read: true,
    href: "/onboarding/ob_002",
  },
  {
    id: "ntf_006",
    type: "system",
    title: "Sign-in from new device",
    body: "A new session started from London, UK.",
    time: "2026-08-17T11:05:00",
    read: true,
  },
  {
    id: "ntf_007",
    type: "leave",
    title: "Leave approved",
    body: "Sofia Andersson’s parental leave was approved.",
    time: "2026-08-15T14:00:00",
    read: true,
    href: "/leave/lv_003",
  },
  {
    id: "ntf_008",
    type: "payroll",
    title: "Payroll drafted",
    body: "August payroll run was drafted — review before processing.",
    time: "2026-08-14T17:30:00",
    read: true,
    href: "/payroll/pr_003",
  },
];

export const NOTIFICATION_TYPE_LABELS: Record<AppNotification["type"], string> =
  {
    leave: "Leave",
    onboarding: "Onboarding",
    payroll: "Payroll",
    loan: "Loans",
    performance: "Performance",
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

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "aud_014",
    actor: "Ada Admin",
    action: "Updated theme configuration",
    target: "Company branding",
    category: "settings",
    time: "2026-08-19T13:45:00",
  },
  {
    id: "aud_013",
    actor: "ada.admin@gente.dev",
    action: "OTP code requested and verified",
    target: "admin@gente.dev",
    category: "auth",
    time: "2026-08-19T13:20:00",
  },
  {
    id: "aud_012",
    actor: "Ada Admin",
    action: "Approved leave request",
    target: "Noah Williams — vacation (5 days)",
    category: "leave",
    time: "2026-08-19T09:02:00",
  },
  {
    id: "aud_011",
    actor: "System",
    action: "Payslip email batch sent (248)",
    target: "August 2026",
    category: "email",
    time: "2026-08-19T07:00:00",
  },
  {
    id: "aud_010",
    actor: "Ada Admin",
    action: "Drafted payroll run",
    target: "August 2026",
    category: "payroll",
    time: "2026-08-18T17:30:00",
  },
  {
    id: "aud_009",
    actor: "Priya Sharma",
    action: "Submitted performance review",
    target: "David Chen — Q3 2026",
    category: "employee",
    time: "2026-08-18T15:10:00",
  },
  {
    id: "aud_008",
    actor: "Ada Admin",
    action: "Changed employee status",
    target: "James O’Brien — pending onboarding",
    category: "employee",
    time: "2026-08-18T11:25:00",
  },
  {
    id: "aud_007",
    actor: "marco.rossi@gente.dev",
    action: "Signed in via OTP",
    target: "marco.rossi@gente.dev",
    category: "auth",
    time: "2026-08-18T09:40:00",
  },
  {
    id: "aud_006",
    actor: "System",
    action: "OTP email sent",
    target: "sofia.andersson@gente.dev",
    category: "email",
    time: "2026-08-18T09:39:00",
  },
  {
    id: "aud_005",
    actor: "Ada Admin",
    action: "Declined leave request",
    target: "Elena Petrova — other (1 day)",
    category: "leave",
    time: "2026-08-17T16:45:00",
  },
  {
    id: "aud_004",
    actor: "System",
    action: "Failed sign-in attempt (bad OTP)",
    target: "noah.williams@gente.dev",
    category: "auth",
    time: "2026-08-17T12:10:00",
  },
  {
    id: "aud_003",
    actor: "Ada Admin",
    action: "Uploaded company logo",
    target: "Branding assets",
    category: "settings",
    time: "2026-08-16T10:00:00",
  },
  {
    id: "aud_002",
    actor: "Ada Admin",
    action: "Invited employee",
    target: "James O’Brien — Backend Engineer",
    category: "employee",
    time: "2026-08-15T13:20:00",
  },
  {
    id: "aud_001",
    actor: "System",
    action: "Welcome email sent",
    target: "james.obrien@gente.dev",
    category: "email",
    time: "2026-08-15T13:21:00",
  },
];

export const AUDIT_CATEGORY_LABELS: Record<AuditLog["category"], string> = {
  auth: "Authentication",
  payroll: "Payroll",
  leave: "Leave",
  employee: "Employees",
  email: "Email",
  settings: "Settings",
};

/* ------------------------------------------------------------------ */
/* Employee documents                                                  */
/* ------------------------------------------------------------------ */

export interface EmployeeDocument {
  id: string;
  name: string;
  category: "contract" | "identity" | "finance" | "contact";
  status: "verified" | "pending" | "expired";
  uploadedAt: string;
}

const DOCUMENT_TEMPLATES: Array<{
  name: string;
  category: EmployeeDocument["category"];
}> = [
  { name: "Employment contract", category: "contract" },
  { name: "Government ID", category: "identity" },
  { name: "Bank account details", category: "finance" },
  { name: "Emergency contact", category: "contact" },
  { name: "Tax declaration form", category: "finance" },
  { name: "Health insurance card", category: "identity" },
];

/** Deterministic document set per employee. */
export function getEmployeeDocuments(employeeId: string): EmployeeDocument[] {
  const seed = parseInt(employeeId.slice(-2), 10);
  return DOCUMENT_TEMPLATES.map((template, index) => {
    const roll = (seed + index * 3) % 5;
    const status: EmployeeDocument["status"] =
      roll === 0 ? "pending" : roll === 1 ? "expired" : "verified";
    return {
      id: `doc_${employeeId}_${index + 1}`,
      name: template.name,
      category: template.category,
      status,
      uploadedAt: "2026-07-20",
    };
  });
}
