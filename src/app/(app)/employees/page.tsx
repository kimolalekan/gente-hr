import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileDown,
  Plane,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { EmployeeDirectory } from "@/components/hr/employee-directory";
import { PageHeader } from "@/components/hr/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/hr-data";

export const metadata = { title: "Employees" };

interface OnboardingStatusRow {
  status: string;
}

interface OffboardingStatusRow {
  status: string;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  // Employees don't see the org directory — they have their own profile.
  const user = await getCurrentUser();
  if (user?.role === "member") redirect("/profile");

  const { department } = await searchParams;

  const [employeePage, onboardingPage, offboardings] = await Promise.all([
    apiGet<Paginated<Employee>>("/api/employees", { pageSize: 500 }),
    apiGet<Paginated<OnboardingStatusRow>>("/api/onboarding", {
      pageSize: 500,
    }),
    apiGet<OffboardingStatusRow[]>("/api/offboarding"),
  ]);

  const employees = employeePage.items;
  const active = employees.filter(
    (employee) => employee.status === "active",
  ).length;
  const onLeave = employees.filter(
    (employee) => employee.status === "on_leave",
  ).length;
  const pendingOnboarding = onboardingPage.items.filter(
    (plan) => plan.status === "in_progress",
  ).length;
  const pendingOffboarding = offboardings.filter(
    (item) => item.status === "in_progress",
  ).length;

  const exportUrl =
    department && department !== "all"
      ? `/api/employees/export?format=csv&department=${encodeURIComponent(department)}`
      : "/api/employees/export?format=csv";

  return (
    <>
      <PageHeader
        title="Employees"
        description="Directory of everyone at your company."
      >
        <Link
          href={exportUrl}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <FileDown />
          Export
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> Total
            </p>
            <p className="mt-1 text-2xl font-bold">{employees.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <UserCheck className="size-4" /> Active
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Plane className="size-4" /> On leave
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">{onLeave}</p>
          </CardContent>
        </Card>
        <Link href="/onboarding" className="group">
          <Card className="transition-colors group-hover:border-primary/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <UserPlus className="size-4" /> Pending onboarding
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-info">
                {pendingOnboarding}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/offboarding" className="group">
          <Card className="transition-colors group-hover:border-primary/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <UserMinus className="size-4" /> Pending offboarding
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-warning">
                {pendingOffboarding}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <EmployeeDirectory
        employees={employees}
        userRole={user?.role}
        initialDepartment={
          department && department !== "all" ? department : "all"
        }
      />
    </>
  );
}
