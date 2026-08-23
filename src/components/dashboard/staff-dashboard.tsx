import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  FileText,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DashboardHeader,
  StatCard,
  type Stat,
} from "@/components/dashboard/dashboard-shared";
import type { SessionUser } from "@/lib/server/auth";

interface SelfServiceAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const ACTIONS: SelfServiceAction[] = [
  {
    href: "/attendance",
    label: "Mark attendance",
    description: "Check in / check out",
    icon: CalendarCheck,
  },
  {
    href: "/profile",
    label: "My profile",
    description: "Personal details & documents",
    icon: UserRound,
  },
  {
    href: "/leave",
    label: "Request leave",
    description: "Book time off & view balance",
    icon: CalendarDays,
  },
  {
    href: "/payroll/loans",
    label: "My loans",
    description: "Loans & repayment status",
    icon: Wallet,
  },
  {
    href: "/payroll/payslips",
    label: "My payslips",
    description: "Earnings & deductions",
    icon: FileText,
  },
  {
    href: "/notifications",
    label: "Notifications",
    description: "Updates and alerts",
    icon: Bell,
  },
  {
    href: "/performance",
    label: "My reviews",
    description: "Performance & feedback",
    icon: Star,
  },
];

const ROLE_LABELS: Record<SessionUser["role"], string> = {
  admin: "Admin",
  hr: "HR",
  member: "Employee",
};

/** Leave balance row (member scope of `GET /api/leave/balances`). */
export interface StaffLeaveBalance {
  employeeId: string;
  vacation: { total: number; used: number };
  sick: { total: number; used: number };
  personal: { total: number; used: number };
}

/** Loan row (member scope of `GET /api/payroll/loans`). */
export interface StaffLoan {
  id: string;
  status: string;
}

/** Payslip row (member scope of `GET /api/payroll/payslips`). */
export interface StaffPayslip {
  period: string;
}

/**
 * Staff (employee) dashboard — self-service view per Agent.md §14: the signed
 * in employee's own stats and quick actions for attendance, leave, loans,
 * payslips, notifications, and reviews. Nothing org-wide is shown here.
 */
export function StaffDashboard({
  user,
  leaveBalance,
  attendancePct,
  loans,
  payslips,
}: {
  user: SessionUser;
  leaveBalance: StaffLeaveBalance | null;
  attendancePct: number;
  loans: StaffLoan[];
  payslips: StaffPayslip[];
}) {
  const stats: Stat[] = [
    {
      label: "Leave balance",
      value: leaveBalance
        ? `${leaveBalance.vacation.total - leaveBalance.vacation.used} days`
        : "—",
      delta: leaveBalance
        ? `Vacation · ${leaveBalance.vacation.used} used`
        : "No balance on file",
      icon: CalendarDays,
      tone: "info",
    },
    {
      label: "Attendance this week",
      value: `${attendancePct}%`,
      delta: "Present · on track",
      icon: CalendarCheck,
      tone: "success",
    },
    {
      label: "Active loans",
      value: String(loans.filter((loan) => loan.status === "active").length),
      delta: loans.length ? "Repayment on schedule" : "No active loans",
      icon: Wallet,
      tone: "warning",
    },
    {
      label: "Latest payslip",
      value: payslips[0]?.period ?? "—",
      delta: payslips[0] ? "Available for download" : "No payslips yet",
      icon: FileText,
      tone: "primary",
    },
  ];

  return (
    <>
      <DashboardHeader
        greeting={`Good morning, ${user.name.split(" ")[0]}`}
        subtitle="Here's your personal workspace — requests, attendance and pay."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Self-service tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-start gap-3 rounded-lg border border-border p-3.5 transition-colors hover:bg-muted/60"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {action.label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My profile</CardTitle>
            <CardDescription>Your account at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
            </div>
            <Link href="/profile" className="block">
              <Button className="w-full">View my profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
