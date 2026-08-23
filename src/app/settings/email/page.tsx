import {
  EmailConfigForm,
  type EmailSettings,
} from "@/components/settings/email-config-form";
import { PageHeader } from "@/components/hr/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "Email service" };

export const dynamic = "force-dynamic";

interface EmailLogEntry {
  id: string;
  recipient: string;
  templateKey: string | null;
  provider: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  sent: "success",
  queued: "secondary",
  failed: "destructive",
  bounced: "warning",
};

function templateLabel(templateKey: string | null): string {
  if (!templateKey) return "—";
  return templateKey
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function EmailSettingsPage() {
  const [settings, logsData] = await Promise.all([
    apiGet<EmailSettings>("/api/settings/email"),
    apiGet<Paginated<EmailLogEntry>>("/api/settings/email/logs", {
      page: 1,
      pageSize: 20,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Email service"
        description="Provider configuration and template triggers."
      />

      <Card>
        <CardHeader>
          <CardTitle>Delivery configuration</CardTitle>
          <CardDescription>
            Provider credentials, sender identity and tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailConfigForm initial={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
          <CardDescription>
            Latest emails sent through your provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsData.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No emails sent yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">Time</th>
                    <th className="px-4 py-2.5 font-medium">Recipient</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      Template
                    </th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                      Provider
                    </th>
                    <th className="py-2.5 pl-4 text-right font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logsData.items.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="whitespace-nowrap py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">{log.recipient}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {templateLabel(log.templateKey)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {log.provider ?? "—"}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Badge
                          variant={STATUS_VARIANT[log.status] ?? "secondary"}
                        >
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
