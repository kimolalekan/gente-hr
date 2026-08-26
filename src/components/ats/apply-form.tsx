"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CheckCircle2, FileUp, Loader2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/i18n/provider";
import { COUNTRY_NAMES, REGIONS, getStatesFor } from "@/lib/regions";
import { cn } from "@/lib/utils";

interface ApplyQuiz {
  id: string;
  name: string;
  description: string | null;
  questions: Array<{ question: string; options: string[] }>;
}

interface ApplyFormProps {
  jobId: string;
  jobTitle: string;
  /** Screening questions defined on the job. */
  questions: string[];
  /** Optional screening quiz attached to the job. */
  quiz: ApplyQuiz | null;
}

const RESUME_ACCEPT =
  "application/pdf,.doc,.docx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

/** Public application form — details, screening questions and optional quiz. */
export function ApplyForm({
  jobId,
  jobTitle,
  questions,
  quiz,
}: ApplyFormProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState<"details" | "quiz" | "done">("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    state: "",
    coverLetter: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const update =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const updateAnswer = (question: string, value: string) =>
    setAnswers((current) => ({ ...current, [question]: value }));

  const setQuizAnswer = (index: number, optionIndex: number) =>
    setQuizAnswers((current) => {
      const next = [...current];
      next[index] = optionIndex;
      return next;
    });

  const handleContinue = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError(t("ats.apply.nameEmailRequired"));
      return;
    }
    setError(null);
    if (quiz && quiz.questions.length > 0) {
      setStep("quiz");
    } else {
      void submitApplication();
    }
  };

  const submitApplication = async () => {
    setSaving(true);
    setError(null);
    try {
      // Upload the resume first (if provided) so the application can store
      // its authenticated download URL.
      let resumeUrl: string | undefined;
      if (resumeFile) {
        const upload = new FormData();
        upload.append("jobId", jobId);
        upload.append("file", resumeFile);
        const uploadResponse = await fetch("/api/ats/applications/upload", {
          method: "POST",
          body: upload,
        });
        const uploadBody = await uploadResponse.json();
        if (!uploadBody?.ok) {
          throw new Error(uploadBody?.error ?? t("ats.apply.uploadFailed"));
        }
        resumeUrl = uploadBody.data.url;
      }

      const response = await fetch(`/api/ats/jobs/${jobId}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          country: form.country || undefined,
          state: form.state || undefined,
          resumeUrl,
          coverLetter: form.coverLetter.trim() || undefined,
          answers: Object.keys(answers).length > 0 ? answers : undefined,
          quizAnswers:
            quizAnswers.length > 0
              ? quizAnswers.map((value) =>
                  Number.isInteger(value) ? value : -1,
                )
              : undefined,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitQuiz = (event: FormEvent) => {
    event.preventDefault();
    void submitApplication();
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h2 className="text-xl font-bold">{t("ats.apply.received")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("ats.apply.successMessage", { jobTitle })}
        </p>
      </div>
    );
  }

  if (step === "quiz") {
    return (
      <form onSubmit={handleSubmitQuiz} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">{quiz?.name}</h2>
          {quiz?.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {quiz.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {t("ats.apply.quizHint")}
          </p>
        </div>

        {quiz?.questions.map((question, qIndex) => (
          <fieldset
            key={qIndex}
            className="space-y-2 rounded-lg border border-border bg-background/50 p-3"
          >
            <legend className="px-1 text-sm font-medium">
              {qIndex + 1}. {question.question}
            </legend>
            <div className="space-y-1.5">
              {question.options.map((option, oIndex) => (
                <label
                  key={oIndex}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    quizAnswers[qIndex] === oIndex
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name={`quiz-${qIndex}`}
                    checked={quizAnswers[qIndex] === oIndex}
                    onChange={() => setQuizAnswer(qIndex, oIndex)}
                    className="size-4 shrink-0 accent-[var(--primary)]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("details")}
            disabled={saving}
          >
            {t("common.back")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {saving ? t("common.submitting") : t("ats.apply.submit")}
          </Button>
        </div>
      </form>
    );
  }

  const states = getStatesFor(form.country);

  return (
    <form onSubmit={handleContinue} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="apply-name">{t("ats.apply.name")}</Label>
        <Input
          id="apply-name"
          value={form.name}
          onChange={update("name")}
          placeholder={t("ats.apply.namePlaceholder")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-email">{t("ats.apply.email")}</Label>
        <Input
          id="apply-email"
          type="email"
          value={form.email}
          onChange={update("email")}
          placeholder={t("ats.apply.emailPlaceholder")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-phone">{t("ats.apply.phone")}</Label>
        <Input
          id="apply-phone"
          type="tel"
          value={form.phone}
          onChange={update("phone")}
          placeholder={t("ats.apply.phonePlaceholder")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="apply-country">{t("ats.apply.country")}</Label>
          <Select
            id="apply-country"
            value={form.country}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                country: event.target.value,
                state: "",
              }))
            }
            placeholder={t("employees.selectCountry")}
            searchPlaceholder={t("employees.searchCountries")}
            renderOption={(option) => {
              const region = REGIONS.find((item) => item.name === option.value);
              return region ? <CountryFlag code={region.iso2} /> : null;
            }}
          >
            {COUNTRY_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apply-state">{t("ats.apply.stateProvince")}</Label>
          {states.length === 0 ? (
            <Input
              id="apply-state"
              value={form.state}
              onChange={update("state")}
              placeholder={
                form.country
                  ? t("employees.noStates")
                  : t("employees.selectCountryFirst")
              }
              disabled={!form.country}
            />
          ) : (
            <Select
              id="apply-state"
              value={form.state}
              onChange={update("state")}
              placeholder={t("employees.selectState")}
              searchPlaceholder={t("employees.searchStates")}
            >
              {states.map((state) => (
                <option key={state.stateCode} value={state.name}>
                  {state.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-resume">{t("ats.apply.resume")}</Label>
        {resumeFile ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FileUp className="size-4 shrink-0 text-primary" />
              <span className="truncate">{resumeFile.name}</span>
            </span>
            <button
              type="button"
              aria-label={t("ats.apply.removeResume")}
              onClick={() => setResumeFile(null)}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <Input
            id="apply-resume"
            type="file"
            accept={RESUME_ACCEPT}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setResumeFile(event.target.files?.[0] ?? null)
            }
          />
        )}
        <p className="text-xs text-muted-foreground">
          {t("ats.apply.resumeHint")}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apply-cover">{t("ats.applications.coverLetter")}</Label>
        <Textarea
          id="apply-cover"
          rows={5}
          value={form.coverLetter}
          onChange={update("coverLetter")}
          placeholder={t("ats.apply.coverLetterPlaceholder")}
        />
      </div>

      {questions.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border bg-background/50 p-3">
          <p className="text-sm font-medium">
            {t("ats.apply.screeningQuestions")}
          </p>
          {questions.map((question, index) => (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`apply-question-${index}`}>{question}</Label>
              <Input
                id={`apply-question-${index}`}
                value={answers[question] ?? ""}
                onChange={(event) => updateAnswer(question, event.target.value)}
                placeholder={t("ats.apply.answerPlaceholder")}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {saving
          ? t("common.submitting")
          : quiz && quiz.questions.length > 0
            ? t("ats.apply.continueToQuiz")
            : t("ats.apply.submit")}
      </Button>
    </form>
  );
}
