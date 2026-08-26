import {
  ArrowUpRight,
  CalendarDays,
  FileText,
  Users,
  Wallet,
} from "lucide-react";
import { ActionButton } from "@/components/hr/action-button";
import {
  AttendanceChart,
  DashboardHeader,
  QuickActions,
  RecentEmployeesTable,
  StatCard,
  type AttendanceTrendDay,
  type DashboardMetrics,
  type RecentEmployee,
  type Stat,
} from "@/components/dashboard/dashboard-shared";
import type { SessionUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import { formatCurrency } from "@/lib/hr-data";

/**
 * HR dashboard: full operational view (employees, leave, attendance, payroll,
 * reports) but no configuration or sensitive settings — no user creation and
 * no company branding/theme management (those are admin-only per RBAC).
 */
export async function HrDashboard({
  user,
  metrics,
  weekTrend,
  recentEmployees,
}: {
  user: SessionUser;
  metrics: DashboardMetrics;
  weekTrend: AttendanceTrendDay[];
  recentEmployees: RecentEmployee[];
}) {
  const t = await getTranslator();
  const stats: Stat[] = [
    {
      label: t("dashboard.totalEmployees"),
      value: String(metrics.employees),
      delta: t("dashboard.departmentCount", {
        n: metrics.departments,
        s: metrics.departments === 1 ? "" : "s",
      }),
      icon: Users,
      tone: "primary",
    },
    {
      label: t("attendance.onLeaveToday"),
      value: String(metrics.onLeaveToday),
      icon: CalendarDays,
      tone: "warning",
    },
    {
      label: t("dashboard.pendingApprovals"),
      value: String(metrics.pendingLeave),
      icon: FileText,
      tone: "info",
    },
    {
      label: t("payroll.title"),
      value: metrics.payrollTotal > 0 ? t("payroll.statusProcessed") : "—",
      delta:
        metrics.payrollTotal > 0
          ? t("dashboard.latestRun", {
              amount: formatCurrency(metrics.payrollTotal),
            })
          : t("dashboard.noPayrollRun"),
      icon: Wallet,
      tone: "success",
    },
  ];

  return (
    <>
      <DashboardHeader
        greeting={t("dashboard.greeting", {
          name: user.name.split(" ")[0],
        })}
        subtitle={t("dashboard.subtitleAdmin")}
        actions={
          <ActionButton variant="outline" doneLabel={t("common.exported")}>
            {t("reports.exportReport")}
          </ActionButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AttendanceChart days={weekTrend} />
        <QuickActions
          items={[
            {
              href: "/leave",
              label: t("dashboard.quickReviewLeave"),
              icon: ArrowUpRight,
              variant: "info",
            },
            {
              href: "/payroll",
              label: t("dashboard.quickPayrollPreview"),
              icon: ArrowUpRight,
            },
            {
              href: "/employees",
              label: t("dashboard.quickEmployeeDirectory"),
              icon: ArrowUpRight,
              variant: "success",
            },
          ]}
        />
      </div>

      <RecentEmployeesTable employees={recentEmployees} />
    </>
  );
}
