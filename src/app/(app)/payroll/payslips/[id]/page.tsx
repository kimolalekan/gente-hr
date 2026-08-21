import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileDown, Receipt } from 'lucide-react';
import { ActionButton } from '@/components/hr/action-button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, getEmployeeById, getPayslip } from '@/lib/hr-data';

export const metadata = { title: 'Payslip' };

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payslip = getPayslip(id);
  if (!payslip) notFound();

  const employee = getEmployeeById(payslip.employeeId);
  const deductions = payslip.tax + payslip.pension + payslip.insurance + payslip.loanEmi;
  const ytdGross = payslip.gross * 8; // Jan – Aug

  const earnings = [
    { label: 'Basic salary', value: payslip.basic },
    { label: 'HRA', value: payslip.hra },
    { label: 'Allowances', value: payslip.allowances },
    { label: 'Bonus', value: payslip.bonus },
  ];
  const deductionRows = [
    { label: 'Income tax', value: payslip.tax },
    { label: 'Pension', value: payslip.pension },
    { label: 'Insurance', value: payslip.insurance },
    ...(payslip.loanEmi > 0 ? [{ label: 'Loan EMI', value: payslip.loanEmi }] : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/payroll/payslips"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Payslips
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Payslip — {payslip.period}
            </h1>
            <Badge variant={payslip.status === 'paid' ? 'success' : 'warning'}>
              {payslip.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{employee?.name ?? ''}</p>
        </div>
        <ActionButton doneLabel="Downloaded">
          <FileDown />
          Download PDF
        </ActionButton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Earnings
              </CardTitle>
              <CardDescription>Breakdown of gross pay.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {earnings.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5 text-sm font-semibold">
                  <span>Gross pay</span>
                  <span>{formatCurrency(payslip.gross)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
              <CardDescription>Taxes, pension and other deductions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {deductionRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">−{formatCurrency(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5 text-sm font-semibold">
                  <span>Total deductions</span>
                  <span>−{formatCurrency(deductions)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Net pay and YTD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-center">
                <p className="text-xs text-muted-foreground">Net pay</p>
                <p className="mt-1 text-3xl font-bold text-success">
                  {formatCurrency(payslip.net)}
                </p>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Year-to-date gross</span>
                <span className="font-medium text-foreground">{formatCurrency(ytdGross)}</span>
              </div>
              {payslip.loanEmi > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Loan EMI included</span>
                  <span className="font-medium text-foreground">{formatCurrency(payslip.loanEmi)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employee</CardTitle>
              <CardDescription>Payslip recipient.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar name={employee?.name ?? '—'} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{employee?.name ?? '—'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee?.role ?? ''} · {employee?.department ?? ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
