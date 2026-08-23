"use client";

import Link from "next/link";
import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
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
  formatAddress,
  formatCurrency,
  formatDate,
  type Employee,
  type EmployeeStatus,
} from "@/lib/hr-data";

type ProfileStatus = EmployeeStatus | "inactive";

const STATUS_META: Record<
  ProfileStatus,
  { label: string; variant: "success" | "warning" | "info" | "secondary" }
> = {
  active: { label: "Active", variant: "success" },
  on_leave: { label: "On leave", variant: "warning" },
  pending: { label: "Pending onboarding", variant: "info" },
  inactive: { label: "Archived", variant: "secondary" },
};

function tenureYears(joinedAt: string): number {
  const joined = new Date(`${joinedAt}T00:00:00`).getFullYear();
  const years = new Date().getFullYear() - joined;
  return Math.max(1, years);
}

/**
 * Employee profile header: name, status and contact/employment cards. The
 * "Edit profile" action links to the full edit page (`/employees/[id]/edit`,
 * admin/HR only). `readOnly` hides the action (used for the employee's own
 * profile view).
 */
export function EmployeeProfileCard({
  employee,
  readOnly = false,
}: {
  employee: Employee;
  readOnly?: boolean;
}) {
  const status =
    STATUS_META[employee.status as ProfileStatus] ?? STATUS_META.active;
  const years = tenureYears(employee.joinedAt);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={employee.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {employee.name}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.role} · {employee.department}
          </p>
        </div>
        {!readOnly && (
          <Link href={`/employees/${employee.id}/edit`}>
            <Button variant="outline">
              <Pencil className="size-4" />
              Edit profile
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                How to reach {employee.name.split(" ")[0]}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                {employee.email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                {employee.phone}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {formatAddress(employee.address) || "—"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="size-4 shrink-0" />
                Reports to {employee.manager || "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment</CardTitle>
              <CardDescription>Contract details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="mt-1 font-medium">
                  {formatDate(employee.joinedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Tenure</p>
                <p className="mt-1 font-medium">
                  {years} year{years === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Annual base salary
                </p>
                <p className="mt-1 font-medium">
                  {formatCurrency(employee.salary)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {employee.department}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
