"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { FileUp, LogOut, Paperclip, UserMinus } from "lucide-react";
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
  createOffboarding,
  EXIT_CHECKLIST,
  EXIT_REASON_LABELS,
  formatDate,
  getEmployeeById,
  type Employee,
  type ExitReason,
  type Offboarding,
} from "@/lib/hr-data";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OffboardingManager({
  offboardings,
  employees,
}: {
  offboardings: Offboarding[];
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
  const [terminationLetter, setTerminationLetter] = useState<string>();
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>(
    EXIT_CHECKLIST.map((item) => item.name),
  );
  const [error, setError] = useState<string | null>(null);

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
    .flatMap((item) => item.checklist)
    .filter((item) => !item.done).length;

  const openModal = () => {
    setError(null);
    setTerminationLetter(undefined);
    setSelectedChecklist(EXIT_CHECKLIST.map((item) => item.name));
    setOpen(true);
  };

  const toggleChecklistItem = (name: string) => {
    setSelectedChecklist((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!employeeId) {
      setError("Select an employee to offboard.");
      return;
    }
    if (selectedChecklist.length === 0) {
      setError("Select at least one checklist item.");
      return;
    }
    const item = createOffboarding(
      employeeId,
      reason,
      lastWorkingDay,
      selectedChecklist,
      notes.trim() || undefined,
      terminationLetter,
    );
    setItems((current) => [item, ...current]);
    setOpen(false);
    setEmployeeId("");
    setNotes("");
    setError(null);
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
                  const employee = getEmployeeById(item.employeeId);
                  const done = item.checklist.filter(
                    (entry) => entry.done,
                  ).length;
                  return (
                    <tr
                      key={item.id}
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
                        {EXIT_REASON_LABELS[item.reason]}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(item.lastWorkingDay)}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {done}/{item.checklist.length}
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start offboarding"
        description="Initiate an exit process for an employee."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="offboarding-form" variant="destructive">
              <LogOut />
              Start offboarding
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
          <div className="space-y-1.5">
            <Label htmlFor="offboard-termination">Termination letter</Label>
            <label
              htmlFor="offboard-termination"
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background/50 px-3 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <FileUp className="size-4 shrink-0 text-muted-foreground" />
              {terminationLetter ? (
                <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                  <Paperclip className="size-3.5 shrink-0 text-primary" />
                  {terminationLetter}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Attach the termination letter (PDF)
                </span>
              )}
              <input
                id="offboard-termination"
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(event) =>
                  setTerminationLetter(event.target.files?.[0]?.name)
                }
              />
            </label>
          </div>
          <div className="space-y-2">
            <Label>Offboarding checklist</Label>
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-2">
              {EXIT_CHECKLIST.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                >
                  <span>{item.name}</span>
                  <Switch
                    checked={selectedChecklist.includes(item.name)}
                    onCheckedChange={() => toggleChecklistItem(item.name)}
                    aria-label={`Include: ${item.name}`}
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
