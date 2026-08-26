"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Play,
  Send,
  Star,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/datepicker";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/lib/i18n/use-locale";
import { useTranslations } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { formatDate } from "@/lib/hr-data";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Review row as returned by `GET /api/performance/reviews`. */
interface ReviewItem {
  id: string;
  employeeId: string;
  employeeName: string | null;
  templateId: string;
  deadline: string | null;
  deadlineExtended: number;
  overall: number | null;
  status: string;
}

/** Row returned by `POST /api/performance/reviews`. */
interface ApiReviewRow {
  id?: string;
  employeeId?: string;
  templateId?: string;
  deadline?: string | null;
  deadlineExtended?: number;
  overall?: number | null;
  status?: string;
}

function toReviewItem(
  row: ApiReviewRow,
  fallback: { employeeId: string; templateId: string; deadline: string },
): ReviewItem {
  return {
    id: row.id ?? `rev_${Date.now().toString(36)}`,
    employeeId: row.employeeId ?? fallback.employeeId,
    employeeName: null,
    templateId: row.templateId ?? fallback.templateId,
    deadline: row.deadline ?? fallback.deadline,
    deadlineExtended: row.deadlineExtended ?? 0,
    overall: row.overall ?? null,
    status: row.status ?? "draft",
  };
}

/**
 * Reviews list with "Start review" (template + employee + deadline → email
 * invite) and deadline extension for HR/Admin. Writes go to the reviews API:
 * `POST /api/performance/reviews` and `PATCH /api/performance/reviews/[id]/deadline`.
 */
export function ReviewsManager({
  reviews,
  employees,
  templates,
  canManage,
}: {
  reviews: ReviewItem[];
  employees: { id: string; name: string; role: string | null }[];
  templates: { id: string; name: string; active: boolean }[];
  canManage: boolean;
}) {
  const locale = useLocale();
  const { t } = useTranslations();
  const [items, setItems] = useState(reviews);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [deadline, setDeadline] = useState(() => addDays(todayIso(), 14));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentName, setSentName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeTemplates = templates.filter((template) => template.active);

  const openModal = () => {
    setTemplateId(activeTemplates[0]?.id ?? "");
    setEmployeeId("");
    setDeadline(addDays(todayIso(), 14));
    setError(null);
    setSent(false);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateId) {
      setError(t("performance.templateRequired"));
      return;
    }
    if (!employeeId) {
      setError(t("performance.employeeRequired"));
      return;
    }
    if (deadline < todayIso()) {
      setError(t("performance.deadlineFuture"));
      return;
    }
    setBusy(true);
    setError(null);
    let apiError: string | null = null;
    const employee = employees.find((item) => item.id === employeeId);
    try {
      const response = await fetch("/api/performance/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, employeeId, deadline }),
      });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: ApiReviewRow;
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? t("performance.startFailed");
        throw new Error(apiError);
      }
      setItems((current) => [
        toReviewItem(body.data ?? {}, { employeeId, templateId, deadline }),
        ...current,
      ]);
      setSentName(employee?.name ?? employeeId);
      setSent(true);
    } catch {
      if (apiError) setError(apiError);
      else setError(t("performance.startFailedRetry"));
    } finally {
      setBusy(false);
    }
  };

  const extendDeadline = async (id: string) => {
    let apiError: string | null = null;
    try {
      const response = await fetch(
        `/api/performance/reviews/${encodeURIComponent(id)}/deadline`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ extraDays: 7 }),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        data?: { deadline?: string | null; deadlineExtended?: number };
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? t("performance.extendFailed");
        throw new Error(apiError);
      }
      setItems((current) =>
        current.map((review) =>
          review.id === id
            ? {
                ...review,
                deadline:
                  body.data?.deadline ??
                  (review.deadline
                    ? addDays(review.deadline, 7)
                    : review.deadline),
                deadlineExtended:
                  body.data?.deadlineExtended ??
                  (review.deadlineExtended ?? 0) + 1,
              }
            : review,
        ),
      );
    } catch {
      if (apiError) setError(apiError);
    }
  };

  const employeeName = (review: ReviewItem) =>
    review.employeeName ??
    employees.find((item) => item.id === review.employeeId)?.name;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{t("performance.reviewsTitle")}</CardTitle>
            <CardDescription>
              {t("performance.reviewsDescription")}
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={openModal}>
              <Play className="size-4" />
              {t("performance.startReview")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2.5 pr-4 font-medium">
                  {t("payroll.payslips.employee")}
                </th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  {t("performance.template")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("performance.due")}
                </th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">
                  {t("performance.rating")}
                </th>
                <th className="px-4 py-2.5 font-medium">
                  {t("common.status")}
                </th>
                <th className="py-2.5 pl-4 text-right font-medium">
                  {t("common.details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((review) => {
                const template = templates.find(
                  (item) => item.id === review.templateId,
                );
                const name = employeeName(review);
                const role = employees.find(
                  (item) => item.id === review.employeeId,
                )?.role;
                return (
                  <tr
                    key={review.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={name ?? "—"} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name ?? "—"}</p>
                          {role && (
                            <p className="truncate text-xs text-muted-foreground">
                              {role}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {template?.name ?? review.templateId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {review.deadline
                            ? formatDate(review.deadline.slice(0, 10), locale)
                            : "—"}
                        </span>
                        {(review.deadlineExtended ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {t("performance.extendedShort", {
                              n: review.deadlineExtended ?? 0,
                            })}
                          </Badge>
                        )}
                        {canManage && review.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => extendDeadline(review.id)}
                          >
                            <CalendarPlus className="size-3" />
                            {t("leave.extend")}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 font-medium lg:table-cell">
                      {(review.overall ?? 0) > 0
                        ? `${review.overall?.toFixed(1)} / 5`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          review.status === "submitted" ? "success" : "warning"
                        }
                      >
                        {t(
                          `statusLabels.review.${review.status}` as TranslationKey,
                        )}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/performance/${review.id}`}>
                        <Button variant="outline" size="sm">
                          {t("common.viewDetails")}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          sent
            ? t("performance.reviewStarted")
            : t("performance.startReviewTitle")
        }
        description={sent ? undefined : t("performance.startReviewDescription")}
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>{t("common.done")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="start-review-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {busy ? t("common.sending") : t("performance.startAndEmail")}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">{t("performance.reviewStarted")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("performance.inviteEmailSentWithDeadline", {
                  name: sentName,
                  date: formatDate(deadline, locale),
                })}
              </p>
            </div>
          </div>
        ) : (
          <form id="start-review-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="review-template">
                {t("performance.template")}
              </Label>
              <Select
                id="review-template"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                placeholder={t("performance.selectTemplate")}
              >
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-employee">
                {t("payroll.payslips.employee")}
              </Label>
              <Select
                id="review-employee"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder={t("performance.selectEmployee")}
              >
                <option value="">{t("performance.selectEmployee")}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} — {employee.role ?? ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-deadline">
                {t("performance.deadline")}
              </Label>
              <DatePicker
                id="review-deadline"
                value={deadline}
                onChange={setDeadline}
                min={todayIso()}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </Modal>
    </Card>
  );
}

/**
 * Rating + feedback submitter shown on the review detail page.
 * - Member (`canManage=false`): submits their self-review via
 *   `PATCH /api/performance/reviews/[id]`.
 * - Manager (`canManage=true`): submits the manager rating via
 *   `PATCH /api/performance/reviews/[id]/manager`.
 */
export function ReviewFeedbackButton({
  reviewId,
  canManage,
  rating,
  strengths,
  growth,
  submitted,
}: {
  reviewId: string;
  canManage: boolean;
  rating: number | null;
  strengths: string | null;
  growth: string | null;
  submitted: boolean;
}) {
  const { t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [strengthsValue, setStrengthsValue] = useState("");
  const [growthValue, setGrowthValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setValue(rating != null ? String(rating) : "");
    setStrengthsValue(strengths ?? "");
    setGrowthValue(growth ?? "");
    setSaved(false);
    setError(null);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
      setError(t("performance.ratingError"));
      return;
    }
    setBusy(true);
    setError(null);
    let apiError: string | null = null;
    try {
      const response = await fetch(
        canManage
          ? `/api/performance/reviews/${encodeURIComponent(reviewId)}/manager`
          : `/api/performance/reviews/${encodeURIComponent(reviewId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            canManage
              ? {
                  managerRating: parsed,
                  strengths: strengthsValue.trim() || undefined,
                  growth: growthValue.trim() || undefined,
                }
              : {
                  selfRating: parsed,
                  strengths: strengthsValue.trim() || undefined,
                  growth: growthValue.trim() || undefined,
                },
          ),
        },
      );
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!body?.ok) {
        apiError = body?.error ?? t("performance.feedbackFailed");
        throw new Error(apiError);
      }
      setSaved(true);
      // Re-fetch the detail page so ratings/status reflect the save.
      router.refresh();
      window.setTimeout(() => setOpen(false), 1000);
    } catch {
      if (apiError) setError(apiError);
      else setError(t("performance.feedbackFailedRetry"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant={submitted ? "outline" : "default"} onClick={openModal}>
        <Star className="size-4" />
        {canManage
          ? submitted
            ? t("performance.editReview")
            : t("performance.submitFeedback")
          : t("performance.submitSelfReview")}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          saved
            ? t("performance.feedbackSaved")
            : canManage
              ? t("performance.managerFeedback")
              : t("performance.selfReview")
        }
        description={saved ? undefined : t("performance.feedbackDescription")}
        footer={
          saved ? (
            <Button onClick={() => setOpen(false)}>{t("common.done")}</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="review-feedback-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {busy ? t("common.saving") : t("performance.saveFeedback")}
              </Button>
            </>
          )
        }
      >
        {saved ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">{t("performance.feedbackSaved")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("performance.feedbackSavedDescription")}
              </p>
            </div>
          </div>
        ) : (
          <form
            id="review-feedback-form"
            onSubmit={submit}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="review-rating">{t("performance.rating")}</Label>
              <Select
                id="review-rating"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={t("performance.selectRating")}
              >
                {[1, 2, 3, 4, 5].map((number) => (
                  <option key={number} value={String(number)}>
                    {number} / 5
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-strengths">
                {t("performance.strengths")}
              </Label>
              <Textarea
                id="review-strengths"
                value={strengthsValue}
                onChange={(event) => setStrengthsValue(event.target.value)}
                placeholder={t("performance.strengthsPlaceholder")}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-growth">{t("performance.growth")}</Label>
              <Textarea
                id="review-growth"
                value={growthValue}
                onChange={(event) => setGrowthValue(event.target.value)}
                placeholder={t("performance.growthPlaceholder")}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </Modal>
    </>
  );
}
