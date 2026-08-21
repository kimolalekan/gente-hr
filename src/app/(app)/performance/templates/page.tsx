import { redirect } from "next/navigation";
import { PerformanceTemplatesManager } from "@/components/hr/performance-templates-manager";
import { PageHeader } from "@/components/hr/page-header";
import { getCurrentUser } from "@/lib/server/auth";
import { PERFORMANCE_TEMPLATES } from "@/lib/hr-data";

export const metadata = { title: "Performance templates" };

export default async function PerformanceTemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "member") redirect("/performance");

  return (
    <>
      <PageHeader
        title="Performance templates"
        description="Review templates — sections and questions. HR and Admin only."
      />
      <PerformanceTemplatesManager templates={PERFORMANCE_TEMPLATES} />
    </>
  );
}
