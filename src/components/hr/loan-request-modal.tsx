"use client";

import { useState, type FormEvent } from "react";
import { HandCoins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  formatCurrency,
  LOAN_TYPE_LABELS,
  type Loan,
  type LoanType,
} from "@/lib/hr-data";

const LOAN_TYPES: LoanType[] = ["personal", "advance", "vehicle", "other"];
const TERM_OPTIONS = [6, 12, 18, 24, 36];

function computeEmi(
  amount: number,
  annualRatePercent: number,
  term: number,
): number {
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return Math.round(amount / term);
  const factor = Math.pow(1 + r, term);
  return Math.round((amount * r * factor) / (factor - 1));
}

/** Shape of a loan row returned by `POST /api/payroll/loans`. */
interface ApiLoanRow {
  id?: string;
  employeeId?: string | null;
  type?: string;
  amount?: number;
  interestRate?: number;
  termMonths?: number;
  monthlyEmi?: number;
  disbursedAt?: string | null;
  paidMonths?: number;
  status?: string;
}

function isLoanType(value: string): value is LoanType {
  return LOAN_TYPES.includes(value as LoanType);
}

function isLoanStatus(value: string): value is Loan["status"] {
  return (
    value === "pending" ||
    value === "approved" ||
    value === "active" ||
    value === "paid"
  );
}

function toLoan(
  row: ApiLoanRow,
  fallback: {
    employeeId: string;
    type: LoanType;
    amount: number;
    interestRate: number;
    termMonths: number;
  },
): Loan {
  const emi =
    typeof row.monthlyEmi === "number"
      ? row.monthlyEmi
      : computeEmi(fallback.amount, fallback.interestRate, fallback.termMonths);
  return {
    id: row.id ?? `ln_${Date.now().toString(36)}`,
    employeeId: row.employeeId ?? fallback.employeeId,
    type: row.type && isLoanType(row.type) ? row.type : fallback.type,
    amount: row.amount ?? fallback.amount,
    interestRate: row.interestRate ?? fallback.interestRate,
    termMonths: row.termMonths ?? fallback.termMonths,
    monthly: emi,
    disbursedAt: row.disbursedAt ?? "",
    paidMonths: row.paidMonths ?? 0,
    status: row.status && isLoanStatus(row.status) ? row.status : "pending",
  };
}

/**
 * Loan request modal for the signed-in employee. Submits to
 * `POST /api/payroll/loans` (self-service; creates a pending request); falls
 * back to local state when the API is unreachable.
 */
export function LoanRequestModal({
  open,
  onClose,
  employeeId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onCreated: (loan: Loan) => void;
}) {
  const [type, setType] = useState<LoanType>("personal");
  const [amount, setAmount] = useState("");
  const [termMonths, setTermMonths] = useState(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interest-free by default — the rate is set during approval, not request.
  const interestRate = 0;
  const amountValue = Math.max(0, Number(amount) || 0);
  const emi =
    amountValue > 0 ? computeEmi(amountValue, interestRate, termMonths) : 0;

  const handleClose = () => {
    setType("personal");
    setAmount("");
    setTermMonths(12);
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (amountValue <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    setError(null);
    const fallback = {
      employeeId,
      type,
      amount: amountValue,
      interestRate,
      termMonths,
    };
    let apiError: string | null = null;
    try {
      const response = await fetch("/api/payroll/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: amountValue,
          interestRate,
          termMonths,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiLoanRow;
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? "Could not submit the request";
        throw new Error(apiError);
      }
      onCreated(toLoan(body.data ?? {}, fallback));
      handleClose();
    } catch {
      if (apiError) {
        setError(apiError);
        return;
      }
      // Fallback: demo state so requesting a loan works without a database.
      onCreated(toLoan({}, fallback));
      handleClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request a loan"
      description="Your request is submitted for approval by the People team."
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="loan-request-form" disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HandCoins className="size-4" />
            )}
            {busy ? "Submitting…" : "Submit request"}
          </Button>
        </>
      }
    >
      <form
        id="loan-request-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="loan-type">Loan type</Label>
          <Select
            id="loan-type"
            value={type}
            onChange={(event) => {
              const next = event.target.value;
              if (isLoanType(next)) setType(next);
            }}
          >
            {LOAN_TYPES.map((option) => (
              <option key={option} value={option}>
                {LOAN_TYPE_LABELS[option]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-amount">Amount</Label>
          <Input
            id="loan-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={amount}
            onChange={(event) =>
              setAmount(event.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="e.g. 5000"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loan-term">Term (months)</Label>
          <Select
            id="loan-term"
            value={String(termMonths)}
            onChange={(event) =>
              setTermMonths(Number(event.target.value) || 12)
            }
          >
            {TERM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} months
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3 text-sm">
          <span className="text-muted-foreground">
            Estimated monthly payment
          </span>
          <span className="font-semibold">
            {emi > 0 ? formatCurrency(emi) : "—"}
          </span>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
