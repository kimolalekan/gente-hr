"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Send, UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import {
  getOnboardingProgress,
  type Employee,
  type OnboardingPlan,
} from "@/lib/hr-data";

function progressOf(plan: OnboardingPlan): number {
  if (plan.tasks.length === 0) return 0;
  return getOnboardingProgress(plan);
}

export function OnboardingManager({
  plans,
  employees,
}: {
  plans: OnboardingPlan[];
  employees: Employee[];
}) {
  const [items, setItems] = useState(plans);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const employeeEmails = useMemo(
    () => new Set(employees.map((employee) => employee.email.toLowerCase())),
    [employees],
  );

  const inProgress = items.filter(
    (plan) => plan.status === "in_progress",
  ).length;
  const invited = items.filter((plan) => plan.status === "invited").length;
  const openTasks = items
    .flatMap((plan) => plan.tasks)
    .filter((task) => task.status !== "completed").length;

  const openModal = () => {
    setFullName("");
    setEmail("");
    setError(null);
    setSent(false);
    setInviteLink(null);
    setNotice(null);
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!trimmedEmail) {
      setError("An email is required so the invite can be sent.");
      return;
    }
    if (employeeEmails.has(trimmedEmail)) {
      setError("Someone with that email already works at the company.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: trimmedEmail,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      const plan = body.data as OnboardingPlan & { inviteLink?: string };
      setItems((current) => [
        {
          id: plan.id,
          employeeId: plan.employeeId ?? "",
          fullName: plan.fullName,
          email: plan.email,
          phone: plan.phone ?? "",
          address: plan.address ?? "",
          state: plan.state ?? "",
          country: plan.country ?? "",
          signedOfferLetter: plan.signedOfferLetter,
          startDate: plan.startDate,
          targetDate: plan.targetDate,
          status: plan.status,
          tasks: [],
        },
        ...current,
      ]);
      setInviteLink(plan.inviteLink ?? null);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send the invite.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resend = async (plan: OnboardingPlan) => {
    setBusyId(plan.id);
    setError(null);
    try {
      const response = await fetch(`/api/onboarding/${plan.id}/resend`, {
        method: "POST",
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setNotice(`Invite re-sent to ${plan.email}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to re-send the invite.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Invited</p>
            <p className="mt-1 text-2xl font-bold text-info">{invited}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Active plans
            </p>
            <p className="mt-1 text-2xl font-bold">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Tasks open
            </p>
            <p className="mt-1 text-2xl font-bold">{openTasks}</p>
          </CardContent>
        </Card>
      </div>

      {error && !open && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && !open && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {notice}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Onboarding</CardTitle>
              <CardDescription>
                Invites for people who don&apos;t have an account yet — the rest
                of their details are collected from the emailed link.
              </CardDescription>
            </div>
            <Button onClick={openModal}>
              <UserPlus />
              New onboarding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">New hire</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Phone
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Country
                  </th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((plan) => {
                  const progress = progressOf(plan);
                  return (
                    <tr
                      key={plan.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={plan.fullName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {plan.fullName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {plan.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {plan.phone || "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {plan.country || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            plan.status === "completed"
                              ? "success"
                              : plan.status === "in_progress"
                                ? "info"
                                : "secondary"
                          }
                        >
                          {plan.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {plan.status !== "completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resend(plan)}
                              disabled={busyId === plan.id}
                            >
                              <Send className="size-3.5" />
                              Resend
                            </Button>
                          )}
                          <Link href={`/onboarding/${plan.id}`}>
                            <Button variant="outline" size="sm">
                              View details
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No onboarding plans yet — invite your first new hire.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title={sent ? "Invite sent" : "Invite a new hire"}
        description={
          sent
            ? undefined
            : "They don't have an account yet — they'll receive an email with a link to complete the rest of their details."
        }
        footer={
          sent ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" form="onboarding-form" disabled={saving}>
                <Send />
                {saving ? "Sending…" : "Send invite"}
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <div>
              <p className="font-semibold">Invite sent</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fullName} will receive an email at{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                with a link to fill in the remaining details.
              </p>
            </div>
            {inviteLink && (
              <Link href={inviteLink}>
                <Button variant="outline" size="sm">
                  Preview the employee form
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <form id="onboarding-form" onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="onboard-name">Full name</Label>
                <Input
                  id="onboard-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Ada Lovelace"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboard-email">Email</Label>
                <Input
                  id="onboard-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ada@company.com"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              The employee fills in the remaining details (phone, address,
              state, country, bank, ID, tax ID, health coverage and pension)
              from the emailed link.
            </p>
          </form>
        )}
      </Modal>
    </>
  );
}
