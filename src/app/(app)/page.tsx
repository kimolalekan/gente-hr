import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import {
  StaffDashboard,
  type StaffLeaveBalance,
  type StaffLoan,
  type StaffPayslip,
} from "@/components/dashboard/staff-dashboard";
import type {
  AttendanceTrendDay,
  DashboardMetrics,
  RecentEmployee,
} from "@/components/dashboard/dashboard-shared";

/** `YYYY-MM-DD` for `days` days before today (UTC-safe local date). */
function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // layout guarantees auth; keeps types narrow

  switch (user.role) {
    case "admin":
    case "hr": {
      const [{ metrics }, weekTrend, employees] = await Promise.all([
        apiGet<{ metrics: DashboardMetrics }>("/api/reports"),
        apiGet<AttendanceTrendDay[]>("/api/attendance/week-trend"),
        apiGet<Paginated<RecentEmployee>>("/api/employees", { pageSize: 5 }),
      ]);
      if (user.role === "admin") {
        return (
          <AdminDashboard
            user={user}
            metrics={metrics}
            weekTrend={weekTrend}
            recentEmployees={employees.items}
          />
        );
      }
      return (
        <HrDashboard
          user={user}
          metrics={metrics}
          weekTrend={weekTrend}
          recentEmployees={employees.items}
        />
      );
    }
    default: {
      // Member: all endpoints scope to the signed-in employee server-side.
      const [balances, loans, payslips, attendance] = await Promise.all([
        apiGet<StaffLeaveBalance[]>("/api/leave/balances"),
        apiGet<Paginated<StaffLoan>>("/api/payroll/loans"),
        apiGet<Paginated<StaffPayslip>>("/api/payroll/payslips"),
        apiGet<Paginated<{ status: string }>>("/api/attendance", {
          from: isoDaysAgo(6),
          to: isoDaysAgo(0),
        }),
      ]);
      const presentDays = attendance.items.filter(
        (record) =>
          record.status === "present" ||
          record.status === "late" ||
          record.status === "remote",
      ).length;
      const attendancePct = attendance.items.length
        ? Math.round((presentDays / attendance.items.length) * 100)
        : 0;

      return (
        <StaffDashboard
          user={user}
          leaveBalance={balances[0] ?? null}
          attendancePct={attendancePct}
          loans={loans.items}
          payslips={payslips.items}
        />
      );
    }
  }
}
