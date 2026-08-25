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

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

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
      setError("Job title is required.");
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
      setError(err instanceof Error ? err.message : "Failed to save job.");
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
            {initial?.id ? "Back to job" : "Jobs"}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {initial?.id ? "Edit job" : "New job"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initial?.id
              ? "Update the job posting details."
              : "Create a job posting to start collecting applications."}
          </p>
        </div>
        <Button type="submit" form="job-form" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving…" : "Save job"}
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
            label="Job title"
            value={form.title}
            onChange={update("title")}
            placeholder="e.g. Senior Product Designer"
            required
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-department">Department</Label>
            <Select
              id="job-department"
              value={form.department}
              onChange={update("department")}
              placeholder="Select a department…"
              searchPlaceholder="Search departments…"
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
            label="Location"
            value={form.location}
            onChange={update("location")}
            placeholder="e.g. Lagos, Nigeria"
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-type">Employment type</Label>
            <Select
              id="job-type"
              value={form.employmentType}
              onChange={update("employmentType")}
            >
              {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <Field
            id="job-salary-min"
            label="Salary range — minimum"
            type="number"
            min={0}
            value={form.salaryMin}
            onChange={update("salaryMin")}
            placeholder="e.g. 60000"
          />
          <Field
            id="job-salary-max"
            label="Salary range — maximum"
            type="number"
            min={0}
            value={form.salaryMax}
            onChange={update("salaryMax")}
            placeholder="e.g. 90000"
          />
          <div className="space-y-1.5">
            <Label htmlFor="job-status">Status</Label>
            <Select
              id="job-status"
              value={form.status}
              onChange={update("status")}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-quiz">Screening quiz</Label>
            <Select
              id="job-quiz"
              value={form.quizId}
              onChange={update("quizId")}
              placeholder="No quiz"
            >
              <option value="">No quiz</option>
              {quizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id}>
                  {quiz.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Candidates take this assessment when applying.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-description">Description</Label>
          <RichTextEditor
            id="job-description"
            value={form.description}
            onChange={(html) =>
              setForm((current) => ({ ...current, description: html }))
            }
            placeholder="Role overview, responsibilities, requirements…"
          />
        </div>

        <div className="space-y-2">
          <Label>Screening questions</Label>
          <p className="text-xs text-muted-foreground">
            Custom questions candidates answer in the application form.
          </p>
          {form.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions yet — add one below.
            </p>
          ) : (
            form.questions.map((question, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`job-question-${index}`} className="sr-only">
                    Question {index + 1}
                  </Label>
                  <Input
                    id={`job-question-${index}`}
                    value={question}
                    onChange={(event) =>
                      updateQuestion(index, event.target.value)
                    }
                    placeholder={`Question ${index + 1} — e.g. How many years of experience do you have?`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove question ${index + 1}`}
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
            Add question
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
