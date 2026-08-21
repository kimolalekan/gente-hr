import { EmailConfigForm } from "@/components/settings/email-config-form";
import { PageHeader } from "@/components/hr/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Email service" };

export default function EmailSettingsPage() {
  return (
    <>
      <PageHeader
        title="Email service"
        description="Provider configuration and template triggers."
      />

      <Card>
        <CardHeader>
          <CardTitle>Delivery configuration</CardTitle>
          <CardDescription>
            Provider credentials, sender identity and tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailConfigForm />
        </CardContent>
      </Card>
    </>
  );
}
