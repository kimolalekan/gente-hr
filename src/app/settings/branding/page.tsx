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

export const dynamic = "force-dynamic";
export const metadata = { title: "Branding & Theme" };

export default async function BrandingPage() {
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
          <CardTitle>Admin access required</CardTitle>
          <CardDescription>
            Only company administrators can change branding and theme settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <BrandingSettings />;
}
