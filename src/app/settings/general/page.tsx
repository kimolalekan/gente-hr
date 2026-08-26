import {
  CompanyProfileForm,
  type CompanyProfile,
} from "@/components/settings/company-profile-form";
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
  return { title: t("settings.general.title") };
}

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const t = await getTranslator();
  const company = await apiGet<CompanyProfile>("/api/settings/company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.general.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.general.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.general.companyProfile")}</CardTitle>
          <CardDescription>
            {t("settings.general.companyProfileDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyProfileForm initial={company} />
        </CardContent>
      </Card>
    </div>
  );
}
