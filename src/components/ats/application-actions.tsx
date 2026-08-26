"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  FileCheck2,
  Loader2,
  Search,
  Send,
  UserX,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Popover } from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type ApplicationStage } from "@/lib/hr-data";
import { useLocale } from "@/lib/i18n/use-locale";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/** Forward moves allowed per current stage (hired/rejected handled separately). */
const NEXT_STAGES: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
  new: ["screening"],
  screening: ["interview"],
  interview: ["offer"],
};

const TIME_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
];

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
  const locale = useLocale();
  const { t } = useTranslations();
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
    date: "",
    time: "09:00",
    panelistIds: [] as string[],
  });
  const [offerForm, setOfferForm] = useState({
    salary: "",
    startDate: "",
    terms: "",
  });
  const [rejectNote, setRejectNote] = useState("");

  // Interviewer candidates — active employees fetched from the API.
  const [employees, setEmployees] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [panelSearch, setPanelSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees?status=active&pageSize=500")
      .then((response) => response.json())
      .then((data: { items?: Array<{ id: string; name: string }> }) => {
        if (!cancelled) setEmployees(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setEmployeesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setError(err instanceof Error ? err.message : t("common.error"));
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
    if (!interviewForm.date) {
      setError(t("ats.interview.dateRequired"));
      return;
    }
    const ok = await post(`/api/ats/applications/${applicationId}/interviews`, {
      scheduledAt: new Date(
        `${interviewForm.date}T${interviewForm.time}:00`,
      ).toISOString(),
      panelistIds: interviewForm.panelistIds,
    });
    if (ok) {
      setInterviewOpen(false);
      setInterviewForm({ date: "", time: "09:00", panelistIds: [] });
    }
  };

  const togglePanelist = (id: string) =>
    setInterviewForm((current) => ({
      ...current,
      panelistIds: current.panelistIds.includes(id)
        ? current.panelistIds.filter((value) => value !== id)
        : [...current.panelistIds, id],
    }));

  const selectedPanelists = employees.filter((item) =>
    interviewForm.panelistIds.includes(item.id),
  );

  const panelOptions = employees.filter((item) =>
    item.name.toLowerCase().includes(panelSearch.trim().toLowerCase()),
  );

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
          {t("ats.applications.hire")}
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
            {t("ats.applications.advance", {
              stage: t(
                `statusLabels.applicationStage.${nextStages[0]}` as TranslationKey,
              ),
            })}
          </Button>
        )}
        {canInterview && (
          <Button
            variant="outline"
            onClick={() => setInterviewOpen(true)}
            disabled={busy}
          >
            <CalendarClock className="size-4" />
            {t("ats.applications.scheduleInterview")}
          </Button>
        )}
        {canOffer && (
          <Button
            variant="outline"
            onClick={() => setOfferOpen(true)}
            disabled={busy}
          >
            {t("ats.applications.sendOffer")}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={busy}
          className="text-destructive hover:text-destructive"
        >
          <UserX className="size-4" />
          {t("ats.applications.reject")}
        </Button>
      </div>

      {/* Advance modal */}
      <Modal
        open={advanceOpen}
        onClose={() => setAdvanceOpen(false)}
        title={t("modals.advance.title", {
          stage: advanceForm.stage
            ? t(
                `statusLabels.applicationStage.${advanceForm.stage as ApplicationStage}` as TranslationKey,
              )
            : t("modals.advance.nextStage"),
        })}
        description={t("modals.advance.description")}
        footer={
          <>
            <Button variant="outline" onClick={() => setAdvanceOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="advance-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("modals.advance.move")}
            </Button>
          </>
        }
      >
        <form id="advance-form" onSubmit={handleAdvance} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="advance-stage">{t("modals.advance.stage")}</Label>
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
                  {t(`statusLabels.applicationStage.${next}` as TranslationKey)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advance-note">{t("modals.advance.note")}</Label>
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
              placeholder={t("modals.advance.notePlaceholder")}
            />
          </div>
        </form>
      </Modal>

      {/* Interview modal */}
      <Modal
        open={interviewOpen}
        onClose={() => setInterviewOpen(false)}
        title={t("ats.interview.modalTitle")}
        description={t("ats.interview.modalDescription")}
        footer={
          <>
            <Button variant="outline" onClick={() => setInterviewOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="interview-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarClock className="size-4" />
              )}
              {t("ats.interview.schedule")}
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
            <Label htmlFor="interview-date">{t("ats.interview.date")}</Label>
            <DatePicker
              id="interview-date"
              value={interviewForm.date}
              onChange={(value) =>
                setInterviewForm((current) => ({ ...current, date: value }))
              }
              min={new Date().toISOString().slice(0, 10)}
              placeholder={t("ats.interview.datePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="interview-time">{t("ats.interview.time")}</Label>
            <Select
              id="interview-time"
              value={interviewForm.time}
              onChange={(event) =>
                setInterviewForm((current) => ({
                  ...current,
                  time: event.target.value,
                }))
              }
            >
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {new Date(`2000-01-01T${time}:00`).toLocaleTimeString(
                    locale,
                    {
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  )}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("ats.interview.interviewers")}</Label>
            <Popover
              aria-haspopup="listbox"
              contentClassName="w-72"
              trigger={
                <button
                  type="button"
                  className={cn(
                    "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedPanelists.length === 0 && "text-muted-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {selectedPanelists.length > 0
                        ? selectedPanelists
                            .map((panelist) => panelist.name)
                            .join(", ")
                        : t("ats.interview.interviewersPlaceholder")}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              }
            >
              <div className="p-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label={t("ats.interview.searchInterviewers")}
                    value={panelSearch}
                    onChange={(event) => setPanelSearch(event.target.value)}
                    placeholder={t("ats.interview.searchEmployees")}
                    className="h-8 pl-8"
                    autoFocus
                  />
                </div>
                <div className="mt-1.5 max-h-56 overflow-y-auto">
                  {employeesLoading ? (
                    <p className="px-2.5 py-2 text-sm text-muted-foreground">
                      {t("ats.interview.loadingEmployees")}
                    </p>
                  ) : panelOptions.length === 0 ? (
                    <p className="px-2.5 py-2 text-sm text-muted-foreground">
                      {t("ats.interview.noMatchingEmployees")}
                    </p>
                  ) : (
                    panelOptions.map((item) => {
                      const selected = interviewForm.panelistIds.includes(
                        item.id,
                      );
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => togglePanelist(item.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className="truncate">{item.name}</span>
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input",
                            )}
                          >
                            {selected && <Check className="size-3" />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </Popover>
            <p className="text-xs text-muted-foreground">
              {selectedPanelists.length > 0
                ? t("ats.interview.interviewersHint")
                : t("ats.interview.interviewersOptional")}
            </p>
          </div>
        </form>
      </Modal>

      {/* Offer modal */}
      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title={t("modals.offer.title")}
        description={t("modals.offer.description")}
        footer={
          <>
            <Button variant="outline" onClick={() => setOfferOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="offer-form" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileCheck2 className="size-4" />
              )}
              {t("ats.applications.sendOffer")}
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleOffer} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="offer-salary">
              {t("modals.offer.annualSalary")}
            </Label>
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
              placeholder={t("modals.offer.salaryPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-start">{t("modals.offer.startDate")}</Label>
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
            <Label htmlFor="offer-terms">{t("modals.offer.terms")}</Label>
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
              placeholder={t("modals.offer.termsPlaceholder")}
            />
          </div>
        </form>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t("modals.reject.title")}
        description={t("modals.reject.description")}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              {t("common.cancel")}
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
              {t("ats.applications.reject")}
            </Button>
          </>
        }
      >
        <form id="reject-form" onSubmit={handleReject} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reject-note">{t("modals.reject.reason")}</Label>
            <Textarea
              id="reject-note"
              rows={3}
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              placeholder={t("modals.reject.reasonPlaceholder")}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
