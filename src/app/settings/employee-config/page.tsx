import { EmployeeConfigForm } from "@/components/settings/employee-config-form";
import { PageHeader } from "@/components/hr/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Employee config" };

export default function EmployeeConfigPage() {
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
            Bank, identification, emergency contact, tax and insurance details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeConfigForm />
        </CardContent>
      </Card>
    </>
  );
}
