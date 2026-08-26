import { OnboardingManager } from "@/components/hr/onboarding-manager";
import { PageHeader } from "@/components/hr/page-header";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import type {
  Employee,
  OnboardingPlan,
  OnboardingTask,
  TaskStatus,
} from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("onboarding.title") };
}

interface OnboardingPlanRow {
  id: string;
  employeeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  country: string | null;
  signedOfferLetter: string | null;
  startDate: string;
  targetDate: string;
  status: string;
  createdAt: string;
}

interface OnboardingDetailRow extends OnboardingPlanRow {
  tasks: Array<{
    id: string;
    name: string;
    department: string;
    status: TaskStatus;
    dueDate: string | null;
    sortOrder: number;
  }>;
}

function mapPlan(
  row: OnboardingPlanRow,
  tasks: OnboardingDetailRow["tasks"],
): OnboardingPlan {
  return {
    id: row.id,
    employeeId: row.employeeId ?? "",
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? "",
    address: row.address ?? "",
    state: row.state ?? "",
    country: row.country ?? "",
    signedOfferLetter: row.signedOfferLetter ?? undefined,
    startDate: row.startDate,
    targetDate: row.targetDate,
    status: row.status as OnboardingPlan["status"],
    tasks: tasks.map((task): OnboardingTask => ({
      id: task.id,
      name: task.name,
      department: task.department as OnboardingTask["department"],
      status: task.status,
      due: task.dueDate ?? row.targetDate,
    })),
  };
}

export default async function OnboardingPage() {
  const t = await getTranslator();
  // Employees don't manage onboarding — it's an HR/admin workspace.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const [plansPage, employeesPage] = await Promise.all([
    apiGet<Paginated<OnboardingPlanRow>>("/api/onboarding", { pageSize: 500 }),
    apiGet<Paginated<Employee>>("/api/employees", { pageSize: 500 }),
  ]);

  // The list endpoint only carries task counts — fetch each plan's tasks.
  const details = await Promise.all(
    plansPage.items.map((plan) =>
      apiGet<OnboardingDetailRow>(`/api/onboarding/${plan.id}`).catch(
        () => null,
      ),
    ),
  );

  const plans = plansPage.items.map((plan, index) =>
    mapPlan(plan, details[index]?.tasks ?? []),
  );

  return (
    <>
      <PageHeader
        title={t("onboarding.title")}
        description={t("onboarding.description")}
      />
      <OnboardingManager plans={plans} employees={employeesPage.items} />
    </>
  );
}
