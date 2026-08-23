"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatAddress,
  type Employee,
  type EmployeeAddress,
  type EmployeeStatus,
} from "@/lib/hr-data";

/** Directory statuses — the API can also return "inactive" (archived). */
type DirectoryStatus = EmployeeStatus | "inactive";

interface DirectoryEmployee {
  id: string;
  name: string;
  email: string;
  role: string | null;
  department: string | null;
  address: EmployeeAddress | null;
  status: DirectoryStatus;
  joinedAt: string;
  salary: number;
  manager: string | null;
  phone: string | null;
}

const STATUS_LABELS: Record<
  DirectoryStatus,
  { label: string; variant: "success" | "warning" | "info" | "secondary" }
> = {
  active: { label: "Active", variant: "success" },
  on_leave: { label: "On leave", variant: "warning" },
  pending: { label: "Pending onboarding", variant: "info" },
  inactive: { label: "Archived", variant: "secondary" },
};

function toDirectoryEmployee(employee: Employee): DirectoryEmployee {
  return {
    ...employee,
    department: employee.department ?? "",
    role: employee.role ?? "",
    manager: employee.manager ?? "",
    phone: employee.phone ?? "",
  };
}

/** Read-only employee directory: search, filter and row actions. */
export function EmployeeDirectory({
  employees,
  userRole,
  initialDepartment = "all",
}: {
  employees: Employee[];
  userRole?: "admin" | "hr" | "member" | null;
  initialDepartment?: string;
}) {
  const [items] = useState<DirectoryEmployee[]>(() =>
    employees.map(toDirectoryEmployee),
  );
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(initialDepartment);

  const departments = useMemo(
    () =>
      Array.from(new Set(items.map((employee) => employee.department ?? "")))
        .filter(Boolean)
        .sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((employee) => {
      const matchesQuery =
        !q ||
        employee.name.toLowerCase().includes(q) ||
        employee.email.toLowerCase().includes(q) ||
        (employee.role ?? "").toLowerCase().includes(q);
      const matchesDepartment =
        department === "all" || employee.department === department;
      return matchesQuery && matchesDepartment;
    });
  }, [items, query, department]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email or role…"
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by department"
          className="sm:w-56"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="all">All departments</option>
          {departments.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Department
                </th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Location
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => {
                const status = STATUS_LABELS[employee.status];
                return (
                  <tr
                    key={employee.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {employee.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {employee.role ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {employee.department ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {formatAddress(employee.address) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/employees/${employee.id}`}>
                          <Button variant="outline" size="sm">
                            View details
                          </Button>
                        </Link>
                        {userRole !== "member" && (
                          <Link href={`/employees/${employee.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No employees match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {items.length} employees
      </p>
    </div>
  );
}
