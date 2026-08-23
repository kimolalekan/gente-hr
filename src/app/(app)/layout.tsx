import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/server/auth";
import { isUserSuperAdmin } from "@/lib/server/api";
import { getUserTenants } from "@/lib/server/tenant-store";

/**
 * Shell for the main app pages (dashboard, employees, payroll, leave,
 * reports). Requires an authenticated session — visitors are redirected to
 * the OTP login page.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [tenants, isSuperAdmin] = await Promise.all([
    getUserTenants(user.id),
    isUserSuperAdmin(user.id),
  ]);
  return (
    <AppShell user={user} tenants={tenants} isSuperAdmin={isSuperAdmin}>
      {children}
    </AppShell>
  );
}
