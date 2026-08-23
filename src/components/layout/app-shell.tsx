"use client";

import { useCallback, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { SessionUser } from "@/lib/server/auth";
import type { TenantSummary } from "@/lib/server/tenant-store";

/**
 * Client shell for the app: owns the mobile sidebar (drawer) open state and
 * composes the sidebar, header, and page content. Pages stay server-rendered
 * and are passed through as children.
 */
export function AppShell({
  user,
  tenants,
  isSuperAdmin = false,
  children,
}: {
  user: SessionUser;
  tenants: TenantSummary[];
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-dvh">
      <AppSidebar open={sidebarOpen} onClose={closeSidebar} role={user.role} />
      <div className="min-w-0 flex-1">
        <AppHeader
          user={user}
          isAdmin={user.role === "admin"}
          isSuperAdmin={isSuperAdmin}
          menuOpen={sidebarOpen}
          onMenuClick={openSidebar}
          tenants={tenants}
        />
        <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
