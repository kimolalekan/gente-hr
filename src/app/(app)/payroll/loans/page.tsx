import Link from "next/link";
import { HandCoins, Hourglass, Landmark } from "lucide-react";
import { DateRangePicker } from "@/components/hr/date-range-picker";
import { MyLoans } from "@/components/hr/my-loans";
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
import {
  formatCurrency,
  type Loan,
  type LoanStatus,
  type LoanType,
} from "@/lib/hr-data";
import { parseRange } from "@/lib/report-dates";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("payroll.loans.title") };
}

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "secondary"
> = {
  paid: "success",
  active: "info",
  approved: "secondary",
  pending: "warning",
};

const LOAN_TYPES: LoanType[] = ["personal", "advance", "vehicle", "other"];

/** Loan row from `GET /api/payroll/loans` (member-scoped for members). */
interface ApiLoan {
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
}

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

/** Map the API row to the `Loan` shape used by `MyLoans` (`monthlyEmi` → `monthly`). */
function toLoan(loan: ApiLoan): Loan {
  return {
    id: loan.id,
    employeeId: loan.employeeId,
    type: isLoanType(loan.type) ? loan.type : "personal",
    amount: loan.amount,
    interestRate: loan.interestRate,
    termMonths: loan.termMonths,
    monthly: loan.monthlyEmi,
    disbursedAt: loan.disbursedAt ?? "",
    paidMonths: loan.paidMonths,
    status: isLoanStatus(loan.status) ? loan.status : "pending",
  };
}

function loanTypeLabel(
  type: string,
  t: (key: TranslationKey) => string,
): string {
  return isLoanType(type)
    ? t(`statusLabels.loanType.${type}` as TranslationKey)
    : type;
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  const isMember = user?.role === "member";
  const t = await getTranslator();

  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parseRange(fromParam, toParam);

  const data = await apiGet<Paginated<ApiLoan>>("/api/payroll/loans", {
    from,
    to,
  });
  const loans = data.items;

  // Employees get a self-service view with a "Request loan" button.
  if (isMember) {
    const me = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    return (
      <MyLoans
        employeeId={me?.id ?? ""}
        initialLoans={loans.map(toLoan)}
        from={from}
        to={to}
      />
    );
  }

  const outstanding = loans
    .filter((loan) => loan.status === "active")
    .reduce(
      (sum, loan) => sum + (loan.amount - loan.paidMonths * loan.monthlyEmi),
      0,
    );
  const active = loans.filter((loan) => loan.status === "active").length;

  return (
    <>
      <PageHeader
        title={t("payroll.loans.title")}
        description={t("payroll.loans.description")}
      >
        <DateRangePicker from={from} to={to} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <HandCoins className="size-4" /> {t("payroll.loans.activeLoans")}
            </p>
            <p className="mt-1 text-2xl font-bold">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Landmark className="size-4" />{" "}
              {t("payroll.loans.outstandingBalance")}
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatCurrency(outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Hourglass className="size-4" />{" "}
              {t("payroll.loans.pendingApproval")}
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {loans.filter((loan) => loan.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.loans.allTitle")}</CardTitle>
          <CardDescription>{t("payroll.loans.allDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">
                    {t("payroll.payslips.employee")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    {t("payroll.loans.type")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.loans.amount")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t("payroll.loans.monthlyEmi")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t("payroll.loans.remaining")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("common.status")}
                  </th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    {t("common.details")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const remaining = Math.max(
                    0,
                    loan.amount - loan.paidMonths * loan.monthlyEmi,
                  );
                  return (
                    <tr
                      key={loan.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={loan.employeeName ?? "—"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {loan.employeeName ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {loanTypeLabel(loan.type, t)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatCurrency(loan.monthlyEmi)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {loan.status === "paid"
                          ? "$0"
                          : formatCurrency(remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[loan.status]}>
                          {isLoanStatus(loan.status)
                            ? t(
                                `statusLabels.loan.${loan.status}` as TranslationKey,
                              )
                            : loan.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/payroll/loans/${loan.id}`}>
                          <Button variant="outline" size="sm">
                            {t("common.viewDetails")}
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
