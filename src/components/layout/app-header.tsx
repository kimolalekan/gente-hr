"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import {
  TenantCreateModal,
  type CreatedTenant,
} from "@/components/layout/tenant-create-modal";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { useTranslations } from "@/lib/i18n/provider";
import type { SessionUser } from "@/lib/server/auth";
import type { TenantSummary } from "@/lib/server/tenant-store";

/** Tenant row as returned by `GET /api/tenants`. */
interface ApiTenant {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  role: string;
  isPrimary: boolean;
}

function toTenantSummary(tenant: ApiTenant): TenantSummary {
  return {
    tenantId: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    role:
      tenant.role === "admin" || tenant.role === "hr" ? tenant.role : "member",
    isPrimary: tenant.isPrimary,
  };
}

export function AppHeader({
  user,
  isAdmin,
  isSuperAdmin = false,
  menuOpen,
  onMenuClick,
  tenants,
}: {
  user: SessionUser;
  isAdmin: boolean;
  /** Platform super-admins can create new organizations (see TenantCreateModal). */
  isSuperAdmin?: boolean;
  menuOpen: boolean;
  onMenuClick: () => void;
  tenants: TenantSummary[];
}) {
  const pathname = usePathname();
  const { t } = useTranslations();
  const [unread, setUnread] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  // Organization list — refreshed from the API on mount and on navigation so
  // the switcher always reflects the signed-in user's real memberships.
  const [tenantList, setTenantList] = useState<TenantSummary[]>(tenants);

  const refreshTenants = useCallback(() => {
    let cancelled = false;
    fetch("/api/tenants")
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body?.ok && Array.isArray(body.data)) {
          setTenantList((body.data as ApiTenant[]).map(toTenantSummary));
        }
      })
      .catch(() => {
        // Keep the server-rendered list if the API is unreachable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refreshTenants(), [refreshTenants, pathname]);

  // New org created → refresh the list, then switch the session into it so
  // the app re-renders under the new tenant (theme, branding, data).
  const handleTenantCreated = useCallback(
    async (tenant: CreatedTenant) => {
      refreshTenants();
      try {
        const response = await fetch("/api/auth/switch-tenant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId: tenant.id }),
        });
        const body = (await response.json().catch(() => null)) as {
          ok?: boolean;
        } | null;
        if (response.ok && body?.ok) {
          // Full reload: the session cookie now points at the new org.
          window.location.assign(
            window.location.pathname +
              window.location.search +
              window.location.hash,
          );
        }
      } catch {
        // Best-effort — the new org still appears in the switcher.
      }
    },
    [refreshTenants],
  );

  // The logged-in user's unread notification count — refreshed on navigation
  // so reading notifications on the notifications page updates the badge.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/unread-count")
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body?.ok && typeof body.data?.count === "number") {
          setUnread(body.data.count);
        }
      })
      .catch(() => {
        // Ignore — the badge simply stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={t("common.openNavigationMenu")}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60 md:hidden"
        >
          <Menu className="size-4" />
        </button>

        <TenantSwitcher
          tenants={tenantList}
          currentTenantId={user.tenantId}
          canCreate={isSuperAdmin}
          onCreate={() => setCreateOpen(true)}
        />

        <div className="flex-1" />

        <Link
          href="/notifications"
          aria-label={t("notifications.title")}
          className="relative inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <ThemeToggle isAdmin={isAdmin} />
        <Avatar name={user.name} />
        <SignOutButton />
      </header>

      {/* Outside the header: the header's backdrop-blur would otherwise become
          the containing block for the modal's `fixed` positioning, breaking
          its viewport centering. */}
      <TenantCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleTenantCreated}
      />
    </>
  );
}
