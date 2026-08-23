import { notFound } from "next/navigation";
import { ApplyForm } from "@/components/ats/apply-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApiClientError, apiGet } from "@/lib/server/api-client";
import {
  EMPLOYMENT_TYPE_LABELS,
  formatCurrency,
} from "@/lib/hr-data";

export const metadata = { title: "Apply" };

export const dynamic = "force-dynamic";

interface PublicJob {
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  status: string;
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  let job: PublicJob;
  try {
    job = await apiGet<PublicJob>(`/api/ats/jobs/${jobId}/apply`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    // 409 (closed) and any other error render the closed state below.
    job = {
      title: "This job is no longer accepting applications",
      department: null,
      location: null,
      employmentType: "",
      salaryMin: null,
      salaryMax: null,
      description: null,
      status: "closed",
    };
  }

  const salaryRange =
    job.salaryMin != null || job.salaryMax != null
      ? `${job.salaryMin != null ? formatCurrency(job.salaryMin) : "—"} – ${
          job.salaryMax != null ? formatCurrency(job.salaryMax) : "—"
        }`
      : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/40 p-6">
            <Badge variant="success">We&apos;re hiring</Badge>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                job.department,
                job.location,
                EMPLOYMENT_TYPE_LABELS[job.employmentType],
                salaryRange,
              ]
                .filter(Boolean)
                .join(" · ") || "Join our team"}
            </p>
          </div>
          <CardContent className="p-6">
            {job.description && (
              <p className="mb-5 whitespace-pre-wrap text-sm text-muted-foreground">
                {job.description}
              </p>
            )}
            {job.status === "open" ? (
              <ApplyForm jobId={jobId} jobTitle={job.title} />
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                This job is no longer accepting applications.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
