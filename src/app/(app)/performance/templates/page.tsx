import { redirect } from "next/navigation";
import { PerformanceTemplatesManager } from "@/components/hr/performance-templates-manager";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";

export const metadata = { title: "Performance templates" };

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

  const templates = await apiGet<TemplateRow[]>("/api/performance/templates");

  return (
    <>
      <PageHeader
        title="Performance templates"
        description="Review templates — sections and questions. HR and Admin only."
      />
      <PerformanceTemplatesManager templates={templates} />
    </>
  );
}
