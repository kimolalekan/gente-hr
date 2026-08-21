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
  type Stat,
} from "@/components/dashboard/dashboard-shared";
import type { SessionUser } from "@/lib/server/auth";

const STATS: Stat[] = [
  {
    label: "Total employees",
    value: "248",
    delta: "+12 this month",
    icon: Users,
    tone: "primary",
  },
  { label: "On leave today", value: "9", icon: CalendarDays, tone: "warning" },
  { label: "Pending approvals", value: "14", icon: FileText, tone: "info" },
  {
    label: "Payroll",
    value: "Processed",
    delta: "August · $412k",
    icon: Wallet,
    tone: "success",
  },
];

/**
 * HR dashboard: full operational view (employees, leave, attendance, payroll,
 * reports) but no configuration or sensitive settings — no user creation and
 * no company branding/theme management (those are admin-only per RBAC).
 */
export function HrDashboard({ user }: { user: SessionUser }) {
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
        {STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AttendanceChart />
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
          ]}
        />
      </div>

      <RecentEmployeesTable />
    </>
  );
}
