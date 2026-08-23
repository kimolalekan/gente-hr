import { redirect } from "next/navigation";
import { JobForm } from "@/components/ats/job-form";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "New job" };

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const departmentPage = await apiGet<Paginated<{ id: string; name: string }>>(
    "/api/departments",
    { pageSize: 500 },
  );

  return (
    <JobForm departments={departmentPage.items.map((item) => item.name)} />
  );
}
