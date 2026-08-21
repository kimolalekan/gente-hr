import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/server/auth";
import type { TenantSummary } from "@/lib/server/tenant-store";

export function AppHeader({
  user,
  isAdmin,
  menuOpen,
  onMenuClick,
  tenants,
}: {
  user: SessionUser;
  isAdmin: boolean;
  menuOpen: boolean;
  onMenuClick: () => void;
  tenants: TenantSummary[];
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60 md:hidden"
      >
        <Menu className="size-4" />
      </button>

      <TenantSwitcher tenants={tenants} currentTenantId={user.tenantId} />

      <div className="flex-1" />

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="relative inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <Bell className="size-4" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
      </Link>

      <ThemeToggle isAdmin={isAdmin} />
      <Avatar name={user.name} />
      <SignOutButton />
    </header>
  );
}
