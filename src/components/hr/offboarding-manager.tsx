"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { LogOut, UserMinus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  EXIT_REASON_LABELS,
  formatDate,
  type Employee,
  type ExitReason,
} from "@/lib/hr-data";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Selectable exit-checklist items when starting an offboarding. */
const EXIT_CHECKLIST_NAMES = [
  "Asset return (laptop, phone, ID card)",
  "System access revocation (email, tools)",
  "HR exit formalities",
  "Final settlement processing",
  "Experience letter generation",
];

/** Offboarding list row from GET /api/offboarding. */
export interface OffboardingRow {
  id: string;
  employeeId: string;
  reason: ExitReason;
  lastWorkingDay: string;
  status: "in_progress" | "completed";
  exitInterviewNotes: string | null;
  notes: string | null;
  createdAt: string;
  employeeName: string | null;
  checklistProgress: { done: number; total: number };
}

export function OffboardingManager({
  offboardings,
  employees,
}: {
  offboardings: OffboardingRow[];
  employees: Employee[];
}) {
  const [items, setItems] = useState(offboardings);
  const [open, setOpen] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState<ExitReason>("resignation");
  const [lastWorkingDay, setLastWorkingDay] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [selectedChecklist, setSelectedChecklist] =
    useState<string[]>(EXIT_CHECKLIST_NAMES);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  // Employees without an existing offboarding process.
  const available = useMemo(
    () =>
      employees.filter(
        (employee) => !items.some((item) => item.employeeId === employee.id),
      ),
    [employees, items],
  );

  const inProgress = items.filter(
    (item) => item.status === "in_progress",
  ).length;
  const completed = items.filter((item) => item.status === "completed").length;
  const openChecklistItems = items
    .map((item) => item.checklistProgress)
    .reduce((sum, progress) => sum + (progress.total - progress.done), 0);

  const openModal = () => {
    setError(null);
    setEmployeeId("");
    setNotes("");
    setSelectedChecklist(EXIT_CHECKLIST_NAMES);
    setOpen(true);
  };

  const toggleChecklistItem = (name: string) => {
    setSelectedChecklist((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!employeeId) {
      setError("Select an employee to offboard.");
      return;
    }
    if (selectedChecklist.length === 0) {
      setError("Select at least one checklist item.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/offboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employeeId,
          reason,
          lastWorkingDay,
          checklistNames: selectedChecklist,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      const created = body.data as {
        id: string;
        employeeId: string;
        reason: ExitReason;
        lastWorkingDay: string;
        status: "in_progress" | "completed";
        exitInterviewNotes: string | null;
        notes: string | null;
        createdAt: string;
      };
      const employee = employeesById.get(created.employeeId);
      setItems((current) => [
        {
          ...created,
          employeeName: employee?.name ?? null,
          checklistProgress: { done: 0, total: selectedChecklist.length },
        },
        ...current,
      ]);
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start offboarding.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Active exits
            </p>
            <p className="mt-1 text-2xl font-bold">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-2xl font-bold">{completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Checklist items open
            </p>
            <p className="mt-1 text-2xl font-bold">{openChecklistItems}</p>
          </CardContent>
        </Card>
      </div>

      {error && !open && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Exit processes</CardTitle>
              <CardDescription>Employees leaving the company.</CardDescription>
            </div>
            <Button onClick={openModal}>
              <UserMinus />
              Start offboarding
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">Employee</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Reason
                  </th>
                  <th className="px-4 py-2.5 font-medium">Last working day</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Checklist
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const employee = employeesById.get(item.employeeId);
                  const name = item.employeeName ?? employee?.name ?? "—";
                  const role = employee?.role ?? "";
                  const { done, total } = item.checklistProgress;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {EXIT_REASON_LABELS[item.reason] ?? item.reason}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(item.lastWorkingDay)}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {done}/{total}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === "completed" ? "success" : "warning"
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <Link href={`/offboarding/${item.id}`}>
                          <Button variant="outline" size="sm">
                            View details
                          </Button>
                        </Link>
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
                      No exit processes yet.
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
        title="Start offboarding"
        description="Initiate an exit process for an employee."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="offboarding-form"
              variant="destructive"
              disabled={saving}
            >
              <LogOut />
              {saving ? "Starting…" : "Start offboarding"}
            </Button>
          </>
        }
      >
        <form id="offboarding-form" onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="offboard-employee">Employee</Label>
            <Select
              id="offboard-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="Select an employee…"
            >
              <option value="">Select an employee…</option>
              {available.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} — {employee.role}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="offboard-reason">Exit reason</Label>
              <Select
                id="offboard-reason"
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
              <Label htmlFor="offboard-last-day">Last working day</Label>
              <DatePicker
                id="offboard-last-day"
                value={lastWorkingDay}
                onChange={setLastWorkingDay}
                min={todayIso()}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Offboarding checklist</Label>
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-2">
              {EXIT_CHECKLIST_NAMES.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                >
                  <span>{item}</span>
                  <Switch
                    checked={selectedChecklist.includes(item)}
                    onCheckedChange={() => toggleChecklistItem(item)}
                    aria-label={`Include: ${item}`}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Only the selected items are added to the exit process.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offboard-notes">Notes</Label>
            <Textarea
              id="offboard-notes"
              placeholder="Handover notes, exit interview, reason details…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
