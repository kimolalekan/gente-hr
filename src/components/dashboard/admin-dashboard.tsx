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
  ThemeFooter,
  type AttendanceTrendDay,
  type DashboardMetrics,
  type RecentEmployee,
  type Stat,
} from "@/components/dashboard/dashboard-shared";
import type { SessionUser } from "@/lib/server/auth";
import { getTenantTheme } from "@/lib/server/theme-store";
import { getPredefinedTheme } from "@/lib/theme-config";
import { formatCurrency } from "@/lib/hr-data";

export async function AdminDashboard({
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
  const theme = await getTenantTheme();
  const themeName =
    theme.themeId === "custom"
      ? "Custom theme"
      : (getPredefinedTheme(theme.themeId)?.name ?? "Default Blue");

  const stats: Stat[] = [
    {
      label: "Total employees",
      value: String(metrics.employees),
      delta: `${metrics.departments} departments`,
      icon: Users,
      tone: "primary",
    },
    {
      label: "On leave today",
      value: String(metrics.onLeaveToday),
      icon: CalendarDays,
      tone: "warning",
    },
    {
      label: "Pending approvals",
      value: String(metrics.pendingLeave),
      icon: FileText,
      tone: "info",
    },
    {
      label: "Payroll",
      value: metrics.payrollTotal > 0 ? "Processed" : "—",
      delta:
        metrics.payrollTotal > 0
          ? `Latest run · ${formatCurrency(metrics.payrollTotal)}`
          : "No payroll run yet",
      icon: Wallet,
      tone: "success",
    },
  ];

  return (
    <>
      <DashboardHeader
        greeting={`Good morning, ${user.name.split(" ")[0]}`}
        subtitle="Here's what's happening at your company today."
        actions={
          <ActionButton variant="outline" doneLabel="Exported">
            Export report
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
              label: "Review pending leave",
              icon: ArrowUpRight,
              variant: "info",
            },
            {
              href: "/payroll",
              label: "Run payroll preview",
              icon: ArrowUpRight,
            },
            {
              href: "/employees",
              label: "View employee directory",
              icon: ArrowUpRight,
              variant: "success",
            },
            {
              href: "/settings/branding",
              label: "Company branding & theme",
              icon: FileText,
              variant: "outline",
            },
          ]}
        />
      </div>

      <RecentEmployeesTable employees={recentEmployees} />
      <ThemeFooter themeName={themeName} />
    </>
  );
}
