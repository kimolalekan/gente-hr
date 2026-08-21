import Link from "next/link";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/hr/page-header";
import { InviteUserModal } from "@/components/settings/invite-user-modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import { EMPLOYEES } from "@/lib/hr-data";

export const metadata = { title: "User management" };

/** Company admins — they have access to every organization. */
const ADMIN_USERS = [
  {
    name: "Ada Admin",
    email: "admin@gente.dev",
    status: "active" as const,
    lastSignIn: "2026-08-19T13:20:00",
  },
  {
    name: "Grace Hopper",
    email: "grace.hopper@gente.dev",
    status: "active" as const,
    lastSignIn: "2026-08-18T11:02:00",
  },
  {
    name: "Linus Berg",
    email: "linus.berg@gente.dev",
    status: "inactive" as const,
    lastSignIn: "—",
  },
];

export default async function UsersSettingsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader
        title="Users"
        description="Company admins — they have access to every organization."
      >
        <InviteUserModal
          existingEmails={ADMIN_USERS.map((entry) => entry.email)}
        />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Admin users</CardTitle>
          <CardDescription>
            {ADMIN_USERS.length} accounts · all with access to every
            organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-4 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Organizations</th>
                  <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Last sign-in
                  </th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-4 text-right font-medium">
                    Profile
                  </th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_USERS.map((entry) => {
                  const employee = EMPLOYEES.find(
                    (item) => item.email === entry.email,
                  );
                  const isSelf = user?.email === entry.email;
                  return (
                    <tr
                      key={entry.email}
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
                                  (you)
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
                        <Badge variant="secondary">
                          <Building2 className="size-3.5" />
                          All orgs
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {entry.lastSignIn === "—"
                          ? "—"
                          : new Date(entry.lastSignIn).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.status === "active" ? "success" : "secondary"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {employee ? (
                          <Link href={`/employees/${employee.id}`}>
                            <Button variant="outline" size="sm">
                              View profile
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
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
