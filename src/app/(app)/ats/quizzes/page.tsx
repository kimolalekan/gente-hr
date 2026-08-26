import { redirect } from "next/navigation";
import { QuizzesManager } from "@/components/ats/quiz-manager";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import { apiGet } from "@/lib/server/api-client";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("ats.quizzes.title") };
}

export const dynamic = "force-dynamic";

interface QuizRow {
  id: string;
  name: string;
  description: string | null;
  questions: { question: string; options: string[]; correctIndex: number }[];
  active: boolean;
  usedBy: number;
}

export default async function QuizzesPage() {
  const t = await getTranslator();
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const quizzes = await apiGet<QuizRow[]>("/api/ats/quizzes");

  return (
    <>
      <PageHeader
        title={t("ats.quizzes.title")}
        description={t("ats.quizzes.description")}
      />
      <QuizzesManager quizzes={quizzes} />
    </>
  );
}
