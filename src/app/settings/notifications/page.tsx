import { NotificationPreferences } from "@/components/settings/notification-preferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.notificationPrefs.title") };
}

export default async function NotificationsSettingsPage() {
  const t = await getTranslator();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.notificationPrefs.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.notificationPrefs.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.notificationPrefs.cardTitle")}</CardTitle>
          <CardDescription>
            {t("settings.notificationPrefs.deliveryHint")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferences />
        </CardContent>
      </Card>
    </div>
  );
}
