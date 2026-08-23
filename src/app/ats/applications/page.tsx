import { redirect } from "next/navigation";
import { ApplicationBoard } from "@/components/ats/application-board";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import type { Application, Job } from "@/lib/hr-data";

export const metadata = { title: "Applications" };

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const [applicationsPage, jobsPage] = await Promise.all([
    apiGet<Paginated<Application>>("/api/ats/applications", { pageSize: 500 }),
    apiGet<Paginated<Job>>("/api/ats/jobs", { pageSize: 500 }),
  ]);

  return (
    <>
      <PageHeader
        title="Applications"
        description="Move candidates through the hiring pipeline."
      />
      <ApplicationBoard
        applications={applicationsPage.items}
        jobs={jobsPage.items.map((job) => ({
          id: job.id,
          title: job.title,
          status: job.status,
        }))}
      />
    </>
  );
}
