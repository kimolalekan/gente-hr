import { notFound, redirect } from "next/navigation";
import {
  EmployeeEditForm,
  type EditableEmployee,
} from "@/components/hr/employee-edit-form";
import {
  ApiClientError,
  apiGet,
  type Paginated,
} from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import type { Employee, PayrollBreakdown } from "@/lib/hr-data";

export const metadata = { title: "Edit employee" };

export const dynamic = "force-dynamic";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Editing is an admin/HR action — employees manage their own record
  // through their profile instead.
  const user = await getCurrentUser();
  if (!user || user.role === "member") redirect("/");

  let employee: EditableEmployee;
  try {
    employee = await apiGet<EditableEmployee>(`/api/employees/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  // Manager + department options for the employment section, plus the
  // configured payslip breakdown to drive the salary inputs.
  const [managerPage, departmentPage, payrollBreakdown] = await Promise.all([
    apiGet<Paginated<Employee>>("/api/employees", { pageSize: 500 }),
    apiGet<Paginated<{ id: string; name: string }>>("/api/departments", {
      pageSize: 500,
    }),
    apiGet<PayrollBreakdown>("/api/settings/payroll"),
  ]);

  return (
    <EmployeeEditForm
      employee={employee}
      managerOptions={managerPage.items}
      departments={departmentPage.items.map((item) => item.name)}
      payrollBreakdown={payrollBreakdown}
    />
  );
}
