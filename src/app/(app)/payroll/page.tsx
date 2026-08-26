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
import { formatCurrency, formatDate } from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import dayjs from "dayjs";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("payroll.title") };
}

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

function currentPeriod(): string {
  return dayjs().endOf("month").format("MMM D");
}

/** "September 2026" → "Sep 1" — the day payroll runs. */
function nextRunLabel(period: string, locale: string): string {
  const [month, year] = period.split(" ");
  const index = MONTHS.indexOf(month);
  if (index === -1) return period;
  return new Date(Number(year), index, 1).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

/** Payroll run row from `GET /api/payroll/runs`. */
interface PayrollRunRow {
  id: string;
  period: string;
  processedAt: string;
  total: number;
  employees: number;
  status: string;
  createdAt: string;
}

/** Payslip row from `GET /api/payroll/payslips`. */
interface PayslipRow {
  id: string;
  employeeId: string;
  period: string;
  gross: number;
  net: number;
  status: string;
}

/** Loan row from `GET /api/payroll/loans`. */
interface LoanRow {
  id: string;
  employeeId: string;
  amount: number;
  monthlyEmi: number;
  paidMonths: number;
  status: string;
}

/** Current user's employee record from `GET /api/employees/me`. */
interface MeEmployee {
  id: string;
  name: string;
}

/** Preview from `GET /api/payroll/runs/preview`. */
interface PayrollPreviewData {
  period: string;
  employees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

/** Employee (member) view — their own payslips and loans only. */
async function MyPayroll({
  payslips,
  loans,
  employeeName,
}: {
  payslips: PayslipRow[];
  loans: LoanRow[];
  employeeName?: string;
}) {
  const t = await getTranslator();
  const latest = payslips[0];
  const current = latest?.period;
  const periodCount = current
    ? payslips.filter((payslip) => payslip.period === current).length
    : 0;
  const outstanding = loans
    .filter((loan) => loan.status === "active")
    .reduce(
      (sum, loan) => sum + (loan.amount - loan.paidMonths * loan.monthlyEmi),
      0,
    );

  return (
    <>
      <PageHeader
        title={t("payroll.myTitle")}
        description={
          employeeName
            ? t("payroll.myDescriptionNamed", { name: employeeName })
            : t("payroll.myDescription")
        }
      >
        <Link href="/payroll/loans">
          <Button variant="outline">
            <Landmark className="size-4" />
            {t("payroll.loans.myTitle")}
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> {t("payroll.latestNetPay")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {latest ? formatCurrency(latest.net) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest?.period ?? t("payroll.payslips.empty")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Landmark className="size-4" /> {t("payroll.loans.activeLoans")}
            </p>
            <p className="mt-1 text-2xl font-bold">{loans.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {outstanding > 0
                ? t("payroll.loans.outstandingValue", {
                    amount: formatCurrency(outstanding),
                  })
                : t("payroll.loans.nothingOutstanding")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> {t("payroll.payslips.title")}
            </p>
            <p className="mt-1 text-2xl font-bold">{periodCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {current ?? t("payroll.payslips.empty")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.payslips.myTitle")}</CardTitle>
          <CardDescription>
            {t("payroll.payslips.recentDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("payroll.payslips.noPayslipsAvailable")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">
                      {t("payroll.period")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("payroll.gross")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
                      {t("payroll.net")}
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
                  {payslips.map((payslip) => (
                    <tr
                      key={payslip.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {payslip.period}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(payslip.gross)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(payslip.net)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            payslip.status === "paid" ? "success" : "warning"
                          }
                        >
                          {t(
                            `statusLabels.payslip.${payslip.status}` as TranslationKey,
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/payroll/payslips/${payslip.id}`}>
                          <Button variant="outline" size="sm">
                            {t("common.view")}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default async function PayrollPage() {
  const user = await getCurrentUser();
  const t = await getTranslator();
  const locale = await getTenantLocale();
  if (user?.role === "member") {
    const [employee, payslips, loans] = await Promise.all([
      apiGet<MeEmployee>("/api/employees/me").catch(() => null),
      apiGet<Paginated<PayslipRow>>("/api/payroll/payslips"),
      apiGet<Paginated<LoanRow>>("/api/payroll/loans"),
    ]);
    return (
      <MyPayroll
        payslips={payslips.items}
        loans={loans.items}
        employeeName={employee?.name}
      />
    );
  }

  const runs = await apiGet<Paginated<PayrollRunRow>>("/api/payroll/runs");
  const latest = runs.items[0];
  const previewPeriod = latest ? nextPeriod(latest.period) : currentPeriod();
  const preview = await apiGet<PayrollPreviewData>(
    "/api/payroll/runs/preview",
    {
      period: previewPeriod,
    },
  ).catch(() => null);
  const previewProps = {
    period: preview?.period ?? previewPeriod,
    employees: preview?.employees ?? 0,
    gross: preview?.totalGross ?? 0,
    deductions: preview?.totalDeductions ?? 0,
    net: preview?.totalNet ?? 0,
  };
  const ytd = runs.items.reduce((sum, run) => sum + run.total, 0);

  return (
    <>
      <PageHeader
        title={t("payroll.title")}
        description={t("payroll.description")}
      >
        <RunPayrollButton preview={previewProps} />
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        <Link href="/payroll/loans">
          <Button variant="outline">
            <Landmark className="size-4" />
            {t("payroll.loans.title")}
          </Button>
        </Link>
        <Link href="/payroll/payslips">
          <Button variant="outline">
            <FileText className="size-4" />
            {t("payroll.payslips.title")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> {t("payroll.thisMonth")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {latest ? formatCurrency(latest.total) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest?.period ?? t("payroll.noRunsYet")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" /> {t("payroll.ytd")}
            </p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(ytd)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {runs.items.length > 0
                ? t("payroll.acrossRuns", {
                    n: runs.items.length,
                    s: runs.items.length === 1 ? "" : "s",
                  })
                : t("payroll.noRunsProcessed")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="size-4" /> {t("payroll.employeesPaid")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {latest?.employees ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latest
                ? t("payroll.acrossActiveRoles", {
                    n: latest.employees,
                    s: latest.employees === 1 ? "" : "s",
                  })
                : t("payroll.noRunsYet")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarClock className="size-4" /> {t("payroll.nextRun")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {nextRunLabel(previewPeriod, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("payroll.monthlyCycle")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.runsTitle")}</CardTitle>
          <CardDescription>{t("payroll.runsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">
                    {t("payroll.period")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.statusProcessed")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.employees")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("payroll.total")}
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
                {runs.items.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4 font-medium">{run.period}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(run.processedAt.slice(0, 10), locale)}
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
                        {t(`statusLabels.run.${run.status}` as TranslationKey)}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/payroll/${run.id}`}>
                        <Button variant="outline" size="sm">
                          {t("common.viewDetails")}
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
