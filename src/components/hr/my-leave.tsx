"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { LeaveRequestModal } from "@/components/hr/leave-request-modal";
import {
  LeaveRequestsTable,
  type LeaveRow,
} from "@/components/hr/leave-requests-table";
import { PageHeader } from "@/components/hr/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Leave balance row as returned by `GET /api/leave/balances`. */
export interface ApiLeaveBalance {
  employeeId: string;
  employeeName?: string | null;
  year: number;
  vacation: { total: number; used: number; remaining: number };
  sick: { total: number; used: number; remaining: number };
  personal: { total: number; used: number; remaining: number };
}

/**
 * Employee (member) leave view — own requests and balances, with a button to
 * request new leave. Keeps the request list in client state so a new request
 * appears immediately.
 */
export function MyLeave({
  employeeId,
  initialRequests,
  balance,
}: {
  employeeId: string;
  initialRequests: LeaveRow[];
  balance?: ApiLeaveBalance | null;
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="My leave"
        description="Your requests and remaining balances."
      >
        <Button onClick={() => setOpen(true)}>
          <CalendarPlus className="size-4" />
          Request leave
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My requests</CardTitle>
            <CardDescription>
              {requests.length === 0
                ? "You haven't requested any leave yet."
                : `${requests.length} request${requests.length === 1 ? "" : "s"} this year.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveRequestsTable requests={requests} readOnly />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <CardDescription>Current year.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {balance ? (
              (["vacation", "sick", "personal"] as const).map((kind) => {
                const entry = balance[kind];
                const remaining = entry.total - entry.used;
                const pct = Math.round((entry.used / entry.total) * 100);
                return (
                  <div key={kind} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">
                        {kind}
                      </span>
                      <span className="font-medium">
                        {remaining} of {entry.total} left
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No balance data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <LeaveRequestModal
        open={open}
        onClose={() => setOpen(false)}
        employeeId={employeeId}
        onCreated={(request) => setRequests((current) => [request, ...current])}
      />
    </>
  );
}
