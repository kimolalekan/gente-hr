import { PayrollBreakdownForm } from "@/components/settings/payroll-breakdown-form";
import { PageHeader } from "@/components/hr/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/server/api-client";
import type { PayrollBreakdown } from "@/lib/hr-data";

export const metadata = { title: "Payroll" };

export const dynamic = "force-dynamic";

export default async function PayrollSettingsPage() {
  const breakdown = await apiGet<PayrollBreakdown>("/api/settings/payroll");

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Configure how payslips are broken down into earnings and deductions."
      />
      <Card>
        <CardHeader>
          <CardTitle>Payslip breakdown</CardTitle>
          <CardDescription>
            Choose which components appear on payslips and how each one is
            labelled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollBreakdownForm initialBreakdown={breakdown} />
        </CardContent>
      </Card>
    </>
  );
}
