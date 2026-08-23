import {
  OffboardingManager,
  type OffboardingRow,
} from "@/components/hr/offboarding-manager";
import { PageHeader } from "@/components/hr/page-header";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import type { Employee } from "@/lib/hr-data";

export const metadata = { title: "Offboarding" };

export default async function OffboardingPage() {
  // Employees don't manage offboarding — it's an HR/admin workspace.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const [offboardings, employeePage] = await Promise.all([
    apiGet<OffboardingRow[]>("/api/offboarding"),
    apiGet<Paginated<Employee>>("/api/employees", { pageSize: 500 }),
  ]);

  return (
    <>
      <PageHeader
        title="Offboarding"
        description="Exit processes, checklists and final settlements."
      />
      <OffboardingManager
        offboardings={offboardings}
        employees={employeePage.items}
      />
    </>
  );
}
