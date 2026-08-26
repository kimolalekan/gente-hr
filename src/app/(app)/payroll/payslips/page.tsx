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
import { getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("payroll.payslips.title") };
}

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
  const t = await getTranslator();

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
        title={
          isMember ? t("payroll.payslips.myTitle") : t("payroll.payslips.title")
        }
        description={
          isMember
            ? t("payroll.payslips.myDescription")
            : t("payroll.payslips.description")
        }
      >
        <DateRangePicker from={from} to={to} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <CalendarDays className="size-4" /> {t("payroll.period")}
            </p>
            <p className="mt-1 text-2xl font-bold">{periodLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> {t("payroll.payslips.title")}
            </p>
            <p className="mt-1 text-2xl font-bold">{payslips.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> {t("payroll.payslips.netTotal")}
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatCurrency(netTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.payslips.title")}</CardTitle>
          <CardDescription>
            {t("payroll.payslips.listDescription")}
          </CardDescription>
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
                    {t("payroll.gross")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t("payroll.deductions")}
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
                          {t(
                            `statusLabels.payslip.${payslip.status}` as TranslationKey,
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/payroll/payslips/${payslip.id}`}>
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
