import { redirect } from "next/navigation";
import { ProcurementForm } from "@/components/procurement/procurement-form";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("procurement.newRequestTitle") };
}

interface EmployeeOption {
  id: string;
  name: string;
}

/** Row shape of `GET /api/employees/me` and the employees list. */
interface ApiEmployeeRow extends EmployeeOption {
  email: string;
}

interface MeResponse extends ApiEmployeeRow {
  employeeId: string;
}

/**
 * New-procurement page. Members request for themselves (their linked employee
 * record); admin/HR pick the requesting employee from the directory.
 */
export default async function NewProcurementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const me = await apiGet<MeResponse>("/api/employees/me").catch(() => null);

  // Members must have an employee profile to raise a request.
  if (user.role === "member") {
    if (!me) redirect("/procurements");
    return (
      <ProcurementForm
        canChooseRequester={false}
        requesterId={me.id}
        requesterName={me.name}
        employees={[]}
      />
    );
  }

  const directory = await apiGet<Paginated<ApiEmployeeRow>>("/api/employees", {
    pageSize: 500,
    status: "active",
  }).catch(() => null);
  const employees: EmployeeOption[] = (directory?.items ?? []).map(
    ({ id, name }) => ({ id, name }),
  );

  return (
    <ProcurementForm
      canChooseRequester
      requesterId={me?.id ?? null}
      requesterName={me?.name ?? null}
      employees={employees}
    />
  );
}
