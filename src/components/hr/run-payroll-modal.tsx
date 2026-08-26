"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/hr-data";
import { useTranslations } from "@/lib/i18n/provider";

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
 * loans) and asks for an email to send the payroll PDF to. Submits to
 * `POST /api/payroll/runs` and refreshes the runs list on success.
 */
export function RunPayrollButton({ preview }: { preview: PayrollPreview }) {
  const { t } = useTranslations();
  const router = useRouter();
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t("payroll.invalidEmail"));
      return;
    }
    setBusy(true);
    setError(null);
    let apiError: string | null = null;
    try {
      const response = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: preview.period, email: trimmed }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? t("payroll.runFailed");
        throw new Error(apiError);
      }
      setSent(true);
      // Re-fetch the payroll page so the new run appears in the list.
      router.refresh();
    } catch {
      if (apiError) setError(apiError);
      else setError(t("payroll.runFailedRetry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button onClick={openModal}>
        <Wallet className="size-4" />
        {t("payroll.runPayroll")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={sent ? t("payroll.sentTitle") : t("payroll.runPayroll")}
        description={
          sent
            ? undefined
            : t("payroll.previewDescription", { period: preview.period })
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>{t("common.done")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="run-payroll-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wallet className="size-4" />
                )}
                {busy ? t("common.processing") : t("payroll.runAndSend")}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">{t("payroll.queued")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("payroll.emailedTo", {
                  period: preview.period,
                  email,
                })}
              </p>
            </div>
          </div>
        ) : (
          <form id="run-payroll-form" onSubmit={submit} className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("payroll.previewTitle", { period: preview.period })}
              </div>
              <div className="divide-y divide-border text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">
                    {t("payroll.employees")}
                  </span>
                  <span className="font-medium">{preview.employees}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">
                    {t("payroll.gross")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(preview.gross)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">
                    {t("payroll.deductions")}
                  </span>
                  <span className="font-medium">
                    −{formatCurrency(preview.deductions)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-background/50 px-4 py-2.5">
                  <span className="font-medium">
                    {t("payroll.payslips.netTotal")}
                  </span>
                  <span className="font-bold text-primary">
                    {formatCurrency(preview.net)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payroll-email">{t("payroll.emailTo")}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="payroll-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("payroll.emailPlaceholder")}
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
