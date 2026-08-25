import { redirect } from "next/navigation";
import { QuizzesManager } from "@/components/ats/quiz-manager";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";

export const metadata = { title: "Quizzes" };

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
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const quizzes = await apiGet<QuizRow[]>("/api/ats/quizzes");

  return (
    <>
      <PageHeader
        title="Quizzes"
        description="Screening assessments you can attach to jobs."
      />
      <QuizzesManager quizzes={quizzes} />
    </>
  );
}
