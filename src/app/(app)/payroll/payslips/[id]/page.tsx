import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown, Receipt } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { cn } from "@/lib/utils";

export const metadata = { title: "Payslip" };

/** Payslip detail from `GET /api/payroll/payslips/[id]`. */
interface PayslipDetail {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string | null;
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

/** Payslip row from `GET /api/payroll/payslips` — used for the YTD figure. */
interface PayslipRow {
  period: string;
  gross: number;
}

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const payslip = await apiGet<PayslipDetail>(
    `/api/payroll/payslips/${id}`,
  ).catch(() => null);
  if (!payslip) notFound();

  // Employees can only open their own payslips (the API also enforces this).
  if (user?.role === "member") {
    const me = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    if (!me || me.id !== payslip.employeeId) notFound();
  }

  const deductions =
    payslip.tax + payslip.pension + payslip.insurance + payslip.loanEmi;

  // Year-to-date gross: all payslips for this employee in the same period
  // year (member-scoped automatically for members).
  const periodYear = payslip.period.split(" ")[1] ?? "";
  const all = await apiGet<Paginated<PayslipRow>>(
    "/api/payroll/payslips",
    user?.role === "member" ? undefined : { employeeId: payslip.employeeId },
  ).catch(() => null);
  const ytdGross = (all?.items ?? [])
    .filter((row) => periodYear && row.period.includes(periodYear))
    .reduce((sum, row) => sum + row.gross, 0);

  const earnings = [
    { label: "Basic salary", value: payslip.basic },
    { label: "HRA", value: payslip.hra },
    { label: "Transport allowance", value: payslip.allowances },
    { label: "Bonus", value: payslip.bonus },
  ];
  const deductionRows = [
    { label: "Income tax", value: payslip.tax },
    { label: "Pension", value: payslip.pension },
    { label: "Insurance", value: payslip.insurance },
    ...(payslip.loanEmi > 0
      ? [{ label: "Loan EMI", value: payslip.loanEmi }]
      : []),
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
            <Badge variant={payslip.status === "paid" ? "success" : "warning"}>
              {payslip.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {payslip.employeeName ?? ""}
          </p>
        </div>
        <Link
          href={`/api/payroll/payslips/${payslip.id}/pdf`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <FileDown />
          Download PDF
        </Link>
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
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">
                      {formatCurrency(row.value)}
                    </span>
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
              <CardDescription>
                Taxes, pension and other deductions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {deductionRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-medium">
                      −{formatCurrency(row.value)}
                    </span>
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
                <span className="font-medium text-foreground">
                  {formatCurrency(ytdGross)}
                </span>
              </div>
              {payslip.loanEmi > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Loan EMI included</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(payslip.loanEmi)}
                  </span>
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
                <Avatar name={payslip.employeeName ?? "—"} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {payslip.employeeName ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {payslip.employeeEmail ?? ""}
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
