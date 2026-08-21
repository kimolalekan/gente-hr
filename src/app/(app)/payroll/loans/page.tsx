import Link from "next/link";
import { HandCoins, Hourglass, Landmark } from "lucide-react";
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
import {
  formatCurrency,
  getEmployeeById,
  LOANS,
  LOAN_TYPE_LABELS,
} from "@/lib/hr-data";

export const metadata = { title: "Loans" };

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "secondary"
> = {
  paid: "success",
  active: "info",
  approved: "secondary",
  pending: "warning",
};

export default function LoansPage() {
  const outstanding = LOANS.filter((loan) => loan.status === "active").reduce(
    (sum, loan) => sum + (loan.amount - loan.paidMonths * loan.monthly),
    0,
  );
  const active = LOANS.filter((loan) => loan.status === "active").length;

  return (
    <>
      <PageHeader
        title="Loans"
        description="Employee loans, advances and repayment."
      ></PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <HandCoins className="size-4" /> Active loans
            </p>
            <p className="mt-1 text-2xl font-bold">{active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Landmark className="size-4" /> Outstanding balance
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {formatCurrency(outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Hourglass className="size-4" /> Pending approval
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {LOANS.filter((loan) => loan.status === "pending").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All loans</CardTitle>
          <CardDescription>Approved, active and repaid loans.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Employee</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Type
                  </th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    EMI
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Remaining
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {LOANS.map((loan) => {
                  const employee = getEmployeeById(loan.employeeId);
                  const remaining = Math.max(
                    0,
                    loan.amount - loan.paidMonths * loan.monthly,
                  );
                  return (
                    <tr
                      key={loan.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee?.name ?? "—"} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {employee?.name ?? "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {employee?.role ?? ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {LOAN_TYPE_LABELS[loan.type]}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {formatCurrency(loan.monthly)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {loan.status === "paid"
                          ? "$0"
                          : formatCurrency(remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[loan.status]}>
                          {loan.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/payroll/loans/${loan.id}`}>
                          <Button variant="outline" size="sm">
                            View details
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
