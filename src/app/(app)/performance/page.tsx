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
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "Performance" };

/** Review row from `GET /api/performance/reviews` (member-scoped for members). */
interface ReviewRow {
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
  submittedAt: string | null;
  createdAt: string;
}

/** Cycle row from `GET /api/performance/cycles`. */
interface CycleRow {
  id: string;
  name: string;
  period: string;
  status: string;
  createdAt: string;
}

/** Template row from `GET /api/performance/templates`. */
interface TemplateRow {
  id: string;
  name: string;
  active: boolean;
}

/** Employee row from `GET /api/employees` (start-review picker). */
interface EmployeeRow {
  id: string;
  name: string;
  role: string | null;
}

/** Employee (member) view — their own reviews only. */
function MyPerformance({
  reviews,
  templates,
}: {
  reviews: ReviewRow[];
  templates: TemplateRow[];
}) {
  return (
    <>
      <PageHeader
        title="My performance"
        description="Your reviews, ratings and feedback."
      />

      <ReviewsManager
        reviews={reviews}
        employees={[]}
        templates={templates}
        canManage={false}
      />
    </>
  );
}

export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (user?.role === "member") {
    const [reviews, templates] = await Promise.all([
      apiGet<Paginated<ReviewRow>>("/api/performance/reviews"),
      apiGet<TemplateRow[]>("/api/performance/templates"),
    ]);
    return <MyPerformance reviews={reviews.items} templates={templates} />;
  }

  const [reviews, cycles, templates, employees] = await Promise.all([
    apiGet<Paginated<ReviewRow>>("/api/performance/reviews"),
    apiGet<CycleRow[]>("/api/performance/cycles"),
    apiGet<TemplateRow[]>("/api/performance/templates"),
    apiGet<Paginated<EmployeeRow>>("/api/employees"),
  ]);

  const openCycles = cycles.filter((cycle) => cycle.status === "open").length;
  const submitted = reviews.items.filter(
    (review) => review.status === "submitted",
  ).length;
  const rated = reviews.items.filter(
    (review) => review.overall !== null && review.overall > 0,
  );
  const average =
    rated.length > 0
      ? (
          rated.reduce((sum, review) => sum + (review.overall ?? 0), 0) /
          rated.length
        ).toFixed(1)
      : "—";

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
            <p className="mt-1 text-2xl font-bold text-primary">{openCycles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Star className="size-4" /> Reviews
            </p>
            <p className="mt-1 text-2xl font-bold">{reviews.items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" /> Submitted
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Gauge className="size-4" /> Average rating
            </p>
            <p className="mt-1 text-2xl font-bold">{average}</p>
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
          {cycles.map((cycle) => (
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
        reviews={reviews.items}
        employees={employees.items}
        templates={templates}
        canManage
      />
    </>
  );
}
