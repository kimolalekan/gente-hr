"use client";

import { useState } from "react";
import { Ban, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeaveRequest, LeaveStatus } from "@/lib/hr-data";

/**
 * Approve / Reject / Cancel actions for a leave request. Only shown while
 * the request is pending ("active"); once decided, it explains the outcome.
 */
export function LeaveRequestActions({ request }: { request: LeaveRequest }) {
  const [status, setStatus] = useState<LeaveStatus>(request.status);

  if (status !== "pending") {
    return (
      <div className="rounded-lg border border-border bg-background/50 p-3 text-sm">
        <p className="text-muted-foreground">
          This request has been{" "}
          <span className="font-medium capitalize text-foreground">
            {status}
          </span>
          . No further actions are available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="success"
        className="w-full"
        onClick={() => setStatus("approved")}
      >
        <Check className="size-4" />
        Approve
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="destructive"
          onClick={() => setStatus("declined")}
        >
          <X className="size-4" />
          Reject
        </Button>
        <Button variant="outline" onClick={() => setStatus("cancelled")}>
          <Ban className="size-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
