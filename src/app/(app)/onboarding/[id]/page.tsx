import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  formatDate,
  getEmployeeById,
  getOnboardingPlan,
  getOnboardingProgress,
  TASK_STATUS_LABELS,
} from "@/lib/hr-data";

export const metadata = { title: "Onboarding plan" };

export default async function OnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = getOnboardingPlan(id);
  if (!plan) notFound();

  const employee = getEmployeeById(plan.employeeId);
  const progress = getOnboardingProgress(plan);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/onboarding"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Onboarding
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Onboarding — {plan.fullName}
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
              {plan.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{plan.email}</p>
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
              <CardTitle>Task checklist</CardTitle>
              <CardDescription>
                Assigned to HR, IT and Admin — tap to update.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm"
                  >
                    <span
                      className={
                        task.status === "completed"
                          ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"
                          : "flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-transparent"
                      }
                    >
                      <CheckCircle2 className="size-3" />
                    </span>
                    <span
                      className={
                        task.status === "completed"
                          ? "flex-1 text-muted-foreground line-through"
                          : "flex-1"
                      }
                    >
                      {task.name}
                    </span>
                    <Badge variant="outline" className="hidden sm:inline-flex">
                      {task.department}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Offer letter</CardTitle>
              <CardDescription>
                Signed copy submitted by the employee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-4 shrink-0" />
                  Signed offer letter
                </span>
                {plan.signedOfferLetter ? (
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-success">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                    <span className="truncate">{plan.signedOfferLetter}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-warning">
                    <Clock className="size-3.5 shrink-0" />
                    Awaiting employee signature
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted by the employee through the link in their invite
                email.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>New hire</CardTitle>
              <CardDescription>
                Personal details for the invite.
              </CardDescription>
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
                Phone: {plan.phone || "—"}
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
                {formatDate(plan.startDate)} → {formatDate(plan.targetDate)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Overall completion.</CardDescription>
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
                {
                  plan.tasks.filter((task) => task.status === "completed")
                    .length
                }{" "}
                of {plan.tasks.length} tasks completed
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
