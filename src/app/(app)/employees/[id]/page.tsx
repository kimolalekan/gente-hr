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
import {
  apiGet,
  ApiClientError,
  type Paginated,
} from "@/lib/server/api-client";
import {
  formatCurrency,
  formatDate,
  LEAVE_TYPE_LABELS,
  type AttendanceStatus,
  type Employee,
  type EmployeeStatus,
  type LeaveRequest,
} from "@/lib/hr-data";

const ATTENDANCE_META: Record<
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

export const metadata = { title: "Employee profile" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Records on file for this employee.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {documents.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">
                    No documents on file.
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
                        {document.category} · uploaded{" "}
                        {formatDate(String(document.uploadedAt).slice(0, 10))}
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
                      {document.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave history</CardTitle>
              <CardDescription>
                Recent requests from {employee.name.split(" ")[0]}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No leave requests yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2.5 pr-4 font-medium">Type</th>
                        <th className="px-4 py-2.5 font-medium">Dates</th>
                        <th className="px-4 py-2.5 font-medium">Days</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                        <th className="py-2.5 pl-4 text-right font-medium">
                          Details
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
                            {LEAVE_TYPE_LABELS[request.type]}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(request.start)} →{" "}
                            {formatDate(request.end)}
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
                              {request.status}
                            </Badge>
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link href={`/leave/${request.id}`}>
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
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance this week</CardTitle>
              <CardDescription>
                Check-ins · {attendanceWeek.length} workdays
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceWeek.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance records this week.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Day</th>
                        <th className="px-3 py-2 font-medium">In</th>
                        <th className="px-3 py-2 font-medium">Out</th>
                        <th className="py-2 pl-3 text-right font-medium">
                          Status
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
                        ).toLocaleDateString("en-US", { weekday: "short" });
                        return (
                          <tr
                            key={record.date}
                            className="border-b border-border last:border-0"
                          >
                            <td className="py-2 pr-3 text-xs font-medium">
                              {weekday} {formatDate(record.date)}
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
                                {meta.label}
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
              <CardTitle>Leave balance</CardTitle>
              <CardDescription>
                Current year{balanceRow ? ` (${balanceRow.year})` : ""}.
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
                          {remaining} of {entry.total} left
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
                  No balance data.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payslips</CardTitle>
              <CardDescription>Recent payslips on file.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {payslips.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payslips yet.
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
                        Net {formatCurrency(payslip.net)}
                      </p>
                    </div>
                    <Badge variant="outline">{payslip.status}</Badge>
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
