"use client";

import { useState } from "react";
import Link from "next/link";
import { HandCoins, Hourglass, Landmark } from "lucide-react";
import { DateRangePicker } from "@/components/hr/date-range-picker";
import { LoanRequestModal } from "@/components/hr/loan-request-modal";
import { PageHeader } from "@/components/hr/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, LOAN_TYPE_LABELS, type Loan } from "@/lib/hr-data";

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "info" | "secondary"
> = {
  paid: "success",
  active: "info",
  approved: "secondary",
  pending: "warning",
};

/**
 * Employee (member) loans view — their own loans, with a button to request a
 * new one. Keeps the list in client state so a request appears immediately.
 */
export function MyLoans({
  employeeId,
  initialLoans,
  from,
  to,
}: {
  employeeId: string;
  initialLoans: Loan[];
  from: string;
  to: string;
}) {
  const [loans, setLoans] = useState(initialLoans);
  const [open, setOpen] = useState(false);

  const outstanding = loans
    .filter((loan) => loan.status === "active")
    .reduce(
      (sum, loan) => sum + (loan.amount - loan.paidMonths * loan.monthly),
      0,
    );
  const active = loans.filter((loan) => loan.status === "active").length;
  const pending = loans.filter((loan) => loan.status === "pending").length;

  return (
    <>
      <PageHeader
        title="My loans"
        description="Your loans, advances and repayment."
      >
        <DateRangePicker from={from} to={to} />
        <Button onClick={() => setOpen(true)}>
          <HandCoins className="size-4" />
          Request loan
        </Button>
      </PageHeader>

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
            <p className="mt-1 text-2xl font-bold text-warning">{pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My loans</CardTitle>
          <CardDescription>
            {loans.length === 0
              ? "No loans on file yet."
              : "Your approved, active and repaid loans."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No loans yet — use &quot;Request loan&quot; to apply.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2.5 pr-4 font-medium">Type</th>
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
                  {loans.map((loan) => {
                    const remaining = Math.max(
                      0,
                      loan.amount - loan.paidMonths * loan.monthly,
                    );
                    return (
                      <tr
                        key={loan.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">
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
          )}
        </CardContent>
      </Card>

      <LoanRequestModal
        open={open}
        onClose={() => setOpen(false)}
        employeeId={employeeId}
        onCreated={(loan) => setLoans((current) => [loan, ...current])}
      />
    </>
  );
}
