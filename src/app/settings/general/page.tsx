import {
  CompanyProfileForm,
  type CompanyProfile,
} from "@/components/settings/company-profile-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/server/api-client";

export const metadata = { title: "General settings" };

export const dynamic = "force-dynamic";

export default async function GeneralSettingsPage() {
  const company = await apiGet<CompanyProfile>("/api/settings/company");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company profile and workspace preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>
            Basic information about your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyProfileForm initial={company} />
        </CardContent>
      </Card>
    </div>
  );
}
