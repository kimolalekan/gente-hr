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
import { type LeaveRow } from "@/components/hr/leave-requests-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDate,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  ApiClientError,
  apiGet,
  type Paginated,
} from "@/lib/server/api-client";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("leave.requestTitle") };
}

const STATUS_VARIANT: Record<
  LeaveStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  declined: "destructive",
  cancelled: "secondary",
};

/** Detail row returned by `GET /api/leave/[id]` (raw DB row + employee name). */
interface ApiLeaveDetail {
  id: string;
  employeeId: string;
  employeeName: string | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
}

export default async function LeaveRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getTenantLocale();
  const t = await getTranslator();

  let request: LeaveRequest;
  let employeeName: string | null = null;
  try {
    const detail = await apiGet<ApiLeaveDetail>(`/api/leave/${id}`);
    employeeName = detail.employeeName;
    request = {
      id: detail.id,
      employeeId: detail.employeeId,
      type: detail.type,
      start: detail.startDate,
      end: detail.endDate,
      days: detail.days,
      reason: detail.reason ?? undefined,
      status: detail.status,
    };
  } catch (error) {
    // The API denies foreign requests to members with 403 — hide it like a 404.
    if (
      error instanceof ApiClientError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  // Employees can only open their own requests.
  const user = await getCurrentUser();
  if (user?.role === "member") {
    const myEmployee = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    if (request.employeeId !== myEmployee?.id) notFound();
  }

  const related = (
    await apiGet<Paginated<LeaveRow>>("/api/leave", {
      employeeId: request.employeeId,
      pageSize: 100,
    })
  ).items.filter((item) => item.id !== id);
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
            {t("leave.title")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t(`statusLabels.leaveType.${request.type}` as TranslationKey)}
            </h1>
            <Badge variant={STATUS_VARIANT[request.status]}>
              {t(
                `statusLabels.leaveStatus.${request.status}` as TranslationKey,
              )}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(request.start, locale)} →{" "}
            {formatDate(request.end, locale)} ·{" "}
            {t("leave.daysCount", {
              days: request.days,
              s: request.days === 1 ? "" : "s",
            })}
          </p>
        </div>
        {user?.role !== "member" && (
          <Link href={`/employees/${request.employeeId}`}>
            <Button variant="outline">{t("employees.viewProfile")}</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("leave.requestDetails")}</CardTitle>
              <CardDescription>
                {t("leave.requestDetailsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarRange className="size-3.5" /> {t("leave.duration")}
                </p>
                <p className="mt-1 font-medium">
                  {formatDate(request.start, locale)} →{" "}
                  {formatDate(request.end, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("leave.workingDays", {
                    days: request.days,
                    s: request.days === 1 ? "" : "s",
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Send className="size-3.5" /> {t("leave.submitted")}
                </p>
                <p className="mt-1 font-medium">
                  {formatDate(request.start, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("leave.viaSelfService")}
                </p>
              </div>
              {request.reason && (
                <div className="rounded-lg border border-border bg-background/50 p-3 sm:col-span-2">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquareText className="size-3.5" />{" "}
                    {t("leave.reason")}
                  </p>
                  <p className="mt-1">“{request.reason}”</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("ats.applications.timeline")}</CardTitle>
              <CardDescription>
                {t("leave.timelineDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="flex gap-3">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Send className="size-3" />
                </span>
                <div className="pb-6">
                  <p className="text-sm font-medium">{t("leave.submitted")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(request.start, locale)}
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
                      {t(
                        `statusLabels.leaveStatus.${request.status}` as TranslationKey,
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.status === "cancelled"
                        ? t("leave.requestCancelled")
                        : t("leave.decidedByPeopleTeam")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                    <CircleDashed className="size-3" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {t("leave.awaitingDecision")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("leave.pendingApproval")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {user?.role === "member" ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("common.status")}</CardTitle>
                <CardDescription>
                  {t("leave.progressDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {request.status === "pending" ? (
                  <p className="text-sm text-muted-foreground">
                    {t("leave.memberAwaitingApproval")}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("leave.noFurtherActions", {
                      status: t(
                        `statusLabels.leaveStatus.${request.status}` as TranslationKey,
                      ),
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{t("common.actions")}</CardTitle>
                <CardDescription>
                  {t("leave.decideDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveRequestActions request={request} />
              </CardContent>
            </Card>
          )}

          {employeeName && (
            <Card>
              <CardHeader>
                <CardTitle>{t("onboarding.employee")}</CardTitle>
                <CardDescription>
                  {t("leave.requestingTeamMember")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar name={employeeName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{employeeName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {related.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("leave.otherRequests")}</CardTitle>
                <CardDescription>{t("leave.bySameEmployee")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {related.map((item) => (
                  <Link
                    key={item.id}
                    href={`/leave/${item.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="truncate">
                      {t(
                        `statusLabels.leaveType.${item.type}` as TranslationKey,
                      )}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {formatDate(item.start, locale)}
                      </span>
                    </span>
                    <Badge variant={STATUS_VARIANT[item.status]}>
                      {t(
                        `statusLabels.leaveStatus.${item.status}` as TranslationKey,
                      )}
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
