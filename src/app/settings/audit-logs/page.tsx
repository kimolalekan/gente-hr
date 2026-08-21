import { AuditLogTable } from '@/components/settings/audit-log-table';
import { PageHeader } from '@/components/hr/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUDIT_LOGS } from '@/lib/hr-data';

export const metadata = { title: 'Audit logs' };

export default function AuditLogsPage() {
  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Who did what — login, payroll, leave and settings changes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
          <CardDescription>
            {AUDIT_LOGS.length} events · last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogTable logs={AUDIT_LOGS} />
        </CardContent>
      </Card>
    </>
  );
}
