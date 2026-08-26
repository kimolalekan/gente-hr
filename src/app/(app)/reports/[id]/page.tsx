import { ArrowLeft, FileDown, FileText } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DateRangePicker } from "@/components/hr/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiClientError, apiGet } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { formatCurrency } from "@/lib/hr-data";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import { parseRange } from "@/lib/report-dates";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("reports.reportTitle") };
}

export const dynamic = "force-dynamic";

interface ReportDetail {
  report: { id: string; title: string; description: string; metric: string };
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

function formatCell(
  value: unknown,
  key: string,
  reportId: string,
  locale: string,
): string {
  if (value === null || value === undefined) return "—";
  if (/date/i.test(key) && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  if (reportId === "payroll" && key === "total" && typeof value === "number") {
    return formatCurrency(value);
  }
  return String(value);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parseRange(fromParam, toParam);

  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const locale = await getTenantLocale();
  const t = await getTranslator();

  let data: ReportDetail;
  try {
    data = await apiGet<ReportDetail>(`/api/reports/${id}`, { from, to });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const { report, rows, summary } = data;
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const rangeParams = `from=${from}&to=${to}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/reports"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {t("reports.title")}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {report.title}
            </h1>
            <Badge className="bg-muted text-muted-foreground">
              {report.metric}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={from} to={to} />
          <Link
            href={`/api/reports/${report.id}/export?format=csv&${rangeParams}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FileDown />
            {t("reports.exportCsv")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(summary).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                {humanizeKey(key)}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {formatCell(value, key, report.id, locale)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            {t("reports.results")}
          </CardTitle>
          <CardDescription>
            {t("reports.rowCount", {
              n: rows.length,
              s: rows.length === 1 ? "" : "s",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {columns.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("reports.noData")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="py-2.5 pr-4 font-medium last:text-right"
                      >
                        {humanizeKey(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-border last:border-0"
                    >
                      {columns.map((column) => (
                        <td
                          key={column}
                          className="py-3 pr-4 text-muted-foreground last:text-right"
                        >
                          {formatCell(row[column], column, report.id, locale)}
                        </td>
                      ))}
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
