import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmployeeProfileCard } from "@/components/hr/employee-profile-card";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  apiGet,
  ApiClientError,
  type Paginated,
} from "@/lib/server/api-client";
import {
  formatCurrency,
  formatDate,
  type AttendanceStatus,
  type Employee,
  type EmployeeStatus,
  type LeaveRequest,
} from "@/lib/hr-data";

const ATTENDANCE_META: Record<
  AttendanceStatus,
  { variant: "success" | "warning" | "info" | "secondary" | "destructive" }
> = {
  present: { variant: "success" },
  late: { variant: "warning" },
  remote: { variant: "info" },
  on_leave: { variant: "secondary" },
  absent: { variant: "destructive" },
};

/** Full employee row from GET /api/employees/[id]. */
interface EmployeeDetailRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  address: Record<string, unknown> | null;
  status: string;
  joinDate: string | null;
  employmentType: string;
  employeeId: string;
  managerName: string | null;
  salary: Record<string, number> | null;
  salaryGross: number | null;
  documentCount: number;
}

interface DocumentRow {
  id: string;
  name: string;
  category: string;
  status: string;
  uploadedAt: string;
}

interface LeaveRow {
  id: string;
  employeeId: string;
  type: LeaveRequest["type"];
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveRequest["status"];
  createdAt: string;
}

interface AttendanceRow {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: AttendanceStatus;
}

interface LeaveBalanceRow {
  vacationTotal: number;
  vacationUsed: number;
  sickTotal: number;
  sickUsed: number;
  personalTotal: number;
  personalUsed: number;
  year: number;
}

interface PayslipRow {
  id: string;
  period: string;
  gross: number;
  net: number;
  status: string;
  generatedAt: string;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** ISO dates for the current week (Monday → Sunday). */
function currentWeekRange(): { start: string; end: string } {
  const today = new Date();
  const offset = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toIso(monday), end: toIso(sunday) };
}

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("metadata.employeeProfile") };
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getTenantLocale();
  const t = await getTranslator();

  // Employees only see their own profile — the directory is admin/HR.
  const user = await getCurrentUser();
  let myId: string | null = null;
  if (user?.role === "member") {
    try {
      const mine = await apiGet<Employee>("/api/employees/me");
      myId = mine.id;
    } catch {
      redirect("/profile");
    }
  }

  let raw: EmployeeDetailRow;
  try {
    raw = await apiGet<EmployeeDetailRow>(`/api/employees/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }
  if (user?.role === "member" && raw.id !== myId) redirect("/profile");

  const employee: Employee = {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone ?? "",
    role: raw.designation ?? "",
    department: raw.department ?? "",
    address: (raw.address ?? null) as Employee["address"],
    status: raw.status as EmployeeStatus,
    joinedAt: raw.joinDate ?? "",
    salary: raw.salaryGross ?? 0,
    manager: raw.managerName ?? "",
  };

  const [documents, leaveHistory, attendancePage, balances, payslips] =
    await Promise.all([
      apiGet<DocumentRow[]>(`/api/employees/${id}/documents`),
      apiGet<LeaveRow[]>(`/api/employees/${id}/leave`),
      apiGet<Paginated<AttendanceRow>>(`/api/employees/${id}/attendance`, {
        pageSize: 20,
      }),
      apiGet<LeaveBalanceRow[]>(`/api/employees/${id}/leave-balance`),
      apiGet<PayslipRow[]>(`/api/employees/${id}/payslips`),
    ]);

  const requests: LeaveRequest[] = leaveHistory.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    type: row.type,
    start: row.startDate,
    end: row.endDate,
    days: row.days,
    status: row.status,
    reason: row.reason ?? undefined,
  }));

  const { start, end } = currentWeekRange();
  const attendanceWeek = attendancePage.items
    .filter((record) => record.date >= start && record.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const balanceRow = balances[0];
  const balance = balanceRow
    ? {
        vacation: {
          total: balanceRow.vacationTotal,
          used: balanceRow.vacationUsed,
        },
        sick: { total: balanceRow.sickTotal, used: balanceRow.sickUsed },
        personal: {
          total: balanceRow.personalTotal,
          used: balanceRow.personalUsed,
        },
      }
    : null;

  return (
    <>
      <EmployeeProfileCard
        employee={employee}
        readOnly={user?.role === "member"}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("employees.documents")}</CardTitle>
              <CardDescription>
                {t("employees.documentsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {documents.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    {t("employees.noDocuments")}
                  </p>
                )}
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{document.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.category} ·{" "}
                        {t("employees.uploadedOn", {
                          date: formatDate(
                            String(document.uploadedAt).slice(0, 10),
                            locale,
                          ),
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        document.status === "verified"
                          ? "success"
                          : document.status === "pending"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {document.status === "verified" ||
                      document.status === "pending"
                        ? t(
                            `statusLabels.document.${document.status}` as TranslationKey,
                          )
                        : document.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("employees.leaveHistory")}</CardTitle>
              <CardDescription>
                {t("employees.recentRequestsFrom", {
                  name: employee.name.split(" ")[0],
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("employees.noLeaveRequests")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2.5 pr-4 font-medium">
                          {t("leave.type")}
                        </th>
                        <th className="px-4 py-2.5 font-medium">
                          {t("common.dates")}
                        </th>
                        <th className="px-4 py-2.5 font-medium">
                          {t("leave.days")}
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
                      {requests.map((request) => (
                        <tr
                          key={request.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-3 pr-4">
                            {t(
                              `statusLabels.leaveType.${request.type}` as TranslationKey,
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(request.start, locale)} →{" "}
                            {formatDate(request.end, locale)}
                          </td>
                          <td className="px-4 py-3">{request.days}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "success"
                                  : request.status === "pending"
                                    ? "warning"
                                    : "destructive"
                              }
                            >
                              {t(
                                `statusLabels.leaveStatus.${request.status}` as TranslationKey,
                              )}
                            </Badge>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link href={`/leave/${request.id}`}>
                              <Button variant="outline" size="sm">
                                {t("common.viewDetails")}
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendance.thisWeekTitle")}</CardTitle>
              <CardDescription>
                {t("attendance.workdaysCount", { n: attendanceWeek.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("attendance.noRecordsThisWeek")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">
                          {t("common.day")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("attendance.in")}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t("attendance.out")}
                        </th>
                        <th className="py-2 pl-3 text-right font-medium">
                          {t("common.status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceWeek.map((record) => {
                        const meta =
                          ATTENDANCE_META[record.status] ??
                          ATTENDANCE_META.absent;
                        const weekday = new Date(
                          `${record.date}T00:00:00`,
                        ).toLocaleDateString(locale, { weekday: "short" });
                        return (
                          <tr
                            key={record.date}
                            className="border-b border-border last:border-0"
                          >
                            <td className="py-2 pr-3 text-xs font-medium">
                              {weekday} {formatDate(record.date, locale)}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {record.checkIn ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {record.checkOut ?? "—"}
                            </td>
                            <td className="py-2 pl-3 text-right">
                              <Badge
                                variant={meta.variant}
                                className="text-[10px]"
                              >
                                {t(
                                  `statusLabels.attendance.${record.status}` as TranslationKey,
                                )}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("leave.balanceTitle")}</CardTitle>
              <CardDescription>
                {balanceRow
                  ? t("leave.currentYearWithYear", { year: balanceRow.year })
                  : t("leave.currentYear")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balance ? (
                (["vacation", "sick", "personal"] as const).map((kind) => {
                  const entry = balance[kind];
                  const remaining = entry.total - entry.used;
                  const pct = Math.round((entry.used / entry.total) * 100);
                  return (
                    <div key={kind} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">
                          {kind}
                        </span>
                        <span className="font-medium">
                          {t("leave.balanceLeft", {
                            remaining,
                            total: entry.total,
                          })}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("leave.noBalance")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("payroll.payslips.title")}</CardTitle>
              <CardDescription>
                {t("payroll.payslips.recentDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {payslips.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("payroll.payslips.noPayslips")}
                </p>
              ) : (
                payslips.map((payslip) => (
                  <div
                    key={payslip.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{payslip.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("payroll.net")} {formatCurrency(payslip.net)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {payslip.status === "draft" || payslip.status === "paid"
                        ? t(
                            `statusLabels.payslip.${payslip.status}` as TranslationKey,
                          )
                        : payslip.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
