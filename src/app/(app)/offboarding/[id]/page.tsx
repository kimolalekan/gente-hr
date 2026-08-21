import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarX2,
  FileText,
  MessageSquareText,
  Paperclip,
} from "lucide-react";
import { Checklist } from "@/components/hr/checklist";
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
  EXIT_REASON_LABELS,
  formatDate,
  getEmployeeById,
  getOffboarding,
} from "@/lib/hr-data";

export const metadata = { title: "Offboarding" };

export default async function OffboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const offboarding = getOffboarding(id);
  if (!offboarding) notFound();

  const employee = getEmployeeById(offboarding.employeeId);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/offboarding"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Offboarding
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Exit — {employee?.name ?? offboarding.id}
            </h1>
            <Badge
              variant={
                offboarding.status === "completed" ? "success" : "warning"
              }
            >
              {offboarding.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {EXIT_REASON_LABELS[offboarding.reason]} · last working day{" "}
            {formatDate(offboarding.lastWorkingDay)}
          </p>
        </div>
        {employee && (
          <Link href={`/employees/${employee.id}`}>
            <Button variant="outline">View employee profile</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Exit checklist</CardTitle>
              <CardDescription>
                Tap items to mark them complete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Checklist
                items={offboarding.checklist}
                label="Offboarding checklist"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exit details</CardTitle>
              <CardDescription>Process information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {employee && (
                <div className="flex items-center gap-3">
                  <Avatar name={employee.name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{employee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.email}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarX2 className="size-4 shrink-0" />
                Last working day: {formatDate(offboarding.lastWorkingDay)}
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="size-4 shrink-0" />
                  Termination letter
                </span>
                {offboarding.terminationLetter ? (
                  <span className="flex min-w-0 items-center gap-1.5 font-medium">
                    <Paperclip className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate">
                      {offboarding.terminationLetter}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not attached</span>
                )}
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquareText className="size-3.5" /> Exit notes
                </p>
                <p className="mt-1 text-sm">
                  {offboarding.notes ?? "No notes recorded."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
