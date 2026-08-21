"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/hr-data";

export interface PayrollPreview {
  period: string;
  employees: number;
  gross: number;
  deductions: number;
  net: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Run payroll: shows a preview of the next period (derived from salaries and
 * loans) and asks for an email to send the payroll PDF to. Demo only — no
 * backend; simulates processing and shows a sent confirmation.
 */
export function RunPayrollButton({ preview }: { preview: PayrollPreview }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setEmail("");
    setError(null);
    setSent(false);
    setOpen(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email to receive the payroll PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    // Simulate processing + email delivery; wire to a payroll API route later.
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 900);
  };

  return (
    <>
      <Button onClick={openModal}>
        <Wallet className="size-4" />
        Run payroll
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={sent ? "Payroll sent" : "Run payroll"}
        description={
          sent ? undefined : `Preview ${preview.period} before processing.`
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="run-payroll-form"
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wallet className="size-4" />
                )}
                {busy ? "Processing…" : "Run payroll & send PDF"}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">Payroll queued</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The {preview.period} payroll PDF was emailed to{" "}
                <span className="font-medium text-foreground">{email}</span>.
              </p>
            </div>
          </div>
        ) : (
          <form id="run-payroll-form" onSubmit={submit} className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {preview.period} preview
              </div>
              <div className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium">{preview.employees}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Gross</span>
                  <span className="font-medium">
                    {formatCurrency(preview.gross)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="font-medium">
                    −{formatCurrency(preview.deductions)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-background/50 px-4 py-2.5">
                  <span className="font-medium">Net total</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(preview.net)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payroll-email">Email the payroll PDF to</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="payroll-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="finance@company.com"
                  className="pl-9"
                  autoFocus
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </Modal>
    </>
  );
}
