"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/i18n/provider";
import type { QuizQuestion } from "@/lib/hr-data";

export interface QuizValues {
  id?: string;
  name: string;
  description: string;
  questions: QuizQuestion[];
}

function emptyQuestion(): QuizQuestion {
  return { question: "", options: ["", "", "", ""], correctIndex: 0 };
}

/**
 * Create/edit a screening quiz — name, description and multiple-choice
 * questions with a marked correct answer. Saved via POST/PATCH
 * `/api/ats/quizzes`.
 */
export function QuizForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: QuizValues;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  const { t } = useTranslations();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<QuizValues>(() => ({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    questions: initial?.questions.length
      ? initial.questions.map((q) => ({
          question: q.question,
          options: [...q.options],
          correctIndex: q.correctIndex,
        }))
      : [emptyQuestion()],
  }));

  const updateName = (value: string) =>
    setForm((current) => ({ ...current, name: value }));
  const updateDescription = (value: string) =>
    setForm((current) => ({ ...current, description: value }));

  const updateQuestion = (index: number, value: string) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q, i) =>
        i === index ? { ...q, question: value } : q,
      ),
    }));

  const updateOption = (qIndex: number, oIndex: number, value: string) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.map((option, oi) =>
                oi === oIndex ? value : option,
              ),
            }
          : q,
      ),
    }));

  const setCorrect = (qIndex: number, oIndex: number) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.map((q, i) =>
        i === qIndex ? { ...q, correctIndex: oIndex } : q,
      ),
    }));

  const addQuestion = () =>
    setForm((current) => ({
      ...current,
      questions: [...current.questions, emptyQuestion()],
    }));

  const removeQuestion = (index: number) =>
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("ats.quizzes.nameRequired"));
      return;
    }
    const questions = form.questions
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((option) => option.trim()),
        correctIndex: q.correctIndex,
      }))
      .filter((q) => q.question && q.options.some((option) => option));
    if (questions.length === 0) {
      setError(t("ats.quizzes.questionsRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        initial?.id ? `/api/ats/quizzes/${initial.id}` : "/api/ats/quizzes",
        {
          method: initial?.id ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            questions,
          }),
        },
      );
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      onSaved?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("ats.quizzes.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose ?? (() => {})}
      title={initial?.id ? t("ats.quizzes.editQuiz") : t("ats.quizzes.newQuiz")}
      description={t("ats.quizzes.formDescription")}
      footer={
        <>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" form="quiz-form" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <form id="quiz-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="quiz-name">{t("ats.quizzes.quizName")}</Label>
          <Input
            id="quiz-name"
            value={form.name}
            onChange={(event) => updateName(event.target.value)}
            placeholder={t("ats.quizzes.namePlaceholder")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quiz-description">{t("common.description")}</Label>
          <Textarea
            id="quiz-description"
            rows={2}
            value={form.description}
            onChange={(event) => updateDescription(event.target.value)}
            placeholder={t("ats.quizzes.descriptionPlaceholder")}
          />
        </div>

        <div className="space-y-3">
          {form.questions.map((question, qIndex) => (
            <div
              key={qIndex}
              className="space-y-2 rounded-lg border border-border bg-background/50 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`quiz-q-${qIndex}`}>
                    {t("ats.quizzes.question")} {qIndex + 1}
                  </Label>
                  <Input
                    id={`quiz-q-${qIndex}`}
                    value={question.question}
                    onChange={(event) =>
                      updateQuestion(qIndex, event.target.value)
                    }
                    placeholder={t("ats.quizzes.questionPlaceholder")}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("ats.jobs.removeQuestion", {
                    n: qIndex + 1,
                  })}
                  onClick={() => removeQuestion(qIndex)}
                  disabled={form.questions.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {question.options.map((option, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`quiz-correct-${qIndex}`}
                      checked={question.correctIndex === oIndex}
                      onChange={() => setCorrect(qIndex, oIndex)}
                      aria-label={t("ats.quizzes.markCorrect", {
                        n: oIndex + 1,
                      })}
                      className="size-4 shrink-0 accent-[var(--primary)]"
                    />
                    <Input
                      value={option}
                      onChange={(event) =>
                        updateOption(qIndex, oIndex, event.target.value)
                      }
                      placeholder={t("ats.quizzes.optionPlaceholder", {
                        n: oIndex + 1,
                      })}
                      aria-label={t("ats.quizzes.optionAria", {
                        q: qIndex + 1,
                        o: oIndex + 1,
                      })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("ats.quizzes.correctHint")}
              </p>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addQuestion}>
            <Plus />
            {t("ats.jobs.addQuestion")}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Modal>
  );
}
