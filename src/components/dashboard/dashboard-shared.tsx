import Link from "next/link";
import { ArrowUpRight, TrendingUp, type LucideIcon } from "lucide-react";
import type { ButtonProps } from "@/components/ui/button";
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

/* ------------------------------------------------------------------ */
/* Shared dashboard building blocks (server components).               */
/* ------------------------------------------------------------------ */

/** Summary metrics from `GET /api/reports`. */
export interface DashboardMetrics {
  employees: number;
  onLeaveToday: number;
  pendingLeave: number;
  payrollTotal: number;
  departments: number;
}

/** One day from `GET /api/attendance/week-trend`. */
export interface AttendanceTrendDay {
  date: string;
  day: string;
  presentPct: number;
}

/** Employee list row (shape of `GET /api/employees` items). */
export interface RecentEmployee {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  status: string;
}

export interface Stat {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone: "primary" | "warning" | "info" | "success";
}

export const TONE_CLASSES: Record<Stat["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

export function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {stat.label}
          </p>
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${TONE_CLASSES[stat.tone]}`}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">{stat.value}</p>
        {stat.delta && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3 text-success" />
            {stat.delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardHeader({
  greeting,
  subtitle,
  actions,
}: {
  greeting: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function AttendanceChart({ days }: { days: AttendanceTrendDay[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Attendance this week</CardTitle>
            <CardDescription>Headcount per day</CardDescription>
          </div>
          <Badge variant="secondary">
            <ArrowUpRight className="size-3" />
            On track
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No attendance data for this week yet.
          </p>
        ) : (
          <div className="flex h-40 items-end justify-between gap-2">
            {days.map((bar, index) => (
              <div
                key={bar.date}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className={
                    index === days.length - 1
                      ? "w-full max-w-10 rounded-md bg-primary"
                      : "w-full max-w-10 rounded-md bg-primary/20"
                  }
                  style={{ height: `${Math.max(4, bar.presentPct)}%` }}
                  title={`${bar.presentPct}% present`}
                />
                <span
                  className={
                    index === days.length - 1
                      ? "text-xs font-medium text-primary"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentEmployeesTable({
  employees,
}: {
  employees: RecentEmployee[];
}) {
  const recent = employees.slice(0, 5);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent employees</CardTitle>
            <CardDescription>Latest hires and status updates</CardDescription>
          </div>
          <Link
            href="/employees"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2.5 pr-4 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Department
                </th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="py-2.5 pl-4 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr className="border-b border-border last:border-0">
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No employees yet.
                  </td>
                </tr>
              )}
              {recent.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={employee.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{employee.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{employee.role}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {employee.department}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        employee.status === "active"
                          ? "success"
                          : employee.status === "on_leave"
                            ? "warning"
                            : "info"
                      }
                    >
                      {employee.status === "active"
                        ? "Active"
                        : employee.status === "on_leave"
                          ? "On leave"
                          : "Pending onboarding"}
                    </Badge>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <Link href={`/employees/${employee.id}`}>
                      <Button variant="outline" size="sm">
                        View details
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export interface QuickActionItem {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: ButtonProps["variant"];
}

/** Compact list of common task links (admin / HR dashboards). */
export function QuickActions({ items }: { items: QuickActionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Common HR tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block">
              <Button
                variant={item.variant ?? "default"}
                className="w-full justify-start"
              >
                <Icon className="size-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function ThemeFooter({ themeName }: { themeName: string }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Company theme:{" "}
      <span className="font-medium text-foreground">{themeName}</span> · saved
      in Administration → Company Settings → Branding &amp; Theme
    </p>
  );
}
