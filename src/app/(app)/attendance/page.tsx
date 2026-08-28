import Link from "next/link";
import {
  CalendarCheck,
  Clock,
  FileDown,
  Home,
  Plane,
  UserRound,
} from "lucide-react";
import { CheckInCard } from "@/components/hr/check-in-card";
import { DateRangePicker } from "@/components/hr/date-range-picker";
import { PageHeader } from "@/components/hr/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { parseRange } from "@/lib/report-dates";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("attendance.title") };
}

const STATUS_META: Record<
  AttendanceStatus,
  { variant: "success" | "warning" | "info" | "secondary" | "destructive" }
> = {
  present: { variant: "success" },
  late: { variant: "warning" },
  remote: { variant: "info" },
  on_leave: { variant: "secondary" },
  absent: { variant: "destructive" },
};

/** Attendance row as returned by `GET /api/attendance`. */
interface AttendanceRow {
  id: string;
  employeeId: string;
  employeeName: string | null;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: AttendanceStatus;
  location: string | null;
  source: string | null;
  createdAt: string;
}

interface AttendanceSummary {
  present: number;
  late: number;
  remote: number;
  on_leave: number;
  absent: number;
  total: number;
}

interface WeekTrendDay {
  date: string;
  day: string;
  presentPct: number;
}

interface DepartmentRow {
  department: string;
  present: number;
  late: number;
  remote: number;
  on_leave: number;
  absent: number;
  total: number;
}

/** Employee row as returned by `GET /api/employees` (fields used on this page). */
interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  department: string | null;
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return dateToIso(new Date());
}

/** Monday of the current week (Monday-first). */
function startOfWeekIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateToIso(date);
}

function dayLabel(date: string, locale: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    weekday: "short",
  });
}

function toRecord(row: AttendanceRow): AttendanceRecord {
  return {
    employeeId: row.employeeId,
    date: row.date,
    checkIn: row.checkIn ?? "",
    checkOut: row.checkOut ?? "",
    hours: row.hours ?? 0,
    status: row.status,
  };
}

/** Employee (member) view — their own attendance only. */
async function MyAttendance() {
  const locale = await getTenantLocale();
  const t = await getTranslator();
  const { items } = await apiGet<Paginated<AttendanceRow>>("/api/attendance", {
    from: startOfWeekIso(),
    to: todayIso(),
    pageSize: 100,
  });
  const week = [...items].sort((a, b) => a.date.localeCompare(b.date));
  const today = week.find((record) => record.date === todayIso()) ?? null;

  return (
    <>
      <PageHeader
        title={t("attendance.myTitle")}
        description={t("attendance.myDescription")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CheckInCard initial={today ? toRecord(today) : null} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("common.thisWeek")}</CardTitle>
            <CardDescription>
              {t("attendance.weekCount", {
                n: week.length,
                s: week.length === 1 ? "" : "s",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">
                      {t("common.day")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("attendance.checkIn")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("attendance.checkOut")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("attendance.hours")}
                    </th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      {t("common.status")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {week.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-sm text-muted-foreground"
                      >
                        {t("attendance.noCheckInsThisWeek")}
                      </td>
                    </tr>
                  ) : (
                    week.map((record) => {
                      const status = STATUS_META[record.status];
                      return (
                        <tr
                          key={record.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-3 pr-4 text-xs font-medium">
                            {dayLabel(record.date, locale)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {record.checkIn ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {record.checkOut ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {record.hours ? record.hours.toFixed(1) : "—"}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Badge
                              variant={status.variant}
                              className="text-[10px]"
                            >
                              {t(
                                `statusLabels.attendance.${record.status}` as TranslationKey,
                              )}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role === "member") {
    return <MyAttendance />;
  }

  const locale = await getTenantLocale();
  const t = await getTranslator();

  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parseRange(fromParam, toParam);
  const rangeParams = `from=${from}&to=${to}`;

  const today = todayIso();
  const [attendancePage, summary, weekTrend, departments, employeesPage] =
    await Promise.all([
      apiGet<Paginated<AttendanceRow>>("/api/attendance", {
        from: today,
        to: today,
        pageSize: 200,
      }),
      apiGet<AttendanceSummary>("/api/attendance/summary"),
      apiGet<WeekTrendDay[]>("/api/attendance/week-trend"),
      apiGet<DepartmentRow[]>("/api/attendance/departments"),
      apiGet<Paginated<EmployeeRow>>("/api/employees", { pageSize: 500 }),
    ]);

  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const averagePresence =
    weekTrend.length > 0
      ? Math.round(
          weekTrend.reduce((sum, day) => sum + day.presentPct, 0) /
            weekTrend.length,
        )
      : 0;
  const employeesById = new Map(
    employeesPage.items.map((item) => [item.id, item]),
  );
  const departmentRows = departments.map((row) => ({
    department: row.department,
    headcount: row.total,
    onSite: row.present + row.late,
    presentPct:
      row.total > 0
        ? Math.round(((row.present + row.late) / row.total) * 100)
        : 0,
  }));

  return (
    <>
      <PageHeader
        title={t("attendance.title")}
        description={t("attendance.description")}
      >
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={from} to={to} />
          <Link
            href={`/api/attendance/report?format=csv&${rangeParams}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FileDown />
            {t("reports.export")}
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <UserRound className="size-4" /> {t("attendance.statusPresent")}
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {summary.present}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" /> {t("attendance.statusLate")}
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {summary.late}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Home className="size-4" /> {t("attendance.statusRemote")}
            </p>
            <p className="mt-1 text-2xl font-bold text-info">
              {summary.remote}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Plane className="size-4" /> {t("attendance.statusOnLeave")}
            </p>
            <p className="mt-1 text-2xl font-bold">{summary.on_leave}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarCheck className="size-4" />{" "}
              {t("attendance.statusAbsent")}
            </p>
            <p className="mt-1 text-2xl font-bold text-destructive">
              {summary.absent}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("attendance.todayTitle")}</CardTitle>
            <CardDescription>
              {todayLabel} · {t("attendance.allLocations")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">
                      {t("onboarding.employee")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      {t("employees.department")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("attendance.checkIn")}
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      {t("attendance.checkOut")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("attendance.hours")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("common.status")}
                    </th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      {t("common.details")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attendancePage.items.map((record) => {
                    const employee = employeesById.get(record.employeeId);
                    if (!employee) return null;
                    const meta = STATUS_META[record.status];
                    return (
                      <tr
                        key={record.id}
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
                          {record.checkIn ?? "—"}
                        </td>
                        <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">
                          {record.checkOut ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {record.hours ? record.hours.toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={meta.variant}>
                            {t(
                              `statusLabels.attendance.${record.status}` as TranslationKey,
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <Link href={`/employees/${employee.id}`}>
                            <Button variant="outline" size="sm">
                              {t("common.viewDetails")}
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
              <CardTitle>{t("common.thisWeek")}</CardTitle>
              <CardDescription>
                {t("attendance.presencePercent")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-32 items-end justify-between gap-2">
                {weekTrend.map((day) => (
                  <div
                    key={day.date}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <div
                      className="w-full max-w-8 rounded-md bg-primary/80"
                      style={{
                        // Explicit px: the column is content-sized (`items-end`),
                        // so a % height has no definite parent and collapses to 0.
                        height: `${Math.max(4, Math.round((day.presentPct / 100) * 100))}px`,
                      }}
                      title={t("attendance.percentPresent", {
                        pct: day.presentPct,
                      })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.day}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("attendance.averagePresence", { pct: averagePresence })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("payroll.byDepartment")}</CardTitle>
              <CardDescription>
                {t("attendance.todayBreakdown")}
              </CardDescription>
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
                        {t("attendance.onSite", {
                          onSite: row.onSite,
                          headcount: row.headcount,
                        })}
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
