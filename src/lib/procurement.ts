/**
 * Procurement domain types + validation, shared by the Drizzle schema, API
 * routes and UI pages.
 *
 * Money follows the Gente convention of whole currency units (integers), like
 * loans/payroll. Vendor documents reference a `files` row id
 * (`GET /api/files/[id]`).
 */

export interface ProcurementVendor {
  id?: string;
  name: string;
  amount: number;
  doc?: string | null;
}

/** Status values are stored uppercase (API contract). */
export type ProcurementStatus = "PENDING" | "APPROVED" | "DECLINED";

export const PROCUREMENT_STATUSES: readonly ProcurementStatus[] = [
  "PENDING",
  "APPROVED",
  "DECLINED",
];

export function isProcurementStatus(
  value: unknown,
): value is ProcurementStatus {
  return value === "PENDING" || value === "APPROVED" || value === "DECLINED";
}

/** Person info nested in API responses (employee or approver user). */
export interface ProcurementPerson {
  id: string;
  name: string;
  email: string;
}

/** Request row returned by `GET /api/procurements*`. */
export interface Procurement {
  id: string;
  title: string;
  description?: string | null;
  vendors: ProcurementVendor[];
  approvedVendorIndex?: number | null;
  status: ProcurementStatus;
  requestedById: string;
  approvedById?: string | null;
  requestedBy?: ProcurementPerson | null;
  approvedBy?: ProcurementPerson | null;
  createdAt: string;
  updatedAt: string;
}

/** Split a display name ("Marco Rossi") into first/last parts. */
export function splitDisplayName(name: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = name.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1).trim(),
  };
}

const MAX_TITLE = 200;
const MAX_DESC = 2000;
const MAX_VENDORS = 25;
const MAX_VENDOR_NAME = 160;
const MAX_DOC_REF = 200;

/**
 * Validate untrusted vendor payloads from `POST /api/procurements`. Returns
 * the cleaned list or a user-facing `error` message.
 */
export function sanitizeVendors(
  input: unknown,
): { ok: true; vendors: ProcurementVendor[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: "Vendors must be an array of quotes" };
  }
  if (input.length === 0) {
    return { ok: false, error: "At least one vendor is required" };
  }
  if (input.length > MAX_VENDORS) {
    return { ok: false, error: "Too many vendors — keep it under 25 quotes" };
  }

  const vendors: ProcurementVendor[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") {
      return {
        ok: false,
        error: "Every vendor must be an object with a name and amount",
      };
    }
    const entry = raw as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) return { ok: false, error: "Every vendor needs a name" };
    if (name.length > MAX_VENDOR_NAME) {
      return {
        ok: false,
        error: `Vendor names must be ${MAX_VENDOR_NAME} characters or fewer`,
      };
    }

    const amount = Math.round(Number(entry.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false,
        error: `"${name}" must have a positive amount`,
      };
    }

    let doc: string | null = null;
    if (typeof entry.doc === "string" && entry.doc.trim()) {
      doc = entry.doc.trim();
      if (doc.length > MAX_DOC_REF) {
        return { ok: false, error: "Vendor document reference is too long" };
      }
    }

    vendors.push({ name, amount, doc });
  }
  return { ok: true, vendors };
}

/** Validate the title/description of a procurement request. */
export function sanitizeText(input: {
  title: unknown;
  description?: unknown;
}):
  | { ok: true; title: string; description: string | null }
  | { ok: false; error: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { ok: false, error: "Title is required" };
  if (title.length > MAX_TITLE) {
    return {
      ok: false,
      error: `Title must be ${MAX_TITLE} characters or fewer`,
    };
  }
  let description: string | null = null;
  if (typeof input.description === "string" && input.description.trim()) {
    description = input.description.trim().slice(0, MAX_DESC);
  }
  return { ok: true, title, description };
}
