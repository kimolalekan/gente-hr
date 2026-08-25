import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { ApplyForm } from "@/components/ats/apply-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApiClientError, apiGet } from "@/lib/server/api-client";
import { EMPLOYMENT_TYPE_LABELS, formatCurrency } from "@/lib/hr-data";

export const metadata: Metadata = { title: "Apply" };

export const dynamic = "force-dynamic";

interface CompanyInfo {
  name: string;
  website: string;
  supportEmail: string;
  supportPhone: string;
  about: string;
}

interface QuizForCandidate {
  id: string;
  name: string;
  description: string | null;
  questions: Array<{ question: string; options: string[] }>;
}

interface PublicJob {
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string | null;
  questions: string[];
  quiz: QuizForCandidate | null;
  status: string;
  company: CompanyInfo | null;
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
      questions: [],
      quiz: null,
      status: "closed",
      company: null,
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
              <div
                className="rich-content mb-5 text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            )}

            {job.company && (
              <div className="mb-6 border-t border-border pt-5">
                <h2 className="text-sm font-semibold">
                  About {job.company.name}
                </h2>
                {job.company.about && (
                  <div
                    className="rich-content mt-2 text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: job.company.about }}
                  />
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {job.company.website && (
                    <a
                      href={job.company.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Globe className="size-3.5" />
                      {job.company.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {job.company.supportEmail && (
                    <a
                      href={`mailto:${job.company.supportEmail}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Mail className="size-3.5" />
                      {job.company.supportEmail}
                    </a>
                  )}
                  {job.company.supportPhone && (
                    <a
                      href={`tel:${job.company.supportPhone}`}
                      className="flex items-center gap-1.5"
                    >
                      <Phone className="size-3.5" />
                      {job.company.supportPhone}
                    </a>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {job.location}
                    </span>
                  )}
                </div>
              </div>
            )}
            {job.status === "open" ? (
              <ApplyForm
                jobId={jobId}
                jobTitle={job.title}
                questions={job.questions ?? []}
                quiz={job.quiz}
              />
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
