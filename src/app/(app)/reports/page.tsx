import {
  BarChart3,
  CalendarDays,
  Clock,
  FileDown,
  FileText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/hr/page-header";
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
import { apiGet } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatCurrency } from "@/lib/hr-data";
import { parseRange } from "@/lib/report-dates";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("reports.title") };
}

export const dynamic = "force-dynamic";

interface ReportSummary {
  id: string;
  title: string;
  description: string;
  metric: string;
}

interface ReportMetrics {
  employees: number;
  onLeaveToday: number;
  pendingLeave: number;
  payrollTotal: number;
  departments: number;
}

const ICONS: Record<string, LucideIcon> = {
  employees: Users,
  leave: CalendarDays,
  attendance: Clock,
  payroll: Wallet,
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // Reports are org-wide analytics — not visible to employees.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const locale = await getTenantLocale();
  const t = await getTranslator();

  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parseRange(fromParam, toParam);
  const rangeParams = `from=${from}&to=${to}`;

  const { reports, metrics } = await apiGet<{
    reports: ReportSummary[];
    metrics: ReportMetrics;
  }>("/api/reports");

  const metricCards: Array<{
    label: string;
    labelKey: TranslationKey | null;
    value: string;
    icon: LucideIcon;
  }> = [
    {
      label: "Employees",
      labelKey: "payroll.employees",
      value: metrics.employees.toLocaleString(locale),
      icon: Users,
    },
    {
      label: "On leave today",
      labelKey: "attendance.onLeaveToday",
      value: String(metrics.onLeaveToday),
      icon: CalendarDays,
    },
    {
      label: "Pending leave",
      labelKey: "leave.pendingLeave",
      value: String(metrics.pendingLeave),
      icon: Clock,
    },
    {
      label: "Payroll total",
      labelKey: "reports.payrollTotal",
      value: formatCurrency(metrics.payrollTotal),
      icon: Wallet,
    },
    {
      label: "Departments",
      labelKey: "settings.departments.title",
      value: String(metrics.departments),
      icon: BarChart3,
    },
  ];

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
      >
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={from} to={to} />
          <Link
            href={`/api/reports/export-all?format=csv&${rangeParams}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FileDown />
            {t("reports.exportAll")}
          </Link>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="space-y-2 p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.labelKey ? t(card.labelKey) : card.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => {
          const Icon = ICONS[report.id] ?? BarChart3;
          return (
            <Card key={report.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <Badge className="bg-muted text-muted-foreground">
                    {report.metric}
                  </Badge>
                </div>
                <CardTitle className="pt-2">
                  <Link
                    href={`/reports/${report.id}`}
                    className="transition-colors hover:text-primary"
                  >
                    {report.title}
                  </Link>
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Link
                  href={`/reports/${report.id}?${rangeParams}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1",
                  )}
                >
                  <FileText />
                  {t("reports.viewReport")}
                </Link>
                <Link
                  href={`/api/reports/${report.id}/export?format=csv&${rangeParams}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "flex-1",
                  )}
                >
                  <FileDown />
                  {t("reports.exportCsv")}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
