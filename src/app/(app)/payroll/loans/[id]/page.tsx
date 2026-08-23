import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarRange,
  Percent,
  Wallet,
} from "lucide-react";
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
  LOAN_TYPE_LABELS,
  type LoanType,
} from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";

export const metadata = { title: "Loan" };

/** Loan detail from `GET /api/payroll/loans/[id]` (+ repayment schedule). */
interface LoanDetail {
  id: string;
  employeeId: string;
  employeeName: string | null;
  type: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyEmi: number;
  disbursedAt: string | null;
  paidMonths: number;
  status: string;
  createdAt: string;
  schedule: Array<{
    month: string;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

function loanTypeLabel(type: string): string {
  return LOAN_TYPE_LABELS[type as LoanType] ?? type;
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const loan = await apiGet<LoanDetail>(`/api/payroll/loans/${id}`).catch(
    () => null,
  );
  if (!loan) notFound();

  // Employees can only open their own loans (the API also enforces this).
  if (user?.role === "member") {
    const me = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    if (!me || me.id !== loan.employeeId) notFound();
  }

  const monthly = loan.monthlyEmi;
  const remaining = Math.max(0, loan.amount - loan.paidMonths * monthly);
  const schedule = loan.schedule.map((row, index) => ({
    ...row,
    emi: row.principal + row.interest,
    paid: index < loan.paidMonths,
  }));
  const totalInterest = loan.schedule.reduce(
    (sum, row) => sum + row.interest,
    0,
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/payroll/loans"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Loans
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {loanTypeLabel(loan.type)} loan — {loan.employeeName ?? loan.id}
            </h1>
            <Badge
              variant={
                loan.status === "paid"
                  ? "success"
                  : loan.status === "active"
                    ? "info"
                    : loan.status === "approved"
                      ? "secondary"
                      : "warning"
              }
            >
              {loan.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loan.disbursedAt
              ? `Disbursed ${formatDate(loan.disbursedAt.slice(0, 10))} · `
              : ""}
            {loan.termMonths} months
          </p>
        </div>
        {user?.role !== "member" && (
          <Link href={`/employees/${loan.employeeId}`}>
            <Button variant="outline">View employee profile</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> Principal
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(loan.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Percent className="size-4" /> Interest
            </p>
            <p className="mt-1 text-2xl font-bold">{loan.interestRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> EMI
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(monthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarRange className="size-4" /> Outstanding
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {loan.status === "paid" ? "$0" : formatCurrency(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repayment schedule</CardTitle>
          <CardDescription>
            {loan.paidMonths} of {loan.termMonths} payments made · total
            interest {formatCurrency(totalInterest)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Month</th>
                  <th className="px-4 py-2.5 font-medium">Principal</th>
                  <th className="px-4 py-2.5 font-medium">Interest</th>
                  <th className="px-4 py-2.5 font-medium">EMI</th>
                  <th className="px-4 py-2.5 font-medium">Balance</th>
                  <th className="py-2.5 pl-4 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr
                    key={row.month}
                    className={
                      row.paid
                        ? "border-b border-border last:border-0 opacity-50"
                        : "border-b border-border last:border-0"
                    }
                  >
                    <td className="py-2.5 pr-4 font-medium">{row.month}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCurrency(row.principal)}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCurrency(row.interest)}
                    </td>
                    <td className="px-4 py-2.5">{formatCurrency(row.emi)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {formatCurrency(row.balance)}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <Badge variant={row.paid ? "success" : "secondary"}>
                        {row.paid ? "Paid" : "Upcoming"}
                      </Badge>
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
