import { DepartmentsManager } from "@/components/hr/departments-manager";
import { PageHeader } from "@/components/hr/page-header";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "Departments" };

interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  employees: number;
}

export default async function DepartmentsPage() {
  const page = await apiGet<Paginated<DepartmentRow>>("/api/departments", {
    pageSize: 500,
  });

  return (
    <>
      <PageHeader
        title="Departments"
        description="Organizational units and their status."
      />
      <DepartmentsManager departments={page.items} />
    </>
  );
}
