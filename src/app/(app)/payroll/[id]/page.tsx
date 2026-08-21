import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Banknote, Receipt, Users, Wallet } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatCurrency,
  formatDate,
  getEmployeeById,
  getPayrollEntries,
  PAYROLL_RUNS,
} from '@/lib/hr-data';

export const metadata = { title: 'Payroll run' };

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = PAYROLL_RUNS.find((item) => item.id === id);
  if (!run) notFound();

  const entries = getPayrollEntries(run.id);
  const grossTotal = entries.reduce((sum, entry) => sum + entry.gross, 0);
  const deductionsTotal = entries.reduce((sum, entry) => sum + entry.deductions, 0);
  const netTotal = entries.reduce((sum, entry) => sum + entry.net, 0);

  const byDepartment = entries.reduce<Record<string, { employees: number; gross: number }>>(
    (acc, entry) => {
      const employee = getEmployeeById(entry.employeeId);
      const department = employee?.department ?? 'Unknown';
      acc[department] = acc[department] ?? { employees: 0, gross: 0 };
      acc[department].employees += 1;
      acc[department].gross += entry.gross;
      return acc;
    },
    {},
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/payroll"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Payroll
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{run.period}</h1>
            <Badge
              variant={
                run.status === 'completed' ? 'success' : run.status === 'processing' ? 'info' : 'warning'
              }
            >
              {run.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Processed {formatDate(run.processedAt)} · {run.employees} employees
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> Gross
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(grossTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Receipt className="size-4" /> Deductions
            </p>
            <p className="mt-1 text-2xl font-bold">−{formatCurrency(deductionsTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> Net
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{formatCurrency(netTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> Lines
            </p>
            <p className="mt-1 text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employee payments</CardTitle>
            <CardDescription>Gross, deductions and net per employee.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">Employee</th>
                    <th className="px-4 py-2.5 font-medium">Gross</th>
                    <th className="px-4 py-2.5 font-medium">Deductions</th>
                    <th className="px-4 py-2.5 font-medium">Net</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="py-2.5 pl-4 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const employee = getEmployeeById(entry.employeeId);
                    return (
                      <tr key={entry.employeeId} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={employee?.name ?? '—'} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{employee?.name ?? '—'}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {employee?.department ?? ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatCurrency(entry.gross)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatCurrency(entry.deductions)}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(entry.net)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={entry.status === 'paid' ? 'success' : 'warning'}>
                            {entry.status}
                          </Badge>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          {employee && (
                            <Link href={`/employees/${employee.id}`}>
                              <Button variant="outline" size="sm">
                                View details
                              </Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By department</CardTitle>
            <CardDescription>Gross payroll allocation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byDepartment)
              .sort(([, a], [, b]) => b.gross - a.gross)
              .map(([department, info]) => {
                const pct = Math.round((info.gross / grossTotal) * 100);
                return (
                  <Link
                    key={department}
                    href={`/employees?department=${encodeURIComponent(department)}`}
                    className="block rounded-lg border border-border bg-background/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{department}</span>
                      <span className="text-xs text-muted-foreground">
                        {info.employees} · {formatCurrency(info.gross)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
