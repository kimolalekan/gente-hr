import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarX2, MessageSquareText } from "lucide-react";
import { Checklist } from "@/components/hr/checklist";
import { OffboardingActions } from "@/components/hr/offboarding-actions";
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
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, ApiClientError } from "@/lib/server/api-client";
import {
  EXIT_REASON_LABELS,
  formatDate,
  type ExitReason,
  type OffboardingChecklistItem,
} from "@/lib/hr-data";

export const metadata = { title: "Offboarding" };

interface OffboardingDetailRow {
  id: string;
  employeeId: string;
  reason: string;
  lastWorkingDay: string;
  status: string;
  exitInterviewNotes: string | null;
  notes: string | null;
  createdAt: string;
  checklist: Array<{
    id: string;
    name: string;
    done: boolean;
    sortOrder: number;
  }>;
  employee: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default async function OffboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Exit processes are an HR/admin workspace.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/");

  const { id } = await params;

  let row: OffboardingDetailRow;
  try {
    row = await apiGet<OffboardingDetailRow>(`/api/offboarding/${id}`);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound();
    throw error;
  }

  const employee = row.employee;
  const reason = row.reason as ExitReason;
  const checklist: OffboardingChecklistItem[] = row.checklist.map((item) => ({
    id: item.id,
    name: item.name,
    done: item.done,
  }));

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
              Exit — {employee?.name ?? row.id}
            </h1>
            <Badge variant={row.status === "completed" ? "success" : "warning"}>
              {row.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {EXIT_REASON_LABELS[reason] ?? row.reason} · last working day{" "}
            {formatDate(row.lastWorkingDay)}
          </p>
        </div>
        {employee && (
          <div className="flex flex-wrap items-center gap-2">
            <OffboardingActions
              offboarding={{
                id: row.id,
                status: row.status,
                reason: row.reason,
                lastWorkingDay: row.lastWorkingDay,
                notes: row.notes,
                exitInterviewNotes: row.exitInterviewNotes,
              }}
            />
            <Link href={`/employees/${employee.id}`}>
              <Button variant="outline">View employee profile</Button>
            </Link>
          </div>
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
                items={checklist}
                label="Offboarding checklist"
                offboardingId={row.id}
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
                Last working day: {formatDate(row.lastWorkingDay)}
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquareText className="size-3.5" /> Exit notes
                </p>
                <p className="mt-1 text-sm">
                  {row.notes ?? "No notes recorded."}
                </p>
              </div>
              {row.exitInterviewNotes && (
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MessageSquareText className="size-3.5" /> Exit interview
                  </p>
                  <p className="mt-1 text-sm">{row.exitInterviewNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
