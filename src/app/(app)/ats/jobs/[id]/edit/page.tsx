import { notFound, redirect } from "next/navigation";
import { JobForm, type JobFormValues } from "@/components/ats/job-form";
import {
  ApiClientError,
  apiGet,
  type Paginated,
} from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import type { JobStatus } from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("ats.jobs.editJob") };
}

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  questions: string[];
  quizId: string | null;
  status: JobStatus;
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const { id } = await params;
  let job: JobRow;
  try {
    job = await apiGet<JobRow>(`/api/ats/jobs/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const [departmentPage, quizPage] = await Promise.all([
    apiGet<Paginated<{ id: string; name: string }>>("/api/departments", {
      pageSize: 500,
    }),
    apiGet<Array<{ id: string; name: string }>>("/api/ats/quizzes"),
  ]);

  const initial: JobFormValues = {
    id: job.id,
    title: job.title,
    department: job.department ?? "",
    location: job.location ?? "",
    employmentType: job.employmentType,
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : "",
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : "",
    description: job.description ?? "",
    questions: job.questions ?? [],
    quizId: job.quizId ?? "",
    status: job.status,
  };

  return (
    <JobForm
      initial={initial}
      departments={departmentPage.items.map((item) => item.name)}
      quizzes={quizPage.map((quiz) => ({ id: quiz.id, name: quiz.name }))}
    />
  );
}
