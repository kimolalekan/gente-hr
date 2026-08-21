import { SetupWizard } from "@/components/setup/setup-wizard";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Set up your workspace" };

/** First-run setup for a new Gente workspace — no authentication required. */
export default function SetupPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center p-4 sm:p-6">
      <div className="mb-6 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">
          G
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Set up your workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few steps to configure Gente for your organization.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <SetupWizard />
        </CardContent>
      </Card>
    </div>
  );
}
