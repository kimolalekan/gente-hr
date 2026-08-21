import { notFound } from "next/navigation";
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
import {
  formatDate,
  getAttendanceWeek,
  getEmployeeById,
  getEmployeeDocuments,
  getLeaveBalance,
  LEAVE_REQUESTS,
  LEAVE_TYPE_LABELS,
  type AttendanceStatus,
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

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export const metadata = { title: "Employee profile" };

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = getEmployeeById(id);
  if (!employee) notFound();

  const balance = getLeaveBalance(employee.id);
  const leaveHistory = LEAVE_REQUESTS.filter(
    (request) => request.employeeId === employee.id,
  );

  return (
    <>
      <EmployeeProfileCard employee={employee} />

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
                {getEmployeeDocuments(employee.id).map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{document.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {document.category} · uploaded{" "}
                        {formatDate(document.uploadedAt)}
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
              {leaveHistory.length === 0 ? (
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
                      {leaveHistory.map((request) => (
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
                Check-ins · {getAttendanceWeek(employee.id).length} workdays
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    {getAttendanceWeek(employee.id).map((record, index) => {
                      const meta = ATTENDANCE_META[record.status];
                      return (
                        <tr
                          key={record.date}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-2 pr-3 text-xs font-medium">
                            {WEEKDAY_LABELS[index]}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {record.checkIn}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {record.checkOut}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leave balance</CardTitle>
              <CardDescription>Current year.</CardDescription>
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
        </div>
      </div>
    </>
  );
}
