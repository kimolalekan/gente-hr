import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandingSettings } from "@/components/settings/branding-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import { getTranslator } from "@/lib/server/i18n";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("settings.branding.title") };
}

export default async function BrandingPage() {
  const t = await getTranslator();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // The provider in the root layout is initialized from the same store, so
  // `BrandingSettings` reads consistent values from context.

  if (user.role !== "admin") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </div>
          <CardTitle>{t("settings.branding.adminAccessRequired")}</CardTitle>
          <CardDescription>
            {t("settings.branding.adminAccessDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button variant="outline">{t("common.backToDashboard")}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <BrandingSettings />;
}
