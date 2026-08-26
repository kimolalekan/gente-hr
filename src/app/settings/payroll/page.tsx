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
import { getTranslator } from "@/lib/server/i18n";
import type { PayrollBreakdown } from "@/lib/hr-data";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.payroll.title") };
}

export const dynamic = "force-dynamic";

export default async function PayrollSettingsPage() {
  const t = await getTranslator();
  const breakdown = await apiGet<PayrollBreakdown>("/api/settings/payroll");

  return (
    <>
      <PageHeader
        title={t("settings.payroll.title")}
        description={t("settings.payroll.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.payroll.payslipBreakdown")}</CardTitle>
          <CardDescription>
            {t("settings.payroll.payslipBreakdownDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollBreakdownForm initialBreakdown={breakdown} />
        </CardContent>
      </Card>
    </>
  );
}
