"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  status: JobStatus;
}

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

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
}: {
  initial?: JobFormValues;
  departments: string[];
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
    status: initial?.status ?? ("draft" as JobStatus),
  }));

  const update =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

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
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-description">Description</Label>
          <Textarea
            id="job-description"
            rows={6}
            value={form.description}
            onChange={update("description")}
            placeholder="Role overview, responsibilities, requirements…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
