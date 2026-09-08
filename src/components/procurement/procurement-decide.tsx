"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/hr-data";
import type { ProcurementVendor } from "@/lib/procurement";
import { useTranslations } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Approve/decline actions for a pending procurement request (admin/HR only).
 * Approving awards the request to the vendor selected here, persisted via
 * `PATCH /api/procurements/[id]/approve`.
 */
export function ProcurementDecide({
  id,
  vendors,
  status,
}: {
  id: string;
  vendors: ProcurementVendor[];
  status: string;
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "PENDING") return null;

  const decide = async (action: "approve" | "decline") => {
    if (action === "approve" && (selected === null || selected < 0)) {
      setError(t("procurement.approveError"));
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/procurements/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body:
          action === "approve"
            ? JSON.stringify({ vendorIndex: selected })
            : JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!body?.ok) {
        setError(body?.error ?? t("errors.updateFailed"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.updateFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("procurement.approvalCardTitle")}</CardTitle>
        <CardDescription>
          {t("procurement.approvalCardDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">
            {t("procurement.selectVendor")}
          </legend>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("procurement.selectVendorPrompt")}
          </p>
          <div className="space-y-2">
            {vendors.map((vendor, index) => (
              <label
                key={vendor.id ?? `${vendor.name}-${index}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                  selected === index && "border-primary bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="winning-vendor"
                  value={index}
                  checked={selected === index}
                  onChange={() => {
                    setSelected(index);
                    setError(null);
                  }}
                  className="size-4 accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {vendor.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatCurrency(vendor.amount)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="success"
            disabled={busy !== null}
            onClick={() => decide("approve")}
          >
            {busy === "approve" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {t("procurement.approve")}
          </Button>
          <Button
            variant="destructive"
            disabled={busy !== null}
            onClick={() => decide("decline")}
          >
            {busy === "decline" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
            {t("procurement.decline")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
