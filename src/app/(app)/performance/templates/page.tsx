import { redirect } from "next/navigation";
import { PerformanceTemplatesManager } from "@/components/hr/performance-templates-manager";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("performance.templatesTitle") };
}

/** Template row from `GET /api/performance/templates`. */
interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  sections: Array<{ name: string; questions: string[] }>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default async function PerformanceTemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "member") redirect("/performance");

  const t = await getTranslator();
  const templates = await apiGet<TemplateRow[]>("/api/performance/templates");

  return (
    <>
      <PageHeader
        title={t("performance.templatesTitle")}
        description={t("performance.templatesDescription")}
      />
      <PerformanceTemplatesManager templates={templates} />
    </>
  );
}
