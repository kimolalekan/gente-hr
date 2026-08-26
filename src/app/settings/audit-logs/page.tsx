import {
  AuditLogTable,
  type AuditLogItem,
} from "@/components/settings/audit-log-table";
import { PageHeader } from "@/components/hr/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.auditLogs.title") };
}

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const t = await getTranslator();
  const data = await apiGet<Paginated<AuditLogItem>>("/api/audit-logs", {
    page: 1,
    pageSize: 50,
  });
  const logs = data.items;

  return (
    <>
      <PageHeader
        title={t("settings.auditLogs.title")}
        description={t("settings.auditLogs.description")}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.auditLogs.activityLog")}</CardTitle>
          <CardDescription>
            {t("settings.auditLogs.eventsCount", { n: logs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </>
  );
}
