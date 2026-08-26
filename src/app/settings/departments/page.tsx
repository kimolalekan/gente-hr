import { DepartmentsManager } from "@/components/hr/departments-manager";
import { PageHeader } from "@/components/hr/page-header";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.departments.title") };
}

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  employees: number;
}

export default async function DepartmentsPage() {
  const t = await getTranslator();
  const page = await apiGet<Paginated<DepartmentRow>>("/api/departments", {
    pageSize: 500,
  });

  return (
    <>
      <PageHeader
        title={t("settings.departments.title")}
        description={t("settings.departments.description")}
      />
      <DepartmentsManager departments={page.items} />
    </>
  );
}
