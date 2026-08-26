import { redirect } from "next/navigation";
import { JobForm } from "@/components/ats/job-form";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("ats.jobs.newJob") };
}

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const [departmentPage, quizPage] = await Promise.all([
    apiGet<Paginated<{ id: string; name: string }>>("/api/departments", {
      pageSize: 500,
    }),
    apiGet<Array<{ id: string; name: string }>>("/api/ats/quizzes"),
  ]);

  return (
    <JobForm
      departments={departmentPage.items.map((item) => item.name)}
      quizzes={quizPage.map((quiz) => ({ id: quiz.id, name: quiz.name }))}
    />
  );
}
