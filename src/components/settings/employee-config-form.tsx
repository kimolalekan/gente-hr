"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Save, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface FieldDef {
  id: string;
  label: string;
  /** Always optional (e.g. Swift / routing numbers) — no required toggle. */
  fixedOptional?: boolean;
}

interface GroupDef {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
}

const GROUPS: GroupDef[] = [
  {
    id: "bank",
    title: "Bank account",
    description: "Where salary is paid.",
    fields: [
      { id: "bank_name", label: "Bank name" },
      { id: "account_number", label: "Account number" },
      { id: "account_name", label: "Account name" },
      { id: "swift", label: "Swift number", fixedOptional: true },
      { id: "routing", label: "Routing number", fixedOptional: true },
    ],
  },
  {
    id: "government_id",
    title: "Government ID",
    description: "Official identification document.",
    fields: [
      { id: "id_name", label: "ID name" },
      { id: "id_value", label: "ID value" },
    ],
  },
  {
    id: "emergency_contact",
    title: "Emergency contact",
    description: "Who to contact in an emergency.",
    fields: [
      { id: "name", label: "Name" },
      { id: "email", label: "Email" },
      { id: "phone", label: "Phone" },
    ],
  },
  {
    id: "tax",
    title: "Tax ID",
    description: "Tax ID or number.",
    fields: [{ id: "tax_id", label: "Tax ID / Number" }],
  },
  {
    id: "health_insurance",
    title: "Health Coverage",
    description: "Provider details or policy file — managed by HR.",
    fields: [
      { id: "provider", label: "Provider name" },
      { id: "insurance_id", label: "Insurance ID" },
      { id: "contact_name", label: "Contact name" },
      { id: "contact_email", label: "Contact email" },
    ],
  },
  {
    id: "pension",
    title: "Pension",
    description: "Retirement savings provider details.",
    fields: [
      { id: "provider", label: "Provider name" },
      { id: "pension_id", label: "Pension ID" },
    ],
  },
];

interface GroupState {
  enabled: boolean;
  required: Record<string, boolean>;
}

type ConfigShape = Record<string, GroupState>;

/** Map the saved tenant config over the field definitions. */
function initialState(config: ConfigShape): Record<string, GroupState> {
  const result: Record<string, GroupState> = {};
  for (const group of GROUPS) {
    const saved = config[group.id];
    const required: Record<string, boolean> = {};
    for (const field of group.fields) {
      required[field.id] = saved?.required?.[field.id] ?? !field.fixedOptional;
    }
    result[group.id] = { enabled: saved?.enabled ?? true, required };
  }
  return result;
}

/**
 * Employee config — which custom fields appear on the create-employee form
 * and whether each is required. Loaded from /api/settings/employee-config and
 * saved via PUT.
 */
export function EmployeeConfigForm({
  initialConfig,
}: {
  initialConfig: ConfigShape;
}) {
  const [groups, setGroups] = useState(() => initialState(initialConfig));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGroup = (groupId: string, enabled: boolean) => {
    setGroups((current) => ({
      ...current,
      [groupId]: { ...current[groupId], enabled },
    }));
  };

  const toggleRequired = (
    groupId: string,
    fieldId: string,
    required: boolean,
  ) => {
    setGroups((current) => ({
      ...current,
      [groupId]: {
        ...current[groupId],
        required: { ...current[groupId].required, [fieldId]: required },
      },
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/employee-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groups),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? "Failed to save configuration");
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        These fields appear on the create-employee form. Disable a group to hide
        it entirely, or toggle individual fields between required and optional.
      </p>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const state = groups[group.id];
          return (
            <div
              key={group.id}
              className="rounded-lg border border-border bg-background/50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{group.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <Switch
                  checked={state.enabled}
                  onCheckedChange={(checked) => toggleGroup(group.id, checked)}
                  aria-label={`Enable ${group.title}`}
                />
              </div>

              {state.enabled && (
                <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-background/40">
                  {group.fields.map((field) => {
                    const required = state.required[field.id];
                    return (
                      <div
                        key={field.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{field.label}</span>
                          {field.fixedOptional && (
                            <Badge variant="secondary" className="shrink-0">
                              Optional
                            </Badge>
                          )}
                        </span>
                        {field.fixedOptional ? (
                          <span className="text-xs text-muted-foreground">
                            Always optional
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span
                              className={
                                required
                                  ? "text-xs font-medium"
                                  : "text-xs text-muted-foreground"
                              }
                            >
                              {required ? "Required" : "Optional"}
                            </span>
                            <Switch
                              checked={required}
                              onCheckedChange={(checked) =>
                                toggleRequired(group.id, field.id, checked)
                              }
                              aria-label={`Require ${field.label}`}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save configuration
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Saved
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <XCircle className="size-4" />
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
