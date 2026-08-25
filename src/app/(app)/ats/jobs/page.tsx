import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, MapPin, Plus } from "lucide-react";
import { JobStatusSelect } from "@/components/ats/job-status-select";
import { PageHeader } from "@/components/hr/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import {
  EMPLOYMENT_TYPE_LABELS,
  type Job,
  type JobStatus,
} from "@/lib/hr-data";

export const metadata = { title: "Jobs" };

export const dynamic = "force-dynamic";

function statusVariant(status: JobStatus): "success" | "warning" | "secondary" {
  if (status === "open") return "success";
  if (status === "draft") return "warning";
  return "secondary";
}

export default async function JobsPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const jobsPage = await apiGet<Paginated<Job>>("/api/ats/jobs", {
    pageSize: 500,
  });
  const jobs = jobsPage.items;

  const openCount = jobs.filter((job) => job.status === "open").length;
  const draftCount = jobs.filter((job) => job.status === "draft").length;
  const totalApplications = jobs.reduce(
    (sum, job) => sum + job.applications,
    0,
  );

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Job postings and the applications they attract."
      >
        <Link
          href="/ats/jobs/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus />
          New job
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Open jobs
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Drafts</p>
            <p className="mt-1 text-2xl font-bold">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Applications
            </p>
            <p className="mt-1 text-2xl font-bold">{totalApplications}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All jobs</CardTitle>
          <CardDescription>
            Open jobs accept applications via their public link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <BriefcaseBusiness className="size-8 text-muted-foreground" />
              <p className="font-medium">No jobs yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first job posting to start recruiting.
              </p>
              <Link
                href="/ats/jobs/new"
                className={buttonVariants({ size: "sm" })}
              >
                <Plus />
                New job
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">Job</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      Location
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      Type
                    </th>
                    <th className="px-4 py-2.5 font-medium">Applications</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          href={`/ats/jobs/${job.id}`}
                          className="block max-w-64 truncate font-medium transition-colors hover:text-primary"
                        >
                          {job.title}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.department ?? "General"}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {job.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {job.location}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {EMPLOYMENT_TYPE_LABELS[job.employmentType] ??
                          job.employmentType}
                      </td>
                      <td className="px-4 py-3">{job.applications}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center justify-end gap-2">
                          <JobStatusSelect jobId={job.id} status={job.status} />
                          <Link
                            href={`/ats/jobs/${job.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
