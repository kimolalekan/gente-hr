import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Target, TrendingUp } from "lucide-react";
import { ActionButton } from "@/components/hr/action-button";
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
  formatDate,
  getCycle,
  getEmployeeById,
  getPerformanceTemplate,
  getReview,
} from "@/lib/hr-data";

export const metadata = { title: "Performance review" };

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = getReview(id);
  if (!review) notFound();

  const employee = getEmployeeById(review.employeeId);
  const cycle = getCycle(review.cycleId);
  const template = getPerformanceTemplate(review.templateId);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/performance"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Performance
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Review — {employee?.name ?? review.id}
            </h1>
            <Badge
              variant={review.status === "submitted" ? "success" : "warning"}
            >
              {review.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {cycle?.name ?? review.cycleId} · reviewed by {review.reviewer}
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
              <CardTitle>Ratings</CardTitle>
              <CardDescription>
                Self and manager evaluation on a 1–5 scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background/50 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Star className="size-3.5" /> Self
                </p>
                <p className="mt-1 text-2xl font-bold">{review.selfRating}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" /> Manager
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {review.managerRating}
                </p>
              </div>
              <div className="rounded-lg border border-primary bg-primary/5 p-4 text-center">
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Target className="size-3.5" /> Overall
                </p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {review.overall.toFixed(1)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
                <CardDescription>What&apos;s working well.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {review.strengths}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Areas of growth</CardTitle>
                <CardDescription>Where to focus next.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{review.growth}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <ActionButton
              variant={review.status === "submitted" ? "outline" : "default"}
              doneLabel={
                review.status === "submitted" ? "Submitted" : "Feedback saved"
              }
            >
              {review.status === "submitted"
                ? "Edit review"
                : "Submit feedback"}
            </ActionButton>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer</CardTitle>
              <CardDescription>Manager evaluation.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar name={review.reviewer} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium">{review.reviewer}</p>
                <p className="truncate text-xs text-muted-foreground">
                  People manager
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cycle</CardTitle>
              <CardDescription>Review period.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{cycle?.name ?? review.cycleId}</p>
              <p className="text-muted-foreground">{cycle?.period ?? ""}</p>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="mt-0.5 font-medium">
                  {template?.name ?? review.templateId}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="mt-0.5 font-medium">
                  {formatDate(review.deadline)}
                  {(review.deadlineExtended ?? 0) > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      extended {review.deadlineExtended ?? 0}×
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Reviewed {formatDate("2026-08-18")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
