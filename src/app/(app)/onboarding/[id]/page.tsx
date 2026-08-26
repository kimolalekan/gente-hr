import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  UserRound,
} from "lucide-react";
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
import { OnboardingTasks } from "@/components/hr/onboarding-tasks";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, ApiClientError } from "@/lib/server/api-client";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  formatDate,
  getOnboardingProgress,
  type OnboardingPlan,
  type OnboardingTask,
  type TaskStatus,
} from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("onboarding.planTitle") };
}

interface OnboardingDetailRow {
  id: string;
  employeeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  country: string | null;
  signedOfferLetter: string | null;
  startDate: string;
  targetDate: string;
  status: string;
  createdAt: string;
  tasks: Array<{
    id: string;
    name: string;
    department: string;
    status: TaskStatus;
    dueDate: string | null;
    sortOrder: number;
  }>;
}

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslator();

  // Employees don't manage onboarding — it's an HR/admin workspace.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const locale = await getTenantLocale();

  let row: OnboardingDetailRow;
  try {
    row = await apiGet<OnboardingDetailRow>(`/api/onboarding/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const plan: OnboardingPlan = {
    id: row.id,
    employeeId: row.employeeId ?? "",
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address ?? "",
    state: row.state ?? "",
    country: row.country ?? "",
    signedOfferLetter: row.signedOfferLetter ?? undefined,
    startDate: row.startDate,
    targetDate: row.targetDate,
    status: row.status as OnboardingPlan["status"],
    tasks: row.tasks.map((task): OnboardingTask => ({
      id: task.id,
      name: task.name,
      department: task.department as OnboardingTask["department"],
      status: task.status,
      due: task.dueDate ?? row.targetDate,
    })),
  };

  const progress = plan.tasks.length === 0 ? 0 : getOnboardingProgress(plan);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/onboarding"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("onboarding.title")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t("onboarding.title")} — {plan.fullName}
            </h1>
            <Badge
              variant={
                plan.status === "completed"
                  ? "success"
                  : plan.status === "in_progress"
                    ? "info"
                    : "secondary"
              }
            >
              {t(
                `statusLabels.onboardingPlan.${plan.status}` as TranslationKey,
              )}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{plan.email}</p>
        </div>
        {plan.employeeId && (
          <Link href={`/employees/${plan.employeeId}`}>
            <Button variant="outline">{t("employees.viewProfile")}</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("onboarding.taskChecklist")}</CardTitle>
              <CardDescription>{t("onboarding.tasksHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingTasks planId={plan.id} tasks={plan.tasks} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("onboarding.offerLetter")}</CardTitle>
              <CardDescription>
                {t("onboarding.offerLetterHint")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4 shrink-0" />
                  {t("onboarding.signedOfferLetter")}
                </span>
                {plan.signedOfferLetter ? (
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span className="truncate">{plan.signedOfferLetter}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-warning">
                    <Clock className="size-3.5 shrink-0" />
                    {t("onboarding.awaitingSignature")}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("onboarding.offerLetterSubmitted")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("onboarding.newHire")}</CardTitle>
              <CardDescription>{t("onboarding.newHireHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={plan.fullName} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{plan.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {plan.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="size-4 shrink-0" />
                {t("onboarding.phone")}: {plan.phone || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                {plan.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {[plan.address, plan.state, plan.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="size-4 shrink-0" />
                {plan.country || "—"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="size-4 shrink-0" />
                {formatDate(plan.startDate, locale)} →{" "}
                {formatDate(plan.targetDate, locale)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("onboarding.progress")}</CardTitle>
              <CardDescription>{t("onboarding.progressHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{progress}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("onboarding.tasksCompleted", {
                  done: plan.tasks.filter((task) => task.status === "completed")
                    .length,
                  total: plan.tasks.length,
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
