"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { QuizForm, type QuizValues } from "@/components/ats/quiz-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

interface QuizRow {
  id: string;
  name: string;
  description: string | null;
  questions: { question: string; options: string[]; correctIndex: number }[];
  active: boolean;
  usedBy: number;
}

/** Screening quiz library — list, create, edit and delete (admin, hr). */
export function QuizzesManager({ quizzes }: { quizzes: QuizRow[] }) {
  const router = useRouter();
  const { t } = useTranslations();
  const [editing, setEditing] = useState<QuizValues | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (quiz: QuizRow) => {
    if (!window.confirm(t("ats.quizzes.deleteConfirm", { name: quiz.name })))
      return;
    setDeletingId(quiz.id);
    try {
      await fetch(`/api/ats/quizzes/${quiz.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>{t("ats.quizzes.libraryTitle")}</CardTitle>
          <CardDescription>
            {t("ats.quizzes.libraryDescription")}
          </CardDescription>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {t("ats.quizzes.newQuiz")}
        </Button>
      </CardHeader>
      <CardContent>
        {quizzes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ListChecks className="size-8 text-muted-foreground" />
            <p className="font-medium">{t("ats.quizzes.empty")}</p>
            <p className="text-sm text-muted-foreground">
              {t("ats.quizzes.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background/50 p-3.5"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {quiz.name}
                    {!quiz.active && (
                      <Badge variant="secondary">
                        {t(`statusLabels.quiz.inactive` as TranslationKey)}
                      </Badge>
                    )}
                  </p>
                  {quiz.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {quiz.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("ats.quizzes.meta", {
                      questions: quiz.questions.length,
                      s: quiz.questions.length === 1 ? "" : "s",
                      jobs: quiz.usedBy,
                      s2: quiz.usedBy === 1 ? "" : "s",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("ats.quizzes.editQuiz")}
                    onClick={() =>
                      setEditing({
                        id: quiz.id,
                        name: quiz.name,
                        description: quiz.description ?? "",
                        questions: quiz.questions,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("ats.quizzes.deleteConfirm", {
                      name: quiz.name,
                    })}
                    disabled={deletingId === quiz.id}
                    onClick={() => remove(quiz)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {creating && (
        <QuizForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <QuizForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
