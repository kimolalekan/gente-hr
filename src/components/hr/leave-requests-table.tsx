"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarPlus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  formatDate,
  getEmployee,
  LEAVE_TYPE_LABELS,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/hr-data";

const STATUS_VARIANT: Record<
  LeaveStatus,
  "success" | "warning" | "destructive" | "secondary"
> = {
  approved: "success",
  pending: "warning",
  declined: "destructive",
  cancelled: "secondary",
};

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Leave requests table with actions: approve, extend (adds days to the end
 * date) and cancel. Demo state is local — wire to the leaves table later.
 */
export function LeaveRequestsTable({ requests }: { requests: LeaveRequest[] }) {
  const [items, setItems] = useState(requests);
  const [extending, setExtending] = useState<LeaveRequest | null>(null);
  const [extraDays, setExtraDays] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateStatus = (id: string, status: LeaveStatus) => {
    setItems((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    );
  };

  const openExtend = (request: LeaveRequest) => {
    setExtending(request);
    setExtraDays("");
    setError(null);
  };

  const submitExtend = (event: FormEvent) => {
    event.preventDefault();
    if (!extending) return;
    const days = Math.round(Number(extraDays));
    if (!Number.isFinite(days) || days < 1 || days > 60) {
      setError("Enter a number of days between 1 and 60.");
      return;
    }
    setItems((current) =>
      current.map((request) =>
        request.id === extending.id
          ? {
              ...request,
              end: addDays(request.end, days),
              days: request.days + days,
            }
          : request,
      ),
    );
    setExtending(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2.5 pr-4 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Dates</th>
              <th className="px-4 py-2.5 font-medium">Days</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="py-2.5 pl-4 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((request) => {
              const employee = getEmployee(request.employeeId);
              const actionable =
                request.status === "pending" || request.status === "approved";
              return (
                <tr
                  key={request.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {employee?.name ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {employee?.role ?? ""}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {LEAVE_TYPE_LABELS[request.type]}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(request.start)} → {formatDate(request.end)}
                  </td>
                  <td className="px-4 py-3">{request.days}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[request.status]}>
                      {request.status}
                    </Badge>
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/leave/${request.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {actionable && (
                        <>
                          {request.status === "pending" && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() =>
                                updateStatus(request.id, "approved")
                              }
                            >
                              <Check className="size-3.5" />
                              Approve
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openExtend(request)}
                          >
                            <CalendarPlus className="size-3.5" />
                            Extend
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateStatus(request.id, "cancelled")
                            }
                          >
                            <X className="size-3.5" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={extending !== null}
        onClose={() => setExtending(null)}
        title="Extend leave"
        description={
          extending
            ? `${formatDate(extending.start)} → ${formatDate(extending.end)} · ${extending.days} days`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setExtending(null)}>
              Cancel
            </Button>
            <Button type="submit" form="extend-leave-form">
              <CalendarPlus className="size-4" />
              Extend leave
            </Button>
          </>
        }
      >
        <form
          id="extend-leave-form"
          onSubmit={submitExtend}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="extend-days">Additional days</Label>
            <Input
              id="extend-days"
              type="number"
              min={1}
              max={60}
              value={extraDays}
              onChange={(event) => setExtraDays(event.target.value)}
              placeholder="e.g. 3"
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">
              The end date and day count are updated by this amount.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
