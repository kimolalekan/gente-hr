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
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.employeeConfig.title") };
}

export const dynamic = "force-dynamic";

export default async function EmployeeConfigPage() {
  const t = await getTranslator();
  const config = await apiGet<
    Record<string, { enabled: boolean; required: Record<string, boolean> }>
  >("/api/settings/employee-config");

  return (
    <>
      <PageHeader
        title={t("settings.employeeConfig.title")}
        description={t("settings.employeeConfig.description")}
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.employeeConfig.profileFields")}</CardTitle>
          <CardDescription>
            {t("settings.employeeConfig.profileFieldsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeConfigForm initialConfig={config} />
        </CardContent>
      </Card>
    </>
  );
}
