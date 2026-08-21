import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsNav } from "@/components/settings/settings-nav";
import { getCurrentUser } from "@/lib/server/auth";
import { getUserTenants } from "@/lib/server/tenant-store";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tenants = await getUserTenants(user.id);
  return (
    <AppShell user={user} tenants={tenants}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1 space-y-6">{children}</div>
      </div>
    </AppShell>
  );
}
