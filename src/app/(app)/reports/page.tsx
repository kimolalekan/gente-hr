import {
  BarChart3,
  FileDown,
  FileText,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { ActionButton } from "@/components/hr/action-button";
import { PageHeader } from "@/components/hr/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { REPORTS } from "@/lib/hr-data";

export const metadata = { title: "Reports" };

const ICONS: Record<string, LucideIcon> = {
  rep_001: BarChart3,
  rep_002: PieChart,
  rep_003: BarChart3,
  rep_004: FileText,
  rep_005: PieChart,
  rep_006: BarChart3,
};

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate and schedule workforce analytics."
      >
        <ActionButton variant="outline" doneLabel="Exported">
          <FileDown />
          Export all
        </ActionButton>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => {
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
                <CardTitle className="pt-2">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <ActionButton
                  variant="outline"
                  size="sm"
                  className="w-full"
                  doneLabel="Queued"
                >
                  <FileDown />
                  Generate
                </ActionButton>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
