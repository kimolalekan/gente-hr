import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Target, TrendingUp } from "lucide-react";
import { ReviewFeedbackButton } from "@/components/hr/reviews-manager";
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
import { formatDate } from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("performance.reviewTitle") };
}

/** Review detail from `GET /api/performance/reviews/[id]`. */
interface ReviewDetail {
  id: string;
  cycleId: string;
  cycleName: string | null;
  employeeId: string;
  employeeName: string | null;
  reviewerName: string | null;
  templateId: string;
  deadline: string | null;
  deadlineExtended: number;
  selfRating: number | null;
  managerRating: number | null;
  overall: number | null;
  status: string;
  strengths: string | null;
  growth: string | null;
  submittedAt: string | null;
  createdAt: string;
  template: {
    name: string;
    description: string | null;
  } | null;
}

/** Cycle row from `GET /api/performance/cycles` (for the period label). */
interface CycleRow {
  id: string;
  name: string;
  period: string;
  status: string;
  createdAt: string;
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const review = await apiGet<ReviewDetail>(
    `/api/performance/reviews/${id}`,
  ).catch(() => null);
  if (!review) notFound();

  const t = await getTranslator();
  const locale = await getTenantLocale();

  // Employees can only open their own reviews (the API also enforces this).
  if (user?.role === "member") {
    const me = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    if (!me || me.id !== review.employeeId) notFound();
  }

  const cycles = await apiGet<CycleRow[]>("/api/performance/cycles").catch(
    () => [],
  );
  const cycle = cycles.find((item) => item.id === review.cycleId);
  const reviewer = review.reviewerName ?? "—";
  const employeeName = review.employeeName ?? review.id;
  const submitted = review.status === "submitted";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/performance"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("nav.performance")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t("performance.reviewTitleNamed", { name: employeeName })}
            </h1>
            <Badge variant={submitted ? "success" : "warning"}>
              {t(`statusLabels.review.${review.status}` as TranslationKey)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("performance.reviewedBy", {
              cycle: cycle?.name ?? review.cycleId,
              reviewer,
            })}
          </p>
        </div>
        {user?.role !== "member" && (
          <Link href={`/employees/${review.employeeId}`}>
            <Button variant="outline">{t("employees.viewProfile")}</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("performance.ratings")}</CardTitle>
              <CardDescription>
                {t("performance.ratingsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/50 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5" /> {t("performance.selfRating")}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {review.selfRating ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" />{" "}
                  {t("performance.managerRating")}
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {review.managerRating ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-primary bg-primary/5 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Target className="size-3.5" /> {t("performance.overall")}
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {(review.overall ?? 0) > 0
                    ? `${review.overall?.toFixed(1)}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("performance.strengths")}</CardTitle>
                <CardDescription>
                  {t("performance.strengthsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {review.strengths ?? "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("performance.growth")}</CardTitle>
                <CardDescription>
                  {t("performance.growthDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {review.growth ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {user?.role === "member" ? (
            !submitted && (
              <div className="flex justify-end">
                <ReviewFeedbackButton
                  reviewId={review.id}
                  canManage={false}
                  rating={review.selfRating}
                  strengths={review.strengths}
                  growth={review.growth}
                  submitted={submitted}
                />
              </div>
            )
          ) : (
            <div className="flex justify-end">
              <ReviewFeedbackButton
                reviewId={review.id}
                canManage
                rating={review.managerRating}
                strengths={review.strengths}
                growth={review.growth}
                submitted={submitted}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("performance.reviewer")}</CardTitle>
              <CardDescription>
                {t("performance.reviewerDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar name={reviewer} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium">{reviewer}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t("performance.peopleManager")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("performance.cycle")}</CardTitle>
              <CardDescription>
                {t("performance.cycleDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{cycle?.name ?? review.cycleId}</p>
              <p className="text-muted-foreground">{cycle?.period ?? ""}</p>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("performance.template")}
                </p>
                <p className="mt-0.5 font-medium">
                  {review.template?.name ?? review.templateId}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {t("performance.deadline")}
                </p>
                <p className="mt-0.5 font-medium">
                  {review.deadline
                    ? formatDate(review.deadline.slice(0, 10), locale)
                    : "—"}
                  {(review.deadlineExtended ?? 0) > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {t("performance.extended", {
                        n: review.deadlineExtended ?? 0,
                      })}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("performance.reviewedOn", {
                  date: review.submittedAt
                    ? formatDate(review.submittedAt.slice(0, 10), locale)
                    : "—",
                })}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
