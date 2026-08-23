"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import type { TenantSummary } from "@/lib/server/tenant-store";

const ROLE_LABELS: Record<TenantSummary["role"], string> = {
  admin: "Admin",
  hr: "HR",
  member: "Member",
};

/**
 * Organization switcher. Switching re-signs the session cookie with the new
 * tenant (+ its per-tenant role) and refreshes the server components, so the
 * dashboard, theming and tenant-scoped data all follow the selected org.
 */
export function TenantSwitcher({
  tenants,
  currentTenantId,
  canCreate = false,
  onCreate,
}: {
  tenants: TenantSummary[];
  currentTenantId: string;
  /** Super-admins get a "New organization" entry in the dropdown. */
  canCreate?: boolean;
  onCreate?: () => void;
}) {
  const router = useRouter();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current =
    tenants.find((tenant) => tenant.tenantId === currentTenantId) ?? null;

  if (tenants.length <= 1 && !canCreate) return null;

  const switchTo = async (tenantId: string) => {
    if (tenantId === currentTenantId || switchingTo) return;
    setSwitchingTo(tenantId);
    setError(null);
    try {
      const res = await fetch("/api/auth/switch-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not switch organization.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <div className="relative">
      <DropdownMenu
        trigger={
          <button
            type="button"
            aria-label="Switch organization"
            className="inline-flex h-9 max-w-52 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted/60"
          >
            <Building2 className="size-4 shrink-0 text-primary" />
            <span className="truncate">{current?.name ?? "Organization"}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        }
      >
        <p className="px-2.5 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Organizations
        </p>
        {tenants.map((tenant) => {
          const active = tenant.tenantId === currentTenantId;
          const busy = switchingTo === tenant.tenantId;
          return (
            <DropdownItem
              key={tenant.tenantId}
              disabled={active || switchingTo !== null}
              onClick={() => void switchTo(tenant.tenantId)}
            >
              <Building2
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {tenant.name}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {ROLE_LABELS[tenant.role]}
                </span>
              </span>
              {busy ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              ) : active ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </DropdownItem>
          );
        })}
        {canCreate && (
          <>
            <div className="my-1 border-t border-border" />
            <DropdownItem onClick={onCreate}>
              <Plus className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-left">
                New organization
              </span>
            </DropdownItem>
          </>
        )}
        {error && (
          <p className="px-2.5 py-1.5 text-xs text-destructive">{error}</p>
        )}
      </DropdownMenu>
    </div>
  );
}
