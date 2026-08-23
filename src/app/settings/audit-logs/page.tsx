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

export const metadata = { title: "Audit logs" };

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const data = await apiGet<Paginated<AuditLogItem>>("/api/audit-logs", {
    page: 1,
    pageSize: 50,
  });
  const logs = data.items;

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Who did what — login, payroll, leave and settings changes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>{logs.length} events · newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={logs} />
        </CardContent>
      </Card>
    </>
  );
}
