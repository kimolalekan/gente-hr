import { EmployeeConfigForm } from "@/components/settings/employee-config-form";
import { PageHeader } from "@/components/hr/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/server/api-client";

export const metadata = { title: "Employee config" };

export const dynamic = "force-dynamic";

export default async function EmployeeConfigPage() {
  const config = await apiGet<
    Record<string, { enabled: boolean; required: Record<string, boolean> }>
  >("/api/settings/employee-config");

  return (
    <>
      <PageHeader
        title="Employee config"
        description="Custom fields collected when creating a new employee."
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile fields</CardTitle>
          <CardDescription>
            Bank, identification, emergency contact, tax ID, health coverage and
            pension details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeConfigForm initialConfig={config} />
        </CardContent>
      </Card>
    </>
  );
}
