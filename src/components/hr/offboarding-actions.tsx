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
import { EXIT_REASON_LABELS, type ExitReason } from "@/lib/hr-data";

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
      const response = await fetch(`/api/offboarding/${offboarding.id}/complete`, {
        method: "POST",
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to complete the exit process.",
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
        err instanceof Error ? err.message : "Failed to update the exit process.",
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
            Edit details
          </Button>
        )}
        {!completed && (
          <Button variant="success" onClick={complete} disabled={busy}>
            <CheckCircle2 className="size-4" />
            {busy ? "Completing…" : "Complete exit"}
          </Button>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Edit exit details"
        description="Update the reason, last working day and notes."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" form="offboarding-edit-form" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
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
              <Label htmlFor="offboard-edit-reason">Exit reason</Label>
              <Select
                id="offboard-edit-reason"
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value as ExitReason)
                }
              >
                {(Object.keys(EXIT_REASON_LABELS) as ExitReason[]).map(
                  (item) => (
                    <option key={item} value={item}>
                      {EXIT_REASON_LABELS[item]}
                    </option>
                  ),
                )}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offboard-edit-last-day">Last working day</Label>
              <DatePicker
                id="offboard-edit-last-day"
                value={lastWorkingDay}
                onChange={setLastWorkingDay}
                min={todayIso()}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-edit-notes">Notes</Label>
            <Textarea
              id="offboard-edit-notes"
              placeholder="Handover notes, reason details…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-edit-interview">Exit interview notes</Label>
            <Textarea
              id="offboard-edit-interview"
              placeholder="Key takeaways from the exit interview…"
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
