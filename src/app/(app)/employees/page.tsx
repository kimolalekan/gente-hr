import Link from "next/link";
import { Plane, UserCheck, UserMinus, UserPlus, Users } from "lucide-react";
import { EmployeeDirectory } from "@/components/hr/employee-directory";
import { PageHeader } from "@/components/hr/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EMPLOYEES, OFFBOARDINGS, ONBOARDING_PLANS } from "@/lib/hr-data";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const { department } = await searchParams;
  const active = EMPLOYEES.filter(
    (employee) => employee.status === "active",
  ).length;
  const onLeave = EMPLOYEES.filter(
    (employee) => employee.status === "on_leave",
  ).length;
  const pendingOnboarding = ONBOARDING_PLANS.filter(
    (plan) => plan.status === "in_progress",
  ).length;
  const pendingOffboarding = OFFBOARDINGS.filter(
    (item) => item.status === "in_progress",
  ).length;

  return (
    <>
      <PageHeader
        title="Employees"
        description="Directory of everyone at your company."
      ></PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="size-4" /> Total
            </p>
            <p className="mt-1 text-2xl font-bold">{EMPLOYEES.length}</p>
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
        employees={EMPLOYEES}
        initialDepartment={
          department && department !== "all" ? department : "all"
        }
      />
    </>
  );
}
