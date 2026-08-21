import { DepartmentsManager } from "@/components/hr/departments-manager";
import { PageHeader } from "@/components/hr/page-header";
import { DEPARTMENTS_DATA, EMPLOYEES } from "@/lib/hr-data";

export const metadata = { title: "Departments" };

export default function DepartmentsPage() {
  return (
    <>
      <PageHeader
        title="Departments"
        description="Organizational units and their status."
      />
      <DepartmentsManager departments={DEPARTMENTS_DATA} employees={EMPLOYEES} />
    </>
  );
}
