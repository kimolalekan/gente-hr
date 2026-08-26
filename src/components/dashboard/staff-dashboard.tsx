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
import { getTranslator } from "@/lib/server/i18n";

interface SelfServiceAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

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
export async function StaffDashboard({
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
  const t = await getTranslator();

  const actions: SelfServiceAction[] = [
    {
      href: "/attendance",
      label: t("dashboard.actionMarkAttendance"),
      description: t("dashboard.actionCheckInOut"),
      icon: CalendarCheck,
    },
    {
      href: "/profile",
      label: t("nav.myProfile"),
      description: t("dashboard.actionProfileDetails"),
      icon: UserRound,
    },
    {
      href: "/leave",
      label: t("dashboard.actionRequestLeave"),
      description: t("dashboard.actionBookLeave"),
      icon: CalendarDays,
    },
    {
      href: "/payroll/loans",
      label: t("payroll.loans.myTitle"),
      description: t("dashboard.actionLoansStatus"),
      icon: Wallet,
    },
    {
      href: "/payroll/payslips",
      label: t("payroll.payslips.myTitle"),
      description: t("dashboard.actionPayslipsEarnings"),
      icon: FileText,
    },
    {
      href: "/notifications",
      label: t("notifications.title"),
      description: t("dashboard.actionNotificationsDesc"),
      icon: Bell,
    },
    {
      href: "/performance",
      label: t("dashboard.actionMyReviews"),
      description: t("dashboard.actionPerformanceDesc"),
      icon: Star,
    },
  ];

  const roleLabels: Record<SessionUser["role"], string> = {
    admin: t("tenant.roleAdmin"),
    hr: t("tenant.roleHr"),
    member: t("onboarding.employee"),
  };

  const stats: Stat[] = [
    {
      label: t("dashboard.leaveBalance"),
      value: leaveBalance
        ? t("leave.daysCount", {
            days: leaveBalance.vacation.total - leaveBalance.vacation.used,
            s:
              leaveBalance.vacation.total - leaveBalance.vacation.used === 1
                ? ""
                : "s",
          })
        : "—",
      delta: leaveBalance
        ? t("dashboard.vacationUsed", { n: leaveBalance.vacation.used })
        : t("dashboard.noBalanceOnFile"),
      icon: CalendarDays,
      tone: "info",
    },
    {
      label: t("dashboard.attendanceThisWeek"),
      value: `${attendancePct}%`,
      delta: t("dashboard.presentOnTrack"),
      icon: CalendarCheck,
      tone: "success",
    },
    {
      label: t("payroll.loans.activeLoans"),
      value: String(loans.filter((loan) => loan.status === "active").length),
      delta: loans.length
        ? t("dashboard.repaymentOnSchedule")
        : t("dashboard.noActiveLoans"),
      icon: Wallet,
      tone: "warning",
    },
    {
      label: t("dashboard.latestPayslip"),
      value: payslips[0]?.period ?? "—",
      delta: payslips[0]
        ? t("dashboard.payslipAvailable")
        : t("payroll.payslips.empty"),
      icon: FileText,
      tone: "primary",
    },
  ];

  return (
    <>
      <DashboardHeader
        greeting={t("dashboard.greeting", {
          name: user.name.split(" ")[0],
        })}
        subtitle={t("dashboard.subtitleStaff")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.quickActions")}</CardTitle>
            <CardDescription>{t("dashboard.selfServiceTasks")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {actions.map((action) => {
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
            <CardTitle>{t("nav.myProfile")}</CardTitle>
            <CardDescription>{t("dashboard.accountAtAGlance")}</CardDescription>
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
              <span className="text-muted-foreground">
                {t("settings.users.role")}
              </span>
              <Badge variant="secondary">{roleLabels[user.role]}</Badge>
            </div>
            <Link href="/profile" className="block">
              <Button className="w-full">{t("dashboard.viewMyProfile")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
