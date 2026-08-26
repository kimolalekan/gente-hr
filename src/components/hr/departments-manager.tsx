"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Building2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "@/lib/i18n/provider";

const PAGE_SIZE = 8;

/** API department row — the list endpoint adds an employee headcount. */
interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  employees?: number;
}

interface DepartmentsManagerProps {
  departments: DepartmentRow[];
}

/**
 * Departments list: search, pagination, add, edit, disable/enable and delete.
 * All mutations go to `/api/departments` and the list is refetched afterwards.
 */
export function DepartmentsManager({ departments }: DepartmentsManagerProps) {
  const { t } = useTranslations();
  const [list, setList] = useState<DepartmentRow[]>(departments);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/departments?pageSize=500", {
      cache: "no-store",
    });
    const body = await response.json();
    if (!body?.ok) {
      throw new Error(body?.error ?? `Request failed (${response.status})`);
    }
    setList(body.data.items ?? []);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        (department.description ?? "").toLowerCase().includes(q),
    );
  }, [list, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const openAddModal = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (department: DepartmentRow) => {
    setEditing(department);
    setName(department.name);
    setDescription(department.description ?? "");
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("settings.departments.nameRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        editing ? `/api/departments/${editing.id}` : "/api/departments",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            description: description.trim(),
          }),
        },
      );
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settings.departments.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (department: DepartmentRow) => {
    setBusyId(department.id);
    setError(null);
    try {
      const response = await fetch(`/api/departments/${department.id}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: !department.active }),
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settings.departments.updateFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (department: DepartmentRow) => {
    setBusyId(department.id);
    setError(null);
    try {
      const response = await fetch(`/api/departments/${department.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!body?.ok) {
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("settings.departments.deleteFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("settings.departments.searchPlaceholder")}
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
          {t("settings.departments.newDepartment")}
        </Button>
      </div>

      {error && !modalOpen && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">
                  {t("employees.department")}
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  {t("payroll.employees")}
                </th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-right font-medium">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((department) => {
                const count = department.employees ?? 0;
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
                        {department.active
                          ? t("settings.departments.active")
                          : t("settings.departments.disabled")}
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
                          {t("common.edit")}
                        </Button>
                        {department.active ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(department)}
                            disabled={busyId === department.id}
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => toggleActive(department)}
                            disabled={busyId === department.id}
                          >
                            Enable
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => remove(department)}
                          disabled={busyId === department.id}
                          aria-label={`Delete ${department.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
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
            {t("common.previous")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("common.pageOf", { current: safePage, total: pageCount })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={
          editing
            ? t("settings.departments.editDepartment")
            : t("settings.departments.newDepartment")
        }
        description={
          editing
            ? t("settings.departments.editDescription", {
                name: editing.name,
              })
            : t("settings.departments.addDescription")
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="department-form" disabled={saving}>
              {editing ? (
                <Save className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
              {saving
                ? t("common.saving")
                : editing
                  ? t("settings.branding.saveChanges")
                  : t("settings.departments.newDepartment")}
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
            <Label htmlFor="dept-name">{t("common.name")}</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("settings.departments.namePlaceholder")}
              autoFocus
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-description">{t("common.description")}</Label>
            <Textarea
              id="dept-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("settings.departments.descriptionPlaceholder")}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
