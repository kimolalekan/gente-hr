import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/hr/page-header";
import { ReviewsManager } from "@/components/hr/reviews-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import {
  EMPLOYEES,
  PERFORMANCE_TEMPLATES,
  REVIEW_CYCLES,
  REVIEWS,
} from "@/lib/hr-data";

export const metadata = { title: "Performance" };

export default async function PerformancePage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader
        title="Performance reviews"
        description="Review cycles, ratings and feedback."
      >
        <Link href="/performance/templates">
          <Button variant="outline">
            <FileText className="size-4" />
            Templates
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ClipboardList className="size-4" /> Open cycles
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {REVIEW_CYCLES.filter((cycle) => cycle.status === "open").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Star className="size-4" /> Reviews
            </p>
            <p className="mt-1 text-2xl font-bold">{REVIEWS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" /> Submitted
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {REVIEWS.filter((review) => review.status === "submitted").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Gauge className="size-4" /> Average rating
            </p>
            <p className="mt-1 text-2xl font-bold">
              {(
                REVIEWS.reduce((sum, review) => sum + review.overall, 0) /
                REVIEWS.length
              ).toFixed(1)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review cycles</CardTitle>
          <CardDescription>
            Quarterly, half-yearly and annual cycles.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {REVIEW_CYCLES.map((cycle) => (
            <div
              key={cycle.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 p-3"
            >
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Star className="size-3.5 text-primary" />
                  {cycle.name}
                </p>
                <p className="text-xs text-muted-foreground">{cycle.period}</p>
              </div>
              <Badge
                variant={cycle.status === "open" ? "success" : "secondary"}
              >
                {cycle.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ReviewsManager
        reviews={REVIEWS}
        employees={EMPLOYEES}
        templates={PERFORMANCE_TEMPLATES}
        reviewer={user?.name ?? ""}
        canManage={user?.role !== "member"}
      />
    </>
  );
}
