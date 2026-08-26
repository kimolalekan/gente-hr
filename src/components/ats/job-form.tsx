"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select } from "@/components/ui/select";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { EMPLOYMENT_TYPE_LABELS, type JobStatus } from "@/lib/hr-data";

export interface JobFormValues {
  id?: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  description: string;
  questions: string[];
  quizId: string;
  status: JobStatus;
}

const STATUS_OPTIONS: JobStatus[] = ["draft", "open", "closed"];

interface QuizOption {
  id: string;
  name: string;
}

function Field({
  id,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
    </div>
  );
}

/** Create/edit a job posting — POST or PATCH `/api/ats/jobs`. */
export function JobForm({
  initial,
  departments,
  quizzes,
}: {
  initial?: JobFormValues;
  departments: string[];
  /** Screening quizzes available to attach to the job. */
  quizzes: QuizOption[];
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? "",
    department: initial?.department ?? "",
    location: initial?.location ?? "",
    employmentType: initial?.employmentType ?? "full_time",
    salaryMin: initial?.salaryMin ?? "",
    salaryMax: initial?.salaryMax ?? "",
    description: initial?.description ?? "",
    questions: initial?.questions ?? [],
    quizId: initial?.quizId ?? "",
    status: initial?.status ?? ("draft" as JobStatus),
  }));

  const update =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const updateQuestion = (index: number, value: string) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q, i) => (i === index ? value : q)),
    }));

  const addQuestion = () =>
    setForm((current) => ({
      ...current,
      questions: [...current.questions, ""],
    }));

  const removeQuestion = (index: number) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError(t("ats.jobs.titleRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        initial?.id ? `/api/ats/jobs/${initial.id}` : "/api/ats/jobs",
        {
          method: initial?.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            department: form.department.trim() || undefined,
            location: form.location.trim() || undefined,
            employmentType: form.employmentType,
            salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
            salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
            description: form.description.trim() || undefined,
            questions: form.questions
              .map((question) => question.trim())
              .filter((question) => question.length > 0),
            quizId: form.quizId || undefined,
            status: form.status,
          }),
        },
      );
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      router.push(initial?.id ? `/ats/jobs/${initial.id}` : "/ats/jobs");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ats.jobs.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={initial?.id ? `/ats/jobs/${initial.id}` : "/ats/jobs"}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {initial?.id ? t("ats.jobs.backToJob") : t("ats.jobs.title")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {initial?.id ? t("ats.jobs.editJob") : t("ats.jobs.newJob")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initial?.id
              ? t("ats.jobs.editDescription")
              : t("ats.jobs.newDescription")}
          </p>
        </div>
        <Button type="submit" form="job-form" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      <form
        id="job-form"
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-border bg-card p-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="job-title"
            label={t("ats.jobs.jobTitle")}
            value={form.title}
            onChange={update("title")}
            placeholder={t("ats.jobs.titlePlaceholder")}
            required
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-department">{t("ats.jobs.department")}</Label>
            <Select
              id="job-department"
              value={form.department}
              onChange={update("department")}
              placeholder={t("employees.selectDepartment")}
              searchPlaceholder={t("ats.jobs.searchDepartments")}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </Select>
          </div>
          <Field
            id="job-location"
            label={t("ats.jobs.location")}
            value={form.location}
            onChange={update("location")}
            placeholder={t("ats.jobs.locationPlaceholder")}
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-type">{t("ats.jobs.employmentType")}</Label>
            <Select
              id="job-type"
              value={form.employmentType}
              onChange={update("employmentType")}
            >
              {Object.keys(EMPLOYMENT_TYPE_LABELS).map((value) => (
                <option key={value} value={value}>
                  {t(`statusLabels.employmentType.${value}` as TranslationKey)}
                </option>
              ))}
            </Select>
          </div>
          <Field
            id="job-salary-min"
            label={t("ats.jobs.salaryMin")}
            type="number"
            min={0}
            value={form.salaryMin}
            onChange={update("salaryMin")}
            placeholder={t("ats.jobs.salaryMinPlaceholder")}
          />
          <Field
            id="job-salary-max"
            label={t("ats.jobs.salaryMax")}
            type="number"
            min={0}
            value={form.salaryMax}
            onChange={update("salaryMax")}
            placeholder={t("ats.jobs.salaryMaxPlaceholder")}
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-status">{t("common.status")}</Label>
            <Select
              id="job-status"
              value={form.status}
              onChange={update("status")}
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(`statusLabels.job.${value}` as TranslationKey)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-quiz">{t("ats.jobs.quiz")}</Label>
            <Select
              id="job-quiz"
              value={form.quizId}
              onChange={update("quizId")}
              placeholder={t("ats.jobs.noQuiz")}
            >
              <option value="">{t("ats.jobs.noQuiz")}</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("ats.jobs.quizHint")}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-description">{t("common.description")}</Label>
          <RichTextEditor
            id="job-description"
            value={form.description}
            onChange={(html) =>
              setForm((current) => ({ ...current, description: html }))
            }
            placeholder={t("ats.jobs.descriptionPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("ats.jobs.questions")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("ats.jobs.questionsHint")}
          </p>
          {form.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("ats.jobs.noQuestions")}
            </p>
          ) : (
            form.questions.map((question, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`job-question-${index}`} className="sr-only">
                    {t("ats.quizzes.question")} {index + 1}
                  </Label>
                  <Input
                    id={`job-question-${index}`}
                    value={question}
                    onChange={(event) =>
                      updateQuestion(index, event.target.value)
                    }
                    placeholder={t("ats.jobs.questionPlaceholder", {
                      n: index + 1,
                    })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("ats.jobs.removeQuestion", {
                    n: index + 1,
                  })}
                  onClick={() => removeQuestion(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
          >
            <Plus />
            {t("ats.jobs.addQuestion")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
