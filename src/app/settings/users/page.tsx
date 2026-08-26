import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/hr/page-header";
import {
  InviteUserModal,
  UserStatusToggle,
} from "@/components/settings/invite-user-modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet, type Paginated } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("metadata.userManagement") };
}

export const dynamic = "force-dynamic";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  superAdmin: boolean;
  role: "admin" | "hr";
  createdAt: string;
  tenants: { tenantId: string; name: string }[];
}

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();
  const locale = await getTenantLocale();
  const t = await getTranslator();
  const data = await apiGet<Paginated<AdminUser>>("/api/users", {
    page: 1,
    pageSize: 100,
  });
  const users = data.items;

  return (
    <>
      <PageHeader
        title={t("settings.users.title")}
        description={t("settings.users.description")}
      >
        <InviteUserModal existingEmails={users.map((entry) => entry.email)} />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.users.teamMembers")}</CardTitle>
          <CardDescription>
            {t("settings.users.accountCount", {
              n: users.length,
              s: users.length === 1 ? "" : "s",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">
                    {t("settings.users.user")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("settings.users.role")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("tenant.organizations")}
                  </th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    {t("common.createdAt")}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {t("common.status")}
                  </th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => {
                  const isSelf = user?.email === entry.email;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {entry.name}
                              {isSelf && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {t("settings.users.you")}
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {entry.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {entry.role === "admin"
                            ? t("tenant.roleAdmin")
                            : t("tenant.roleHr")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          <Building2 className="size-3.5" />
                          {entry.tenants.length === 0
                            ? t("settings.users.noOrgs")
                            : entry.tenants[0].name}
                          {entry.tenants.length > 1 &&
                            ` +${entry.tenants.length - 1}`}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {new Date(entry.createdAt).toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.status === "active" ? "success" : "secondary"
                          }
                        >
                          {t(
                            `statusLabels.users.${entry.status}` as TranslationKey,
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {!isSelf && (
                          <UserStatusToggle
                            userId={entry.id}
                            status={entry.status}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
