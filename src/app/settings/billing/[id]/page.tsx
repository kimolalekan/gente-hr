import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, formatDate, INVOICES } from '@/lib/hr-data';

export const metadata = { title: 'Invoice' };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = INVOICES.find((item) => item.id === id);
  if (!invoice) notFound();

  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/settings/billing"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Billing
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice {invoice.id.toUpperCase()}
            </h1>
            <Badge variant={invoice.status === 'paid' ? 'success' : 'warning'}>
              {invoice.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.period} · issued {formatDate(invoice.issuedAt)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Acme Inc.
              </CardTitle>
              <CardDescription>Monthly subscription</CardDescription>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Due date</p>
              <p className="font-medium">{formatDate(invoice.dueAt)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Quantity</th>
                  <th className="py-2.5 pl-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.description} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 pl-4 text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.amount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
