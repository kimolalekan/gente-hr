import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeProfileCard } from "@/components/hr/employee-profile-card";
import { ApiClientError, apiGet } from "@/lib/server/api-client";
import { getCurrentUser } from "@/lib/server/auth";
import { formatDate, type Employee } from "@/lib/hr-data";
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("metadata.myProfile") };
}

/** Shape of `GET /api/employees/me`. */
interface MyEmployee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  department: string | null;
  address: Record<string, unknown> | null;
  status: string;
  joinedAt: string | null;
  employmentType: string;
  employeeId: string;
  manager: string | null;
  salary: number;
}

/** Shape of `GET /api/employees/[id]/documents` items. */
interface EmployeeDocumentRow {
  id: string;
  name: string;
  category: string;
  status: string;
  fileUrl: string | null;
  uploadedAt: string;
  createdAt: string;
}

/**
 * Self-service profile for the signed-in employee: their HR record in
 * read-only form plus documents on file. Attendance and leave live on their
 * own pages — and only admin/HR can edit an employee's records.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Employees only — admins/HR manage profiles through the directory.
  if (user.role !== "member") redirect("/");

  const locale = await getTenantLocale();
  const t = await getTranslator();

  let me: MyEmployee;
  try {
    me = await apiGet<MyEmployee>("/api/employees/me");
  } catch (error) {
    // A member without a linked HR record (e.g. pre-onboarding).
    if (error instanceof ApiClientError && error.status === 404) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your employee record hasn&apos;t been linked to your account yet.
              Ask your administrator to complete your onboarding.
            </p>
          </CardContent>
        </Card>
      );
    }
    throw error;
  }

  const documents = await apiGet<EmployeeDocumentRow[]>(
    `/api/employees/${me.id}/documents`,
  );

  // Normalize nullable DB fields to the `Employee` shape the profile card uses.
  const employee: Employee = {
    id: me.id,
    name: me.name,
    email: me.email,
    phone: me.phone ?? "",
    role: me.role ?? "",
    department: me.department ?? "",
    address: (me.address ?? null) as Employee["address"],
    status:
      me.status === "on_leave"
        ? "on_leave"
        : me.status === "pending"
          ? "pending"
          : "active",
    joinedAt: me.joinedAt ?? "",
    salary: me.salary,
    manager: me.manager ?? "",
  };

  return (
    <>
      <EmployeeProfileCard employee={employee} readOnly />

      <Card>
        <CardHeader>
          <CardTitle>{t("employees.documents")}</CardTitle>
          <CardDescription>
            {t("employees.documentsMineDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {documents.length === 0 ? (
              <p className="py-2.5 text-sm text-muted-foreground">
                {t("employees.noDocuments")}
              </p>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{document.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.category} ·{" "}
                      {t("employees.uploadedOn", {
                        date: formatDate(
                          document.uploadedAt.slice(0, 10),
                          locale,
                        ),
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      document.status === "verified"
                        ? "success"
                        : document.status === "pending"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {document.status === "verified" ||
                    document.status === "pending"
                      ? t(
                          `statusLabels.document.${document.status}` as TranslationKey,
                        )
                      : document.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
