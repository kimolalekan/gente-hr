import { NotificationCenter } from "@/components/hr/notification-center";
import { PageHeader } from "@/components/hr/page-header";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("notifications.title") };
}

export default async function NotificationsPage() {
  const t = await getTranslator();
  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
      />
      <NotificationCenter />
    </>
  );
}
