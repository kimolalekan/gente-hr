"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarPlus, CheckCircle2, Loader2, Play, Send } from "lucide-react";
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
import {
  createReview,
  formatDate,
  getEmployeeById,
  type Employee,
  type PerformanceReview,
  type PerformanceTemplate,
} from "@/lib/hr-data";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reviews list with "Start review" (template + employee + deadline → email
 * invite) and deadline extension for HR/Admin. Demo state is local.
 */
export function ReviewsManager({
  reviews,
  employees,
  templates,
  reviewer,
  canManage,
}: {
  reviews: PerformanceReview[];
  employees: Employee[];
  templates: PerformanceTemplate[];
  reviewer: string;
  canManage: boolean;
}) {
  const [items, setItems] = useState(reviews);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [deadline, setDeadline] = useState(() => addDays(todayIso(), 14));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!templateId) {
      setError("Choose a template.");
      return;
    }
    if (!employeeId) {
      setError("Choose an employee.");
      return;
    }
    if (deadline < todayIso()) {
      setError("The deadline must be in the future.");
      return;
    }
    const employee = getEmployeeById(employeeId);
    const review = createReview({
      employeeId,
      templateId,
      deadline,
      reviewer,
    });
    setItems((current) => [review, ...current]);
    setSentEmail(employee?.email ?? "");
    setBusy(true);
    // Simulate sending the invite email to the employee.
    window.setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 800);
  };

  const extendDeadline = (id: string) => {
    setItems((current) =>
      current.map((review) =>
        review.id === id
          ? {
              ...review,
              deadline: addDays(review.deadline, 7),
              deadlineExtended: (review.deadlineExtended ?? 0) + 1,
            }
          : review,
      ),
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Reviews</CardTitle>
            <CardDescription>
              Reviews in the current and past cycles.
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={openModal}>
              <Play className="size-4" />
              Start review
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2.5 pr-4 font-medium">Employee</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                  Template
                </th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="hidden px-4 py-2.5 font-medium lg:table-cell">
                  Rating
                </th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="py-2.5 pl-4 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {items.map((review) => {
                const employee = getEmployeeById(review.employeeId);
                const template = templates.find(
                  (item) => item.id === review.templateId,
                );
                return (
                  <tr
                    key={review.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee?.name ?? "—"} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {employee?.name ?? "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee?.role ?? ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {template?.name ?? review.templateId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {formatDate(review.deadline)}
                        </span>
                        {(review.deadlineExtended ?? 0) > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{(review.deadlineExtended ?? 0)} ext
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
                            Extend
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 font-medium lg:table-cell">
                      {review.overall > 0 ? `${review.overall.toFixed(1)} / 5` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={review.status === "submitted" ? "success" : "warning"}
                      >
                        {review.status}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link href={`/performance/${review.id}`}>
                        <Button variant="outline" size="sm">
                          View details
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
        title={sent ? "Review started" : "Start a review"}
        description={
          sent
            ? undefined
            : "Choose a template, the employee and a deadline."
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" form="start-review-form" disabled={busy}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {busy ? "Sending…" : "Start review & email"}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">Review started</p>
              <p className="mt-1 text-sm text-muted-foreground">
                An email invitation was sent to{" "}
                <span className="font-medium text-foreground">{sentEmail}</span>{" "}
                to complete the review by{" "}
                <span className="font-medium text-foreground">
                  {formatDate(deadline)}
                </span>.
              </p>
            </div>
          </div>
        ) : (
          <form id="start-review-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="review-template">Template</Label>
              <Select
                id="review-template"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                placeholder="Select a template…"
              >
                {activeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-employee">Employee</Label>
              <Select
                id="review-employee"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                placeholder="Select an employee…"
              >
                <option value="">Select an employee…</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} — {employee.role}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="review-deadline">Deadline</Label>
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
