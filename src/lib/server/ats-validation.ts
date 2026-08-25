import "server-only";
import { ApiError, asString } from "@/lib/server/api";
import type { QuizQuestion } from "@/lib/hr-data";

/**
 * Validate a quiz's questions: 1+ questions, each with a prompt and 2–4
 * options; the correct answer must be a valid option index.
 */
export function parseQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) throw new ApiError(400, "questions must be an array");
  if (raw.length === 0) throw new ApiError(400, "Add at least one question");
  const questions: QuizQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ApiError(400, "Invalid question");
    }
    const record = item as Record<string, unknown>;
    const question = asString(record.question).trim();
    if (!question) throw new ApiError(400, "Every question needs a prompt");
    const options = Array.isArray(record.options)
      ? record.options
          .map((option) => asString(option).trim())
          .filter((option) => option.length > 0)
      : [];
    if (options.length < 2 || options.length > 4) {
      throw new ApiError(400, "Each question needs 2–4 options");
    }
    const correctIndex = Number(record.correctIndex);
    if (
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      throw new ApiError(400, "Each question needs a valid correct answer");
    }
    questions.push({ question, options, correctIndex });
  }
  return questions;
}

/** Strip correct answers from a quiz before serving it to candidates. */
export function quizForCandidate(
  quiz: { id: string; name: string; description: string | null; questions: QuizQuestion[] },
) {
  return {
    id: quiz.id,
    name: quiz.name,
    description: quiz.description,
    questions: quiz.questions.map(({ question, options }) => ({
      question,
      options,
    })),
  };
}
