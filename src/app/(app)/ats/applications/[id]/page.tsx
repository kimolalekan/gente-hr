import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Mail,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { ApplicationActions } from "@/components/ats/application-actions";
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
import { ApiClientError, apiGet } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import {
  APPLICATION_STAGE_LABELS,
  formatCurrency,
  formatDate,
  type ApplicationStage,
  type InterviewStatus,
  type OfferStatus,
} from "@/lib/hr-data";

export const metadata = { title: "Application" };

export const dynamic = "force-dynamic";

interface StageHistoryRow {
  id: string;
  fromStage: string;
  toStage: string;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

interface InterviewRow {
  id: string;
  round: number;
  scheduledAt: string;
  interviewer: string | null;
  feedback: string | null;
  status: InterviewStatus;
}

interface OfferRow {
  id: string;
  salary: number | null;
  startDate: string | null;
  terms: string | null;
  status: OfferStatus;
  createdAt: string;
}

interface ApplicationDetail {
  id: string;
  jobId: string;
  jobTitle: string | null;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  state: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  answers: Record<string, string> | null;
  quizResult: {
    score: number;
    total: number;
    answers: number[];
  } | null;
  quiz: {
    id: string;
    name: string;
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
    }>;
  } | null;
  stage: ApplicationStage;
  notes: string | null;
  createdAt: string;
  employee: { id: string; name: string } | null;
  history: StageHistoryRow[];
  interviews: InterviewRow[];
  offer: OfferRow | null;
}

function stageVariant(stage: ApplicationStage) {
  if (stage === "hired") return "success";
  if (stage === "rejected") return "destructive";
  if (stage === "offer") return "info";
  if (stage === "interview") return "default";
  return "secondary";
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const { id } = await params;
  let application: ApplicationDetail;
  try {
    application = await apiGet<ApplicationDetail>(
      `/api/ats/applications/${id}`,
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/ats/applications"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Applications
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {application.name}
            </h1>
            <Badge variant={stageVariant(application.stage)}>
              {APPLICATION_STAGE_LABELS[application.stage] ?? application.stage}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Applied {formatDate(String(application.createdAt).slice(0, 10))}
            {application.jobTitle && (
              <>
                {" "}
                ·{" "}
                <Link
                  href={`/ats/jobs/${application.jobId}`}
                  className="text-primary hover:underline"
                >
                  {application.jobTitle}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {application.stage !== "hired" &&
            application.stage !== "rejected" && (
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline actions</CardTitle>
                  <CardDescription>
                    Move the candidate forward, schedule interviews or send an
                    offer.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApplicationActions
                    applicationId={application.id}
                    stage={application.stage}
                    employee={application.employee}
                  />
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Stage change history.</CardDescription>
            </CardHeader>
            <CardContent>
              {application.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Application received — no stage changes yet.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-4">
                  {application.history.map((row) => (
                    <li key={row.id} className="relative">
                      <span className="absolute left-[-21.5px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                      <p className="text-sm font-medium">
                        {row.fromStage} → {row.toStage}
                      </p>
                      {row.note && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {row.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.actorName ?? "System"} ·{" "}
                        {formatDateTime(row.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interviews</CardTitle>
              <CardDescription>Scheduled rounds and feedback.</CardDescription>
            </CardHeader>
            <CardContent>
              {application.interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No interviews scheduled yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {application.interviews.map((interview) => (
                    <div
                      key={interview.id}
                      className="rounded-lg border border-border bg-background/50 p-3.5 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="flex items-center gap-1.5 font-medium">
                          <CalendarClock className="size-4 text-primary" />
                          Round {interview.round}
                        </p>
                        <Badge
                          variant={
                            interview.status === "completed"
                              ? "success"
                              : interview.status === "cancelled"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {interview.status}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-muted-foreground">
                        {formatDateTime(interview.scheduledAt)}
                        {interview.interviewer && (
                          <> · {interview.interviewer}</>
                        )}
                      </p>
                      {interview.feedback && (
                        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                          “{interview.feedback}”
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {application.answers &&
            Object.keys(application.answers).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Screening answers</CardTitle>
                  <CardDescription>
                    Answers to the job&apos;s screening questions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {Object.entries(application.answers).map(
                    ([question, answer]) => (
                      <div
                        key={question}
                        className="rounded-lg border border-border bg-background/50 p-3"
                      >
                        <p className="font-medium">{question}</p>
                        <p className="mt-1 text-muted-foreground">{answer}</p>
                      </div>
                    ),
                  )}
                </CardContent>
              </Card>
            )}

          {application.quiz && application.quizResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Quiz result
                  <Badge
                    variant={
                      application.quizResult.score ===
                      application.quizResult.total
                        ? "success"
                        : application.quizResult.score > 0
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {application.quizResult.score}/
                    {application.quizResult.total}
                  </Badge>
                </CardTitle>
                <CardDescription>{application.quiz.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {application.quiz.questions.map((question, index) => {
                  const chosen = application.quizResult?.answers[index] ?? -1;
                  const correct = chosen === question.correctIndex;
                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-background/50 p-3"
                    >
                      <p className="flex items-start justify-between gap-2 font-medium">
                        <span>{question.question}</span>
                        {correct ? (
                          <CheckCircle2 className="size-4 shrink-0 text-success" />
                        ) : (
                          <XCircle className="size-4 shrink-0 text-destructive" />
                        )}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Candidate:{" "}
                        <span className={correct ? "" : "text-destructive"}>
                          {chosen >= 0 && chosen < question.options.length
                            ? question.options[chosen]
                            : "—"}
                        </span>
                        {!correct && (
                          <>
                            {" "}
                            · Correct:{" "}
                            <span className="text-success">
                              {question.options[question.correctIndex]}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={application.name} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{application.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {application.email}
                  </p>
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-3">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5" />
                  <a
                    href={`mailto:${application.email}`}
                    className="truncate hover:text-foreground"
                  >
                    {application.email}
                  </a>
                </p>
                {application.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {application.phone}
                  </p>
                )}
                {(application.country || application.state) && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {[application.state, application.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                {application.resumeUrl && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <FileCheck2 className="size-3.5" />
                    <a
                      href={application.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-primary hover:underline"
                    >
                      Resume
                    </a>
                  </p>
                )}
              </div>
              {application.coverLetter && (
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Cover letter
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {application.coverLetter}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {application.offer && (
            <Card>
              <CardHeader>
                <CardTitle>Offer</CardTitle>
                <CardDescription>
                  {formatDate(String(application.offer.createdAt).slice(0, 10))}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Salary</span>
                  <span className="font-medium">
                    {application.offer.salary != null
                      ? formatCurrency(application.offer.salary)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Start date</span>
                  <span className="font-medium">
                    {application.offer.startDate
                      ? formatDate(application.offer.startDate)
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      application.offer.status === "accepted"
                        ? "success"
                        : application.offer.status === "declined"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {application.offer.status}
                  </Badge>
                </div>
                {application.offer.terms && (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {application.offer.terms}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {application.employee && (
            <Card>
              <CardHeader>
                <CardTitle>Employee</CardTitle>
                <CardDescription>
                  Created from this application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <UserRound className="size-8 rounded-full bg-muted p-1.5" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {application.employee.name}
                    </p>
                    <Link
                      href={`/employees/${application.employee.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View employee profile
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Job</CardTitle>
            </CardHeader>
            <CardContent>
              {application.jobTitle ? (
                <Link
                  href={`/ats/jobs/${application.jobId}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <BriefcaseBusiness className="size-4" />
                  {application.jobTitle}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Job no longer exists.
                </p>
              )}
              <Link
                href={`/ats/jobs/${application.jobId}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3",
                })}
              >
                Open job posting
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
