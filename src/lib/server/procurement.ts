/**
 * Server-side helpers for the procurement API: turn joined DB rows into the
 * `Procurement` response shape. Kept out of `@/lib/procurement.ts` so client
 * components can import the shared types without pulling in Drizzle types.
 */
import "server-only";
import {
  isProcurementStatus,
  splitDisplayName,
  type Procurement,
  type ProcurementStatus,
  type ProcurementVendor,
} from "@/lib/procurement";
import type { ProcurementRequestRow } from "@db/schema";

interface PersonRow {
  id: string;
  name: string;
  email: string;
}

/**
 * Build the API `Procurement` shape from a DB row + optional joined person
 * rows. Dates are serialized to ISO strings for a stable client contract.
 */
export function toProcurement(input: {
  row: ProcurementRequestRow;
  requester?: PersonRow | null;
  approver?: PersonRow | null;
}): Procurement {
  const { row, requester, approver } = input;
  const created = row.createdAt.toISOString();
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    vendors: (row.vendors ?? []) as ProcurementVendor[],
    approvedVendorIndex: row.approvedVendorIndex,
    status: isProcurementStatus(row.status) ? row.status : "PENDING",
    requestedById: row.requestedById,
    approvedById: row.approvedById,
    requestedBy: requester
      ? {
          ...splitDisplayName(requester.name),
          id: requester.id,
          name: requester.name,
          email: requester.email,
        }
      : null,
    approvedBy: approver
      ? { id: approver.id, name: approver.name, email: approver.email }
      : null,
    createdAt: created,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : created,
  };
}

export function isPending(
  status: string | undefined | null,
): status is ProcurementStatus {
  return status === "PENDING";
}
