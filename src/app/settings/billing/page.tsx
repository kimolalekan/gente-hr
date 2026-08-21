import Link from "next/link";
import { CreditCard, FileText, ShieldCheck, Zap } from "lucide-react";
import { ActionButton } from "@/components/hr/action-button";
import { PageHeader } from "@/components/hr/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate, INVOICES } from "@/lib/hr-data";

export const metadata = { title: "Billing" };

export default function BillingSettingsPage() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Plan, payment method and invoices."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  Growth plan
                </CardTitle>
                <CardDescription>
                  Per-seat pricing, unlimited reports.
                </CardDescription>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-bold">
              $4
              <span className="text-base font-medium text-muted-foreground">
                /employee/mo
              </span>
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Unlimited
                employees &amp; reports
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Custom branding
                &amp; themes
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-success" /> Priority support
              </li>
            </ul>
            <div className="flex gap-2">
              <ActionButton variant="outline" doneLabel="Contacted">
                Upgrade to Enterprise
              </ActionButton>
              <ActionButton variant="ghost" doneLabel="Cancelled">
                Cancel plan
              </ActionButton>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Payment method
              </CardTitle>
              <CardDescription>Used for monthly billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                <span className="flex items-center gap-2 font-medium">
                  <CreditCard className="size-4 text-muted-foreground" />
                  Visa •••• 4242
                </span>
                <span className="text-xs text-muted-foreground">
                  Expires 09/28
                </span>
              </div>
              <ActionButton variant="outline" size="sm" doneLabel="Updated">
                Update card
              </ActionButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Invoices
              </CardTitle>
              <CardDescription>
                View and download past invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {INVOICES.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">{invoice.period}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.id.toUpperCase()} · issued{" "}
                        {formatDate(invoice.issuedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "paid" ? "success" : "warning"
                        }
                      >
                        {invoice.status}
                      </Badge>
                      <Link href={`/settings/billing/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          View details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
