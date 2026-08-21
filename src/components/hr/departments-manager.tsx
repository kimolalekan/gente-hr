"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, Save, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import type { Department, Employee } from "@/lib/hr-data";

const PAGE_SIZE = 8;

interface DepartmentsManagerProps {
  departments: Department[];
  employees: Employee[];
}

/**
 * Departments list: search, pagination, add, edit and disable/enable. Demo
 * state is local — wire to the `departments` table (Drizzle) later.
 */
export function DepartmentsManager({
  departments,
  employees,
}: DepartmentsManagerProps) {
  const [list, setList] = useState<Department[]>(departments);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const employee of employees) {
      map.set(employee.department, (map.get(employee.department) ?? 0) + 1);
    }
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        department.description.toLowerCase().includes(q),
    );
  }, [list, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const toggleActive = (id: string) => {
    setList((current) =>
      current.map((department) =>
        department.id === id
          ? { ...department, active: !department.active }
          : department,
      ),
    );
  };

  const openAddModal = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (department: Department) => {
    setEditing(department);
    setName(department.name);
    setDescription(department.description);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("A department name is required.");
      return;
    }
    if (
      list.some(
        (department) =>
          department.id !== editing?.id &&
          department.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError("A department with that name already exists.");
      return;
    }
    if (editing) {
      setList((current) =>
        current.map((department) =>
          department.id === editing.id
            ? {
                ...department,
                name: trimmed,
                description: description.trim(),
              }
            : department,
        ),
      );
    } else {
      setList((current) => [
        {
          id: `dept_${Date.now().toString(36)}`,
          name: trimmed,
          description: description.trim(),
          active: true,
        },
        ...current,
      ]);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or description…"
            className="pl-9"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={openAddModal}>
          <Plus className="size-4" />
          Add department
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Employees
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((department) => {
                const count = counts.get(department.name) ?? 0;
                return (
                  <tr
                    key={department.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {department.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {department.description || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {count} {count === 1 ? "member" : "members"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={department.active ? "success" : "secondary"}
                      >
                        {department.active ? "Active" : "Disabled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(department)}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {department.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(department.id)}
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => toggleActive(department.id)}
                          >
                            Enable
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No departments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
          departments
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit department" : "Add department"}
        description={
          editing
            ? `Update ${editing.name} — name and description.`
            : "Create a new department for your organization."
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="department-form">
              {editing ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {editing ? "Save changes" : "Add department"}
            </Button>
          </>
        }
      >
        <form
          id="department-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Customer Success"
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-description">Description</Label>
            <Textarea
              id="dept-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What does this department do?"
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
