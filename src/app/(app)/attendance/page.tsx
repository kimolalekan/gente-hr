import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  FileDown,
  Home,
  Plane,
  UserRound,
} from "lucide-react";
import { ActionButton } from "@/components/hr/action-button";
import { PageHeader } from "@/components/hr/page-header";
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
  ATTENDANCE_TODAY,
  ATTENDANCE_WEEK_TREND,
  DEPARTMENTS,
  EMPLOYEES,
  type AttendanceStatus,
} from "@/lib/hr-data";

export const metadata = { title: "Attendance" };

const STATUS_META: Record<
  AttendanceStatus,
  {
    label: string;
    variant: "success" | "warning" | "info" | "secondary" | "destructive";
  }
> = {
  present: { label: "Present", variant: "success" },
  late: { label: "Late", variant: "warning" },
  remote: { label: "Remote", variant: "info" },
  on_leave: { label: "On leave", variant: "secondary" },
  absent: { label: "Absent", variant: "destructive" },
};

function statusFor(employeeId: string): AttendanceStatus {
  return (
    ATTENDANCE_TODAY.find((record) => record.employeeId === employeeId)
      ?.status ?? "absent"
  );
}

export default function AttendancePage() {
  const present = ATTENDANCE_TODAY.filter(
    (record) => record.status === "present",
  ).length;
  const late = ATTENDANCE_TODAY.filter(
    (record) => record.status === "late",
  ).length;
  const remote = ATTENDANCE_TODAY.filter(
    (record) => record.status === "remote",
  ).length;
  const onLeave = ATTENDANCE_TODAY.filter(
    (record) => record.status === "on_leave",
  ).length;
  const absent = ATTENDANCE_TODAY.filter(
    (record) => record.status === "absent",
  ).length;

  const departmentRows = DEPARTMENTS.filter((department) =>
    EMPLOYEES.some((employee) => employee.department === department),
  ).map((department) => {
    const members = EMPLOYEES.filter(
      (employee) => employee.department === department,
    );
    const counts = members.reduce(
      (acc, member) => {
        const status = statusFor(member.id);
        acc[status] += 1;
        return acc;
      },
      { present: 0, late: 0, remote: 0, on_leave: 0, absent: 0 } as Record<
        AttendanceStatus,
        number
      >,
    );
    const onSite = counts.present + counts.late;
    return {
      department,
      headcount: members.length,
      onSite,
      onLeave: counts.on_leave,
      remote: counts.remote,
      presentPct: Math.round((onSite / members.length) * 100),
    };
  });

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Who's on site, remote, or away — today and this week."
      >
        <ActionButton variant="outline" doneLabel="Exported">
          <FileDown />
          Export
        </ActionButton>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <UserRound className="size-4" /> Present
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" /> Late
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">{late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Home className="size-4" /> Remote
            </p>
            <p className="mt-1 text-2xl font-bold text-info">{remote}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Plane className="size-4" /> On leave
            </p>
            <p className="mt-1 text-2xl font-bold">{onLeave}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarCheck className="size-4" /> Absent
            </p>
            <p className="mt-1 text-2xl font-bold text-destructive">{absent}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s attendance</CardTitle>
            <CardDescription>
              Wednesday, 19 Aug 2026 · all locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">Employee</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      Department
                    </th>
                    <th className="px-4 py-2.5 font-medium">Check-in</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      Check-out
                    </th>
                    <th className="px-4 py-2.5 font-medium">Hours</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ATTENDANCE_TODAY.map((record) => {
                    const employee = EMPLOYEES.find(
                      (item) => item.id === record.employeeId,
                    );
                    if (!employee) return null;
                    const meta = STATUS_META[record.status];
                    return (
                      <tr
                        key={record.employeeId}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={employee.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {employee.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {employee.department}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {record.checkIn}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">
                          {record.checkOut}
                        </td>
                        <td className="px-4 py-3">
                          {record.hours > 0 ? record.hours.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <Link href={`/employees/${employee.id}`}>
                            <Button variant="outline" size="sm">
                              View details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>This week</CardTitle>
              <CardDescription>On-site presence, %</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-end justify-between gap-2">
                {ATTENDANCE_WEEK_TREND.map((day) => (
                  <div
                    key={day.day}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full max-w-8 rounded-md bg-primary/80"
                      style={{ height: `${day.presentPct}%` }}
                      title={`${day.presentPct}% present`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.day}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Average presence this week: 94.8%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By department</CardTitle>
              <CardDescription>Today&apos;s breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentRows.map((row) => (
                  <Link
                    key={row.department}
                    href={`/employees?department=${encodeURIComponent(row.department)}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium">{row.department}</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {row.onSite}/{row.headcount} on site
                      </span>
                      <span className="font-medium text-foreground">
                        {row.presentPct}%
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
