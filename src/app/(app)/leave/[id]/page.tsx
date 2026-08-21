import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  CircleCheck,
  CircleDashed,
  CircleX,
  MessageSquareText,
  Send,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeaveRequestActions } from "@/components/hr/leave-request-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDate,
  getEmployeeById,
  getLeaveRequest,
  LEAVE_REQUESTS,
  LEAVE_TYPE_LABELS,
  type LeaveStatus,
} from "@/lib/hr-data";

export const metadata = { title: "Leave request" };

const STATUS_VARIANT: Record<
  LeaveStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  declined: "destructive",
  cancelled: "secondary",
};

export default async function LeaveRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = getLeaveRequest(id);
  if (!request) notFound();

  const employee = getEmployeeById(request.employeeId);
  const related = LEAVE_REQUESTS.filter(
    (item) => item.employeeId === request.employeeId && item.id !== request.id,
  );
  const isDecided = request.status !== "pending";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/leave"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Leave
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {LEAVE_TYPE_LABELS[request.type]}
            </h1>
            <Badge variant={STATUS_VARIANT[request.status]}>
              {request.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(request.start)} → {formatDate(request.end)} ·{" "}
            {request.days} day
            {request.days > 1 ? "s" : ""}
          </p>
        </div>
        {employee && (
          <Link href={`/employees/${employee.id}`}>
            <Button variant="outline">View employee profile</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Request details</CardTitle>
              <CardDescription>
                Information submitted with the request.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="size-3.5" /> Duration
                </p>
                <p className="mt-1 font-medium">
                  {formatDate(request.start)} → {formatDate(request.end)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.days} working days
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Send className="size-3.5" /> Submitted
                </p>
                <p className="mt-1 font-medium">{formatDate(request.start)}</p>
                <p className="text-xs text-muted-foreground">
                  via self-service
                </p>
              </div>
              {request.reason && (
                <div className="rounded-lg border border-border bg-background/50 p-3 sm:col-span-2">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquareText className="size-3.5" /> Reason
                  </p>
                  <p className="mt-1">“{request.reason}”</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Lifecycle of this request.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex gap-3">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Send className="size-3" />
                </span>
                <div className="pb-6">
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(request.start)}
                  </p>
                </div>
              </div>
              {isDecided ? (
                <div className="flex gap-3">
                  <span
                    className={
                      request.status === "approved"
                        ? "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
                        : request.status === "cancelled"
                          ? "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          : "mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    }
                  >
                    {request.status === "approved" ? (
                      <CircleCheck className="size-3" />
                    ) : (
                      <CircleX className="size-3" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {request.status === "approved"
                        ? "Approved"
                        : request.status === "cancelled"
                          ? "Cancelled"
                          : "Declined"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.status === "cancelled"
                        ? "Request cancelled"
                        : "Decided by People team"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <CircleDashed className="size-3" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Awaiting decision</p>
                    <p className="text-xs text-muted-foreground">
                      Pending approval
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Decide this request.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveRequestActions request={request} />
            </CardContent>
          </Card>

          {employee && (
            <Card>
              <CardHeader>
                <CardTitle>Employee</CardTitle>
                <CardDescription>Requesting team member.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar name={employee.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.role} · {employee.department}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {related.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Other requests</CardTitle>
                <CardDescription>By the same employee.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/leave/${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate">
                      {LEAVE_TYPE_LABELS[item.type]}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {formatDate(item.start)}
                      </span>
                    </span>
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {item.status}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
