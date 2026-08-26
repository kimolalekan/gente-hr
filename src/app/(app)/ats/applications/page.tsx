import { redirect } from "next/navigation";
import { ApplicationBoard } from "@/components/ats/application-board";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import type { Application, Job } from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("ats.applications.title") };
}

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const t = await getTranslator();
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const [applicationsPage, jobsPage] = await Promise.all([
    apiGet<Paginated<Application>>("/api/ats/applications", { pageSize: 500 }),
    apiGet<Paginated<Job>>("/api/ats/jobs", { pageSize: 500 }),
  ]);

  return (
    <>
      <PageHeader
        title={t("ats.applications.title")}
        description={t("ats.applications.description")}
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
