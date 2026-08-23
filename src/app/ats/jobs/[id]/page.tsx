import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, MapPin, Pencil, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ApiClientError,
  apiGet,
  type Paginated,
} from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import {
  APPLICATION_STAGE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatCurrency,
  formatDate,
  type Application,
  type JobStatus,
} from "@/lib/hr-data";

export const metadata = { title: "Job" };

export const dynamic = "force-dynamic";

interface JobDetail {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  status: JobStatus;
  createdAt: string;
  applications: number;
  stageCounts: Record<string, number>;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const { id } = await params;
  let job: JobDetail;
  try {
    job = await apiGet<JobDetail>(`/api/ats/jobs/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const applicationsPage = await apiGet<Paginated<Application>>(
    "/api/ats/applications",
    { jobId: id, pageSize: 500 },
  );
  const applications = applicationsPage.items;

  const salaryRange =
    job.salaryMin != null || job.salaryMax != null
      ? `${job.salaryMin != null ? formatCurrency(job.salaryMin) : "—"} – ${
          job.salaryMax != null ? formatCurrency(job.salaryMax) : "—"
        }`
      : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/ats/jobs"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Jobs
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <Badge
              variant={
                job.status === "open"
                  ? "success"
                  : job.status === "draft"
                    ? "warning"
                    : "secondary"
              }
            >
              {job.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[job.department, job.location && `📍 ${job.location}`]
              .filter(Boolean)
              .join(" · ") || "General"}
          </p>
        </div>
        <div className="flex gap-2">
          {job.status === "open" && (
            <Link
              href={`/apply/${job.id}`}
              target="_blank"
              className={buttonVariants({ variant: "outline" })}
            >
              Public link
            </Link>
          )}
          <Link
            href={`/ats/jobs/${job.id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil />
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                Candidates who applied to this job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No applications yet
                    {job.status === "open"
                      ? " — share the public link to start receiving them."
                      : "."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2.5 pr-4 font-medium">Candidate</th>
                        <th className="px-4 py-2.5 font-medium">Stage</th>
                        <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                          Applied
                        </th>
                        <th className="py-2.5 pl-4 text-right font-medium">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((application) => (
                        <tr
                          key={application.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={application.name} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {application.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {application.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                application.stage === "hired"
                                  ? "success"
                                  : application.stage === "rejected"
                                    ? "destructive"
                                    : application.stage === "offer"
                                      ? "info"
                                      : "secondary"
                              }
                            >
                              {APPLICATION_STAGE_LABELS[application.stage] ??
                                application.stage}
                            </Badge>
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                            {formatDate(
                              String(application.createdAt).slice(0, 10),
                            )}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <Link
                              href={`/ats/applications/${application.id}`}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              View
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

          {job.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {job.description}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Posting information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">
                  {EMPLOYMENT_TYPE_LABELS[job.employmentType] ??
                    job.employmentType}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="flex items-center gap-1 font-medium">
                  {job.location ? (
                    <>
                      <MapPin className="size-3.5" />
                      {job.location}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Salary range</span>
                <span className="font-medium">{salaryRange ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {formatDate(job.createdAt.slice(0, 10))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
              <CardDescription>Applications by stage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(APPLICATION_STAGE_LABELS).map(
                ([stage, label]) => (
                  <div
                    key={stage}
                    className="flex items-center justify-between"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">
                      {job.stageCounts?.[stage] ?? 0}
                    </span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
