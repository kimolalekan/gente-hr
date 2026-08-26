import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, Receipt, Users, Wallet } from "lucide-react";
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
import { formatCurrency, formatDate } from "@/lib/hr-data";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet } from "@/lib/server/api-client";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("payroll.runTitle") };
}

/** Payroll run detail from `GET /api/payroll/runs/[id]`. */
interface RunDetail {
  id: string;
  period: string;
  processedAt: string;
  total: number;
  employees: number;
  status: string;
  createdAt: string;
  entries: Array<{
    id: string;
    employeeId: string;
    employeeName: string | null;
    department: string | null;
    gross: number;
    deductions: number;
    net: number;
    status: string;
  }>;
  totals: { gross: number; deductions: number; net: number };
}

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Runs are an admin/HR surface; the API only serves those roles.
  const user = await getCurrentUser();
  if (!user || user.role === "member") notFound();

  const run = await apiGet<RunDetail>(`/api/payroll/runs/${id}`).catch(
    () => null,
  );
  if (!run) notFound();

  const t = await getTranslator();
  const locale = await getTenantLocale();

  const { entries, totals } = run;
  const byDepartment = entries.reduce<
    Record<string, { employees: number; gross: number }>
  >((acc, entry) => {
    const department = entry.department ?? t("common.unknown");
    acc[department] = acc[department] ?? { employees: 0, gross: 0 };
    acc[department].employees += 1;
    acc[department].gross += entry.gross;
    return acc;
  }, {});

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/payroll"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("payroll.title")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{run.period}</h1>
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("payroll.processedOn", {
              date: formatDate(run.processedAt.slice(0, 10), locale),
              n: run.employees,
              s: run.employees === 1 ? "" : "s",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4" /> {t("payroll.gross")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(totals.gross)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Receipt className="size-4" /> {t("payroll.deductions")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              −{formatCurrency(totals.deductions)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Banknote className="size-4" /> {t("payroll.net")}
            </p>
            <p className="mt-1 text-2xl font-bold text-success">
              {formatCurrency(totals.net)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> {t("payroll.lines")}
            </p>
            <p className="mt-1 text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("payroll.employeePayments")}</CardTitle>
            <CardDescription>
              {t("payroll.employeePaymentsDescription")}
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
                    <th className="px-4 py-2.5 font-medium">
                      {t("payroll.gross")}
                    </th>
                    <th className="px-4 py-2.5 font-medium">
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
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.employeeName ?? "—"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {entry.employeeName ?? "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {entry.department ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(entry.gross)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatCurrency(entry.deductions)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(entry.net)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.status === "paid" ? "success" : "warning"
                          }
                        >
                          {t(
                            `statusLabels.payslip.${entry.status}` as TranslationKey,
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/employees/${entry.employeeId}`}>
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

        <Card>
          <CardHeader>
            <CardTitle>{t("payroll.byDepartment")}</CardTitle>
            <CardDescription>
              {t("payroll.byDepartmentDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byDepartment)
              .sort(([, a], [, b]) => b.gross - a.gross)
              .map(([department, info]) => {
                const pct = Math.round((info.gross / totals.gross) * 100);
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
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
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
