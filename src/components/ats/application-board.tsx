"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STAGES,
  APPLICATION_STAGE_LABELS,
  formatDate,
  type Application,
  type ApplicationStage,
  type JobStatus,
} from "@/lib/hr-data";

interface BoardJob {
  id: string;
  title: string;
  status: JobStatus;
}

const STAGE_TONE: Record<ApplicationStage, string> = {
  new: "bg-muted text-foreground",
  screening: "bg-info/15 text-info",
  interview: "bg-primary/10 text-primary",
  offer: "bg-warning/15 text-warning",
  hired: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

/** Kanban pipeline: New → Screening → Interview → Offer → Hired / Rejected. */
export function ApplicationBoard({
  applications,
  jobs,
}: {
  applications: Application[];
  jobs: BoardJob[];
}) {
  const router = useRouter();
  const [jobFilter, setJobFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const visible = applications.filter(
    (application) => !jobFilter || application.jobId === jobFilter,
  );

  const counts = new Map<string, number>();
  for (const application of visible) {
    counts.set(application.stage, (counts.get(application.stage) ?? 0) + 1);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={jobFilter}
            onChange={(event) => setJobFilter(event.target.value)}
            placeholder="All jobs"
            aria-label="Filter by job"
            className="w-56"
          >
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </Select>
          <Badge variant="secondary">
            {visible.length} candidate{visible.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus />
          Add candidate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {APPLICATION_STAGES.map((stage) => {
          const cards = visible.filter(
            (application) => application.stage === stage,
          );
          return (
            <div
              key={stage}
              className="flex flex-col rounded-xl border border-border bg-card/50"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    STAGE_TONE[stage],
                  )}
                >
                  {APPLICATION_STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cards.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {cards.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No candidates
                  </p>
                )}
                {cards.map((application) => (
                  <Link
                    key={application.id}
                    href={`/ats/applications/${application.id}`}
                    className="rounded-lg border border-border bg-background p-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={application.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {application.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {application.jobTitle}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Applied{" "}
                      {formatDate(
                        String(application.createdAt).slice(0, 10),
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddCandidateModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        jobs={jobs}
        onCreated={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function AddCandidateModal({
  open,
  onClose,
  jobs,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  jobs: BoardJob[];
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    jobId: "",
    name: "",
    email: "",
    phone: "",
    resumeUrl: "",
    coverLetter: "",
  });

  const update =
    (key: keyof typeof form) =>
    (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.jobId || !form.name.trim() || !form.email.trim()) {
      setError("Job, candidate name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/ats/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: form.jobId,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          resumeUrl: form.resumeUrl.trim() || undefined,
          coverLetter: form.coverLetter.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setForm({
        jobId: "",
        name: "",
        email: "",
        phone: "",
        resumeUrl: "",
        coverLetter: "",
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add candidate.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add candidate"
      description="Manually add a candidate application."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-candidate-form" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add candidate
          </Button>
        </>
      }
    >
      <form
        id="add-candidate-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="candidate-job">Job</Label>
          <Select
            id="candidate-job"
            value={form.jobId}
            onChange={update("jobId")}
            placeholder="Select a job…"
            searchPlaceholder="Search jobs…"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="candidate-name">Full name</Label>
          <Input
            id="candidate-name"
            value={form.name}
            onChange={update("name")}
            placeholder="e.g. Ada Lovelace"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="candidate-email">Email</Label>
          <Input
            id="candidate-email"
            type="email"
            value={form.email}
            onChange={update("email")}
            placeholder="ada@example.com"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="candidate-phone">Phone</Label>
          <Input
            id="candidate-phone"
            type="tel"
            value={form.phone}
            onChange={update("phone")}
            placeholder="+234 800 000 0000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="candidate-resume">Resume link</Label>
          <Input
            id="candidate-resume"
            type="url"
            value={form.resumeUrl}
            onChange={update("resumeUrl")}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="candidate-cover">Cover letter</Label>
          <Textarea
            id="candidate-cover"
            rows={4}
            value={form.coverLetter}
            onChange={update("coverLetter")}
            placeholder="Why they're a great fit…"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
