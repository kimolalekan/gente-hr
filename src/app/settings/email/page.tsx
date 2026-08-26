import {
  EmailConfigForm,
  type EmailSettings,
} from "@/components/settings/email-config-form";
import { PageHeader } from "@/components/hr/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.email.title") };
}

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage() {
  const t = await getTranslator();
  const [settings, user] = await Promise.all([
    apiGet<EmailSettings>("/api/settings/email"),
    getCurrentUser(),
  ]);

  return (
    <>
      <PageHeader
        title={t("settings.email.title")}
        description={t("settings.email.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.email.deliveryConfig")}</CardTitle>
          <CardDescription>
            {t("settings.email.deliveryConfigDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailConfigForm initial={settings} userEmail={user?.email ?? null} />
        </CardContent>
      </Card>
    </>
  );
}
