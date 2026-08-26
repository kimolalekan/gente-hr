"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { ExitReason } from "@/lib/hr-data";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Exit-process actions on the offboarding detail page: mark the process
 * complete (`POST /api/offboarding/[id]/complete`) and edit the exit details
 * (`PATCH /api/offboarding/[id]`). Both refresh the server page afterwards.
 */
export function OffboardingActions({
  offboarding,
}: {
  offboarding: {
    id: string;
    status: string;
    reason: string;
    lastWorkingDay: string;
    notes: string | null;
    exitInterviewNotes: string | null;
  };
}) {
  const router = useRouter();
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reason, setReason] = useState<ExitReason>(
    offboarding.reason as ExitReason,
  );
  const [lastWorkingDay, setLastWorkingDay] = useState(
    offboarding.lastWorkingDay,
  );
  const [notes, setNotes] = useState(offboarding.notes ?? "");
  const [exitInterviewNotes, setExitInterviewNotes] = useState(
    offboarding.exitInterviewNotes ?? "",
  );

  const completed = offboarding.status === "completed";

  const openModal = () => {
    setReason(offboarding.reason as ExitReason);
    setLastWorkingDay(offboarding.lastWorkingDay);
    setNotes(offboarding.notes ?? "");
    setExitInterviewNotes(offboarding.exitInterviewNotes ?? "");
    setError(null);
    setOpen(true);
  };

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/offboarding/${offboarding.id}/complete`,
        {
          method: "POST",
        },
      );
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("offboarding.completeFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/offboarding/${offboarding.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason,
          lastWorkingDay,
          notes: notes.trim() || undefined,
          exitInterviewNotes: exitInterviewNotes.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("offboarding.updateFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!completed && (
          <Button variant="outline" onClick={openModal} disabled={busy}>
            <Pencil className="size-4" />
            {t("offboarding.editDetails")}
          </Button>
        )}
        {!completed && (
          <Button variant="success" onClick={complete} disabled={busy}>
            <CheckCircle2 className="size-4" />
            {busy
              ? t("offboarding.completing")
              : t("offboarding.completeProcess")}
          </Button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={t("offboarding.editExitDetails")}
        description={t("offboarding.editExitDescription")}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="offboarding-edit-form" disabled={busy}>
              {busy ? t("common.saving") : t("settings.branding.saveChanges")}
            </Button>
          </>
        }
      >
        <form
          id="offboarding-edit-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="offboard-edit-reason">
                {t("offboarding.reason")}
              </Label>
              <Select
                id="offboard-edit-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as ExitReason)
                }
              >
                {(
                  [
                    "resignation",
                    "termination",
                    "retirement",
                    "contract_end",
                  ] as ExitReason[]
                ).map((item) => (
                  <option key={item} value={item}>
                    {t(`statusLabels.exitReason.${item}` as TranslationKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offboard-edit-last-day">
                {t("offboarding.lastWorkingDay")}
              </Label>
              <DatePicker
                id="offboard-edit-last-day"
                value={lastWorkingDay}
                onChange={setLastWorkingDay}
                min={todayIso()}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-edit-notes">{t("common.notes")}</Label>
            <Textarea
              id="offboard-edit-notes"
              placeholder={t("offboarding.notesPlaceholder")}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-edit-interview">
              {t("offboarding.exitInterviewNotes")}
            </Label>
            <Textarea
              id="offboard-edit-interview"
              placeholder={t("offboarding.exitInterviewPlaceholder")}
              value={exitInterviewNotes}
              onChange={(event) => setExitInterviewNotes(event.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
