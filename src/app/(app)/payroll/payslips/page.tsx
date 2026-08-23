import Link from "next/link";
import { Banknote, CalendarDays, FileText } from "lucide-react";
import { DateRangePicker } from "@/components/hr/date-range-picker";
import { PageHeader } from "@/components/hr/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/hr-data";
import { parseRange } from "@/lib/report-dates";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "Payslips" };

/** Payslip row from `GET /api/payroll/payslips` (member-scoped for members). */
interface PayslipRow {
  id: string;
  employeeId: string;
  employeeName: string | null;
  period: string;
  basic: number;
  hra: number;
  allowances: number;
  bonus: number;
  tax: number;
  pension: number;
  insurance: number;
  loanEmi: number;
  gross: number;
  net: number;
  status: string;
  generatedAt: string;
  createdAt: string;
}

export default async function PayslipsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  const isMember = user?.role === "member";

  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parseRange(fromParam, toParam);

  const data = await apiGet<Paginated<PayslipRow>>("/api/payroll/payslips", {
    from,
    to,
  });
  const payslips = data.items;

  // Newest period first (the API orders by generatedAt).
  const currentPeriod = payslips[0]?.period ?? null;
  const netTotal = payslips.reduce((sum, payslip) => sum + payslip.net, 0);
  const periodLabel = currentPeriod ?? "—";

  return (
    <>
      <PageHeader
        title={isMember ? "My payslips" : "Payslips"}
        description={
          isMember
            ? "Your monthly payslips."
            : "Monthly payslips for all employees."
        }
      >
        <DateRangePicker from={from} to={to} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarDays className="size-4" /> Period
            </p>
            <p className="mt-1 text-2xl font-bold">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> Payslips
            </p>
            <p className="mt-1 text-2xl font-bold">{payslips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> Net total
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatCurrency(netTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            Earnings and deductions per employee in the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Employee</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Gross
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Deductions
                  </th>
                  <th className="px-4 py-2.5 font-medium">Net</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => {
                  const deductions =
                    payslip.tax +
                    payslip.pension +
                    payslip.insurance +
                    payslip.loanEmi;
                  return (
                    <tr
                      key={payslip.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={payslip.employeeName ?? "—"}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {payslip.employeeName ?? "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {payslip.period}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {formatCurrency(payslip.gross)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        −{formatCurrency(deductions)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(payslip.net)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            payslip.status === "paid" ? "success" : "warning"
                          }
                        >
                          {payslip.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/payroll/payslips/${payslip.id}`}>
                          <Button variant="outline" size="sm">
                            View details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
