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
  type LoanStatus,
  type LoanType,
} from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("payroll.loans.loanTitle") };
}

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

function loanTypeLabel(
  type: string,
  t: (key: TranslationKey) => string,
): string {
  return isLoanType(type)
    ? t(`statusLabels.loanType.${type}` as TranslationKey)
    : type;
}

const LOAN_TYPES: LoanType[] = ["personal", "advance", "vehicle", "other"];

function isLoanType(value: string): value is LoanType {
  return LOAN_TYPES.includes(value as LoanType);
}

function isLoanStatus(value: string): value is LoanStatus {
  return (
    value === "pending" ||
    value === "approved" ||
    value === "active" ||
    value === "paid"
  );
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

  const t = await getTranslator();
  const locale = await getTenantLocale();

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
            {t("payroll.loans.title")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t("payroll.loans.loanTitleNamed", {
                type: loanTypeLabel(loan.type, t),
                name: loan.employeeName ?? loan.id,
              })}
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
              {isLoanStatus(loan.status)
                ? t(`statusLabels.loan.${loan.status}` as TranslationKey)
                : loan.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loan.disbursedAt
              ? `${t("payroll.loans.disbursedAt")} ${formatDate(loan.disbursedAt.slice(0, 10), locale)} · `
              : ""}
            {t("common.months", { n: loan.termMonths })}
          </p>
        </div>
        {user?.role !== "member" && (
          <Link href={`/employees/${loan.employeeId}`}>
            <Button variant="outline">{t("employees.viewProfile")}</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> {t("payroll.loans.amount")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(loan.amount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Percent className="size-4" /> {t("payroll.loans.interestRate")}
            </p>
            <p className="mt-1 text-2xl font-bold">{loan.interestRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> {t("payroll.loans.monthlyEmi")}
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(monthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarRange className="size-4" />{" "}
              {t("payroll.loans.outstandingShort")}
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {loan.status === "paid" ? "$0" : formatCurrency(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.loans.repaymentSchedule")}</CardTitle>
          <CardDescription>
            {t("payroll.loans.paymentsSummary", {
              paid: loan.paidMonths,
              total: loan.termMonths,
              interest: formatCurrency(totalInterest),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">
                    {t("common.month")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.loans.principal")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.loans.interest")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.loans.monthlyEmi")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.loans.balance")}
                  </th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    {t("common.status")}
                  </th>
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
                        {row.paid
                          ? t("statusLabels.loan.paid")
                          : t("statusLabels.loan.upcoming")}
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
