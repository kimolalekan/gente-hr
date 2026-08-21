"use client";

import { useState, type FormEvent } from "react";
import { Building2, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  DEPARTMENTS,
  formatCurrency,
  formatDate,
  type Employee,
  type EmployeeStatus,
} from "@/lib/hr-data";

const STATUS_META: Record<
  EmployeeStatus,
  { label: string; variant: "success" | "warning" | "info" }
> = {
  active: { label: "Active", variant: "success" },
  on_leave: { label: "On leave", variant: "warning" },
  pending: { label: "Pending onboarding", variant: "info" },
};

const STATUS_OPTIONS: Array<{ value: EmployeeStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "pending", label: "Pending onboarding" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tenureYears(joinedAt: string): number {
  const joined = new Date(`${joinedAt}T00:00:00`).getFullYear();
  const years = new Date().getFullYear() - joined;
  return Math.max(1, years);
}

/**
 * Editable employee profile: header + contact + employment, with an edit
 * modal for name, email, role, department, location, manager, salary, status
 * and join date. Demo state is local — wire to the `employees` table later.
 */
export function EmployeeProfileCard({ employee: initial }: { employee: Employee }) {
  const [employee, setEmployee] = useState(initial);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    phone: initial.phone,
    role: initial.role,
    department: initial.department,
    location: initial.location,
    manager: initial.manager,
    salary: String(initial.salary),
    status: initial.status,
    joinedAt: initial.joinedAt,
  });

  const status = STATUS_META[employee.status];

  const openModal = () => {
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      department: employee.department,
      location: employee.location,
      manager: employee.manager,
      salary: String(employee.salary),
      status: employee.status,
      joinedAt: employee.joinedAt,
    });
    setError(null);
    setOpen(true);
  };

  const update =
    (key: keyof typeof form) =>
    (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name) {
      setError("Full name is required.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setEmployee((current) => ({
      ...current,
      name,
      email,
      phone: form.phone.trim(),
      role: form.role.trim(),
      department: form.department,
      location: form.location.trim(),
      manager: form.manager.trim(),
      salary: Math.max(0, Number(form.salary) || 0),
      status: form.status,
      joinedAt: form.joinedAt,
    }));
    setOpen(false);
  };

  const years = tenureYears(employee.joinedAt);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={employee.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {employee.name}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {employee.role} · {employee.department}
          </p>
        </div>
        <Button variant="outline" onClick={openModal}>
          <Pencil className="size-4" />
          Edit profile
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                How to reach {employee.name.split(" ")[0]}.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                {employee.email}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                {employee.phone}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {employee.location}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <UserRound className="size-4 shrink-0" />
                Reports to {employee.manager}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment</CardTitle>
              <CardDescription>Contract details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="mt-1 font-medium">
                  {formatDate(employee.joinedAt)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Tenure</p>
                <p className="mt-1 font-medium">
                  {years} year{years === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Annual base salary
                </p>
                <p className="mt-1 font-medium">
                  {formatCurrency(employee.salary)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background/50 p-3">
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {employee.department}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit employee"
        description={`Update ${employee.name.split(" ")[0]}'s details.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="edit-employee-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={update("name")}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={update("email")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Input
                id="edit-role"
                value={form.role}
                onChange={update("role")}
                placeholder="e.g. Head of Engineering"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                id="edit-department"
                value={form.department}
                onChange={update("department")}
                placeholder="Select a department…"
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={update("phone")}
                placeholder="+44 20 7946 0958"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={form.location}
                onChange={update("location")}
                placeholder="e.g. London"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-manager">Manager</Label>
              <Input
                id="edit-manager"
                value={form.manager}
                onChange={update("manager")}
                placeholder="Reports to…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-salary">Annual base salary (USD)</Label>
              <Input
                id="edit-salary"
                type="number"
                min={0}
                value={form.salary}
                onChange={update("salary")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                id="edit-status"
                value={form.status}
                onChange={update("status")}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-joined">Joined date</Label>
              <DatePicker
                id="edit-joined"
                value={form.joinedAt}
                onChange={(value) =>
                  setForm((current) => ({ ...current, joinedAt: value }))
                }
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
