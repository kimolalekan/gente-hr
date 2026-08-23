"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Employee, EmployeeStatus } from "@/lib/hr-data";
import {
  formatCurrency,
  mergeSalaryBreakdown,
  salaryGross,
  SALARY_KEYS,
  type PayrollBreakdown,
} from "@/lib/hr-data";
import { COUNTRY_NAMES, REGIONS, getStatesFor } from "@/lib/regions";
import { cn } from "@/lib/utils";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  optional,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </Label>
      <Input id={id} {...props} />
    </div>
  );
}

const STATUS_OPTIONS: Array<{ value: EmployeeStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "pending", label: "Pending onboarding" },
];

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Raw employee row as returned by `GET /api/employees/:id`. */
export interface EditableEmployee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  address: Record<string, unknown> | null;
  managerId: string | null;
  managerName: string | null;
  joinDate: string | null;
  employmentType: string;
  status: string;
  bankDetails: Record<string, unknown> | null;
  governmentId: Record<string, unknown> | null;
  emergencyContact: Record<string, unknown> | null;
  healthInsurance: Record<string, unknown> | null;
  pension: Record<string, unknown> | null;
  taxId: string | null;
  /** Salary breakdown amounts keyed by payroll component (annual). */
  salary: Record<string, number> | null;
  salaryGross: number | null;
}

/**
 * Full employee edit page: employment basics plus the profile field groups
 * (bank account, government ID, emergency contact, tax ID, health coverage
 * and pension). Saving PATCHes `/api/employees/[id]` (admin/HR only).
 */
export function EmployeeEditForm({
  employee,
  managerOptions,
  departments,
  payrollBreakdown,
}: {
  employee: EditableEmployee;
  /** Full employee list — used to resolve the manager picker. */
  managerOptions: Employee[];
  /** Active department names for the department picker. */
  departments: string[];
  /** Configured payslip breakdown — drives the salary breakdown inputs. */
  payrollBreakdown: PayrollBreakdown;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bank = asObject(employee.bankDetails);
  const gov = asObject(employee.governmentId);
  const contact = asObject(employee.emergencyContact);
  const coverage = asObject(employee.healthInsurance);
  const pension = asObject(employee.pension);
  const address = asObject(employee.address);
  const savedSalary = mergeSalaryBreakdown(employee.salary);

  const [form, setForm] = useState(() => ({
    name: employee.name,
    email: employee.email,
    phone: employee.phone ?? "",
    designation: employee.designation ?? "",
    department: employee.department ?? "",
    address: asString(address.address),
    state: asString(address.state),
    country: asString(address.country),
    managerId: employee.managerId ?? "",
    employmentType: employee.employmentType || "full_time",
    status: employee.status === "inactive" ? "active" : employee.status,
    joinedAt: employee.joinDate ?? "",
    salary: Object.fromEntries(
      SALARY_KEYS.map((key) => [
        key,
        savedSalary[key] > 0 ? String(savedSalary[key]) : "",
      ]),
    ) as Record<string, string>,
    bankName: asString(bank.bankName),
    accountNumber: asString(bank.accountNumber),
    accountName: asString(bank.accountName),
    swift: asString(bank.swift),
    routing: asString(bank.routing),
    idName: asString(gov.idName),
    idValue: asString(gov.idValue),
    ecName: asString(contact.name),
    ecEmail: asString(contact.email),
    ecPhone: asString(contact.phone),
    taxId: employee.taxId ?? "",
    insProvider: asString(coverage.provider),
    insId: asString(coverage.id),
    insContactName: asString(coverage.contactName),
    insContactEmail: asString(coverage.contactEmail),
    pensionProvider: asString(pension.provider),
    pensionId: asString(pension.id),
  }));

  const update =
    (key: keyof typeof form) => (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [key]: event.target.value }));

  const updateSalary =
    (key: string) => (event: { target: { value: string } }) =>
      setForm((current) => ({
        ...current,
        salary: { ...current.salary, [key]: event.target.value },
      }));

  const managers = managerOptions.filter(
    (item) => item.id !== employee.id && String(item.status) !== "inactive",
  );

  const handleSubmit = async (event: FormEvent) => {
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

    const payload: Record<string, unknown> = {
      name,
      email,
      phone: form.phone.trim() || undefined,
      designation: form.designation.trim() || undefined,
      department: form.department || undefined,
      address: {
        address: form.address.trim() || undefined,
        state: form.state.trim() || undefined,
        country: form.country.trim() || undefined,
      },
      managerId: form.managerId || null,
      employmentType: form.employmentType,
      status: form.status,
      joinDate: form.joinedAt || undefined,
      salary: (() => {
        const breakdown: Record<string, number> = {};
        for (const key of SALARY_KEYS) {
          const value = Number(form.salary[key] ?? "");
          breakdown[key] =
            Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
        }
        // Leave salary untouched when every field is empty.
        return Object.values(breakdown).some((value) => value > 0)
          ? breakdown
          : undefined;
      })(),
      bankDetails: {
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        swift: form.swift,
        routing: form.routing,
      },
      governmentId: { idName: form.idName, idValue: form.idValue },
      emergencyContact: {
        name: form.ecName,
        email: form.ecEmail,
        phone: form.ecPhone,
      },
      taxId: form.taxId.trim() || undefined,
      healthInsurance: {
        provider: form.insProvider,
        id: form.insId,
        contactName: form.insContactName,
        contactEmail: form.insContactEmail,
      },
      pension: {
        provider: form.pensionProvider,
        id: form.pensionId,
      },
    };

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/employees/${employee.id}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit {employee.name.split(" ")[0]}&apos;s details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Employment record and profile fields — saved to the employee file.
          </p>
        </div>
        <Button type="submit" form="employee-edit-form" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <form
        id="employee-edit-form"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section
            title="Employment"
            description="Role, department and contract details."
          >
            <Field
              id="edit-name"
              label="Full name"
              value={form.name}
              onChange={update("name")}
              required
            />
            <Field
              id="edit-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={update("email")}
              required
            />
            <Field
              id="edit-phone"
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={update("phone")}
              placeholder="+44 20 7946 0958"
            />
            <Field
              id="edit-designation"
              label="Role"
              value={form.designation}
              onChange={update("designation")}
              placeholder="e.g. Head of Engineering"
            />
            <div className="space-y-1.5">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                id="edit-department"
                value={form.department}
                onChange={update("department")}
                placeholder="Select a department…"
              >
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </Select>
            </div>
            <Field
              id="edit-address"
              label="Address"
              className="sm:col-span-2"
              value={form.address}
              onChange={update("address")}
              placeholder="Street, building…"
            />
            <div className="space-y-1.5">
              <Label htmlFor="edit-country">Country</Label>
              <Select
                id="edit-country"
                value={form.country}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    country: event.target.value,
                    state: "",
                  }))
                }
                placeholder="Select a country…"
                searchPlaceholder="Search countries…"
                renderOption={(option) => {
                  const region = REGIONS.find(
                    (item) => item.name === option.value,
                  );
                  return region ? <CountryFlag code={region.iso2} /> : null;
                }}
              >
                {COUNTRY_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-state">State</Label>
              {(() => {
                const states = getStatesFor(form.country);
                if (states.length === 0) {
                  return (
                    <Input
                      id="edit-state"
                      value={form.state}
                      onChange={update("state")}
                      placeholder={
                        form.country
                          ? "No states listed — type if needed"
                          : "Select a country first…"
                      }
                      disabled={!form.country}
                    />
                  );
                }
                return (
                  <Select
                    id="edit-state"
                    value={form.state}
                    onChange={update("state")}
                    placeholder="Select a state…"
                    searchPlaceholder="Search states…"
                  >
                    {states.map((state) => (
                      <option key={state.stateCode} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </Select>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-manager">Manager</Label>
              <Select
                id="edit-manager"
                value={form.managerId}
                onChange={update("managerId")}
                placeholder="No manager"
              >
                <option value="">No manager</option>
                {managers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-employment-type">Employment type</Label>
              <Select
                id="edit-employment-type"
                value={form.employmentType}
                onChange={update("employmentType")}
              >
                {EMPLOYMENT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section
            title="Salary breakdown"
            description="Annual amounts per component — used to generate monthly payslips."
          >
            {(["earnings", "deductions"] as const).map((section) => {
              const components = payrollBreakdown[section].filter(
                (component) => component.enabled,
              );
              if (components.length === 0) return null;
              return (
                <div
                  key={section}
                  className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:col-span-2">
                    {section === "earnings" ? "Earnings" : "Deductions"}
                  </p>
                  {components.map((component) => (
                    <div key={component.key} className="space-y-1.5">
                      <Label htmlFor={`edit-salary-${component.key}`}>
                        {component.label}
                      </Label>
                      <Input
                        id={`edit-salary-${component.key}`}
                        type="number"
                        min={0}
                        value={form.salary[component.key] ?? ""}
                        onChange={updateSalary(component.key)}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2.5 text-sm sm:col-span-2">
              <span className="text-muted-foreground">Annual gross</span>
              <span className="font-semibold">
                {formatCurrency(salaryGross(mergeSalaryBreakdown(form.salary)))}
              </span>
            </div>
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section title="Bank account" description="Where salary is paid.">
            <Field
              id="edit-bank-name"
              label="Bank name"
              value={form.bankName}
              onChange={update("bankName")}
              placeholder="e.g. Chase"
            />
            <Field
              id="edit-account-number"
              label="Account number"
              value={form.accountNumber}
              onChange={update("accountNumber")}
              placeholder="e.g. 12345678"
            />
            <Field
              id="edit-account-name"
              label="Account name"
              value={form.accountName}
              onChange={update("accountName")}
              placeholder="Name on the account"
            />
            <Field
              id="edit-swift"
              label="Swift number"
              optional
              value={form.swift}
              onChange={update("swift")}
              placeholder="e.g. CHASUS33"
            />
            <Field
              id="edit-routing"
              label="Routing number"
              optional
              value={form.routing}
              onChange={update("routing")}
              placeholder="e.g. 021000021"
            />
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section
            title="Government ID"
            description="Official identification document."
          >
            <Field
              id="edit-id-name"
              label="ID name"
              value={form.idName}
              onChange={update("idName")}
              placeholder="e.g. National ID"
            />
            <Field
              id="edit-id-value"
              label="ID value"
              value={form.idValue}
              onChange={update("idValue")}
              placeholder="e.g. ID number"
            />
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section
            title="Emergency contact"
            description="Who to contact in an emergency."
          >
            <Field
              id="edit-ec-name"
              label="Name"
              value={form.ecName}
              onChange={update("ecName")}
              placeholder="e.g. Jane Doe"
            />
            <Field
              id="edit-ec-email"
              label="Email"
              type="email"
              value={form.ecEmail}
              onChange={update("ecEmail")}
              placeholder="jane@example.com"
            />
            <Field
              id="edit-ec-phone"
              label="Phone"
              type="tel"
              value={form.ecPhone}
              onChange={update("ecPhone")}
              placeholder="+44 20 7946 0958"
            />
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section title="Tax ID" description="Tax ID or number.">
            <Field
              id="edit-tax-id"
              label="Tax ID / Number"
              value={form.taxId}
              onChange={update("taxId")}
              placeholder="e.g. TIN number"
            />
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section
            title="Health Coverage"
            description="Provider details or policy file."
          >
            <Field
              id="edit-ins-provider"
              label="Provider name"
              value={form.insProvider}
              onChange={update("insProvider")}
              placeholder="e.g. Bupa"
            />
            <Field
              id="edit-ins-id"
              label="Insurance ID"
              value={form.insId}
              onChange={update("insId")}
              placeholder="e.g. Policy number"
            />
            <Field
              id="edit-ins-contact-name"
              label="Contact name"
              value={form.insContactName}
              onChange={update("insContactName")}
              placeholder="e.g. Alex Smith"
            />
            <Field
              id="edit-ins-contact-email"
              label="Contact email"
              type="email"
              value={form.insContactEmail}
              onChange={update("insContactEmail")}
              placeholder="alex@bupa.com"
            />
          </Section>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-card p-5">
          <Section title="Pension" description="Retirement savings provider.">
            <Field
              id="edit-pension-provider"
              label="Provider name"
              value={form.pensionProvider}
              onChange={update("pensionProvider")}
              placeholder="e.g. Stanbic IBTC Pension"
            />
            <Field
              id="edit-pension-id"
              label="Pension ID"
              value={form.pensionId}
              onChange={update("pensionId")}
              placeholder="e.g. RSA number"
            />
          </Section>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
