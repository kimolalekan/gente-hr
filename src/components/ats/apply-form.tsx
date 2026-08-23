"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ApplyFormProps {
  jobId: string;
  jobTitle: string;
}

/** Public application form — submits to `/api/ats/jobs/[id]/apply`. */
export function ApplyForm({ jobId, jobTitle }: ApplyFormProps) {
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
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
    if (!form.name.trim() || !form.email.trim()) {
      setError("Your name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/ats/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h2 className="text-xl font-bold">Application received</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thanks for applying to {jobTitle}. We&apos;ll review your application
          and be in touch if there&apos;s a match.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="apply-name">Full name</Label>
        <Input
          id="apply-name"
          value={form.name}
          onChange={update("name")}
          placeholder="Your full name"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-email">Email</Label>
        <Input
          id="apply-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-phone">Phone</Label>
        <Input
          id="apply-phone"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
          placeholder="+234 800 000 0000"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-resume">Resume link</Label>
        <Input
          id="apply-resume"
          type="url"
          value={form.resumeUrl}
          onChange={update("resumeUrl")}
          placeholder="https://… (link to your CV)"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-cover">Cover letter</Label>
        <Textarea
          id="apply-cover"
          rows={5}
          value={form.coverLetter}
          onChange={update("coverLetter")}
          placeholder="Tell us why you're a great fit…"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {saving ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
