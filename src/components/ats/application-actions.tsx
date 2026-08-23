"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CalendarClock,
  FileCheck2,
  Loader2,
  Send,
  UserX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/hr-data";

/** Forward moves allowed per current stage (hired/rejected handled separately). */
const NEXT_STAGES: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  new: ["screening"],
  screening: ["interview"],
  interview: ["offer"],
};

interface Props {
  applicationId: string;
  stage: ApplicationStage;
  employee: { id: string; name: string } | null;
}

/**
 * Pipeline actions for an application: advance stage, schedule interviews,
 * send offers, hire (hand-off to onboarding) or reject. All PATCH/POST the
 * `/api/ats/*` routes and refresh the page.
 */
export function ApplicationActions({ applicationId, stage, employee }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [advanceForm, setAdvanceForm] = useState({
    stage: NEXT_STAGES[stage]?.[0] ?? "",
    note: "",
  });
  const [interviewForm, setInterviewForm] = useState({
    scheduledAt: "",
    interviewer: "",
  });
  const [offerForm, setOfferForm] = useState({
    salary: "",
    startDate: "",
    terms: "",
  });
  const [rejectNote, setRejectNote] = useState("");

  const terminal = stage === "hired" || stage === "rejected";

  const post = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data?.ok) {
        throw new Error(data?.error ?? `Request failed (${response.status})`);
      }
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAdvance = async (event: FormEvent) => {
    event.preventDefault();
    if (!advanceForm.stage) return;
    const ok = await post(`/api/ats/applications/${applicationId}/stage`, {
      stage: advanceForm.stage,
      note: advanceForm.note.trim() || undefined,
    });
    if (ok) {
      setAdvanceOpen(false);
      setAdvanceForm({ stage: "", note: "" });
    }
  };

  const handleInterview = async (event: FormEvent) => {
    event.preventDefault();
    if (!interviewForm.scheduledAt) {
      setError("A scheduled date/time is required.");
      return;
    }
    const ok = await post(
      `/api/ats/applications/${applicationId}/interviews`,
      {
        scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
        interviewer: interviewForm.interviewer.trim() || undefined,
      },
    );
    if (ok) {
      setInterviewOpen(false);
      setInterviewForm({ scheduledAt: "", interviewer: "" });
    }
  };

  const handleOffer = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await post(`/api/ats/applications/${applicationId}/offer`, {
      salary: offerForm.salary ? Number(offerForm.salary) : undefined,
      startDate: offerForm.startDate || undefined,
      terms: offerForm.terms.trim() || undefined,
    });
    if (ok) {
      setOfferOpen(false);
      setOfferForm({ salary: "", startDate: "", terms: "" });
    }
  };

  const handleReject = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await post(`/api/ats/applications/${applicationId}/reject`, {
      note: rejectNote.trim() || undefined,
    });
    if (ok) {
      setRejectOpen(false);
      setRejectNote("");
    }
  };

  const handleHire = async () => {
    const ok = await post(`/api/ats/applications/${applicationId}/hire`, {
      note: "Hired",
    });
    if (ok) setError(null);
  };

  if (terminal) {
    return null;
  }

  const nextStages = NEXT_STAGES[stage] ?? [];
  const canInterview = stage === "screening" || stage === "interview";
  const canOffer = stage === "interview" || stage === "offer";

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {stage === "offer" && !employee && (
        <Button className="w-full" onClick={handleHire} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileCheck2 className="size-4" />
          )}
          Hire — hand off to onboarding
        </Button>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {nextStages.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setAdvanceOpen(true)}
            disabled={busy}
          >
            <Send className="size-4" />
            Advance to {APPLICATION_STAGE_LABELS[nextStages[0]]}
          </Button>
        )}
        {canInterview && (
          <Button
            variant="outline"
            onClick={() => setInterviewOpen(true)}
            disabled={busy}
          >
            <CalendarClock className="size-4" />
            Schedule interview
          </Button>
        )}
        {canOffer && (
          <Button
            variant="outline"
            onClick={() => setOfferOpen(true)}
            disabled={busy}
          >
            Send offer
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={busy}
          className="text-destructive hover:text-destructive"
        >
          <UserX className="size-4" />
          Reject
        </Button>
      </div>

      {/* Advance modal */}
      <Modal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title={`Move to ${advanceForm.stage ? APPLICATION_STAGE_LABELS[advanceForm.stage as ApplicationStage] : "next stage"}`}
        description="Record the stage change and any recruiter notes."
        footer={
          <>
            <Button variant="outline" onClick={() => setAdvanceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="advance-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Move candidate
            </Button>
          </>
        }
      >
        <form id="advance-form" onSubmit={handleAdvance} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="advance-stage">Stage</Label>
            <Select
              id="advance-stage"
              value={advanceForm.stage}
              onChange={(event) =>
                setAdvanceForm((current) => ({
                  ...current,
                  stage: event.target.value,
                }))
              }
            >
              {nextStages.map((next) => (
                <option key={next} value={next}>
                  {APPLICATION_STAGE_LABELS[next]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advance-note">Note</Label>
            <Textarea
              id="advance-note"
              rows={3}
              value={advanceForm.note}
              onChange={(event) =>
                setAdvanceForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              placeholder="Shortlisted for interview…"
            />
          </div>
        </form>
      </Modal>

      {/* Interview modal */}
      <Modal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        title="Schedule interview"
        description="Add an interview round for this candidate."
        footer={
          <>
            <Button variant="outline" onClick={() => setInterviewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="interview-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              Schedule
            </Button>
          </>
        }
      >
        <form
          id="interview-form"
          onSubmit={handleInterview}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="interview-date">Date &amp; time</Label>
            <Input
              id="interview-date"
              type="datetime-local"
              value={interviewForm.scheduledAt}
              onChange={(event) =>
                setInterviewForm((current) => ({
                  ...current,
                  scheduledAt: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interview-interviewer">Interviewer</Label>
            <Input
              id="interview-interviewer"
              value={interviewForm.interviewer}
              onChange={(event) =>
                setInterviewForm((current) => ({
                  ...current,
                  interviewer: event.target.value,
                }))
              }
              placeholder="e.g. Chiamaka Obi"
            />
          </div>
        </form>
      </Modal>

      {/* Offer modal */}
      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title="Send offer"
        description="Record the offer terms for the candidate."
        footer={
          <>
            <Button variant="outline" onClick={() => setOfferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="offer-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCheck2 className="size-4" />
              )}
              Send offer
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleOffer} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="offer-salary">Annual salary</Label>
            <Input
              id="offer-salary"
              type="number"
              min={0}
              value={offerForm.salary}
              onChange={(event) =>
                setOfferForm((current) => ({
                  ...current,
                  salary: event.target.value,
                }))
              }
              placeholder="e.g. 72000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-start">Start date</Label>
            <Input
              id="offer-start"
              type="date"
              value={offerForm.startDate}
              onChange={(event) =>
                setOfferForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-terms">Terms</Label>
            <Textarea
              id="offer-terms"
              rows={4}
              value={offerForm.terms}
              onChange={(event) =>
                setOfferForm((current) => ({
                  ...current,
                  terms: event.target.value,
                }))
              }
              placeholder="Equity, benefits, probation, etc."
            />
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject candidate"
        description="This moves the application to Rejected."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="reject-form"
              variant="destructive"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Reject
            </Button>
          </>
        }
      >
        <form
          id="reject-form"
          onSubmit={handleReject}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">Reason / note</Label>
            <Textarea
              id="reject-note"
              rows={3}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder="Optional feedback or reason…"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
