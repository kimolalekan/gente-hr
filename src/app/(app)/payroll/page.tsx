import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Landmark,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/hr/page-header";
import { RunPayrollButton } from "@/components/hr/run-payroll-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  getPayslips,
  PAYROLL_RUNS,
} from "@/lib/hr-data";

export const metadata = { title: "Payroll" };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function nextPeriod(period: string): string {
  const [month, year] = period.split(" ");
  const index = MONTHS.indexOf(month);
  if (index === -1) return period;
  const next = (index + 1) % MONTHS.length;
  return `${MONTHS[next]} ${next === 0 ? Number(year) + 1 : year}`;
}

export default function PayrollPage() {
  const latest = PAYROLL_RUNS[0];
  const previewPayslips = getPayslips(nextPeriod(latest.period));
  const preview = {
    period: nextPeriod(latest.period),
    employees: previewPayslips.length,
    gross: previewPayslips.reduce((sum, payslip) => sum + payslip.gross, 0),
    deductions: previewPayslips.reduce(
      (sum, payslip) =>
        sum +
        payslip.tax +
        payslip.pension +
        payslip.insurance +
        payslip.loanEmi,
      0,
    ),
    net: previewPayslips.reduce((sum, payslip) => sum + payslip.net, 0),
  };

  return (
    <>
      <PageHeader title="Payroll" description="Run, review and export payroll.">
        <RunPayrollButton preview={preview} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Link href="/payroll/loans">
          <Button variant="outline">
            <Landmark className="size-4" />
            Loans
          </Button>
        </Link>
        <Link href="/payroll/payslips">
          <Button variant="outline">
            <FileText className="size-4" />
            Payslips
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> This month
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(latest.total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest.period}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> YTD
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(1221760)}</p>
            <p className="mt-1 text-xs text-success">+3.2% vs last year</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" /> Employees paid
            </p>
            <p className="mt-1 text-2xl font-bold">{latest.employees}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {latest.employees} active roles
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarClock className="size-4" /> Next run
            </p>
            <p className="mt-1 text-2xl font-bold">Sep 1</p>
            <p className="mt-1 text-xs text-muted-foreground">Monthly cycle</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll runs</CardTitle>
          <CardDescription>History of processed periods.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Processed</th>
                  <th className="px-4 py-2.5 font-medium">Employees</th>
                  <th className="px-4 py-2.5 font-medium">Total</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {PAYROLL_RUNS.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">{run.period}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(run.processedAt)}
                    </td>
                    <td className="px-4 py-3">{run.employees}</td>
                    <td className="px-4 py-3">{formatCurrency(run.total)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          run.status === "completed"
                            ? "success"
                            : run.status === "processing"
                              ? "info"
                              : "warning"
                        }
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/payroll/${run.id}`}>
                        <Button variant="outline" size="sm">
                          View details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
