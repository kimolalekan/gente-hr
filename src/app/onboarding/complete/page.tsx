import { EmployeeOnboardingForm } from "@/components/hr/employee-onboarding-form";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslator } from "@/lib/server/i18n";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("onboarding.completeTitle") };
}

/** Public page linked from the invite email — no authentication required. */
export default async function CompleteOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; email?: string }>;
}) {
  const t = await getTranslator();
  const { name, email } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center p-4 sm:p-6">
      <div className="mb-6 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">
          G
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {t("onboarding.completeTitle")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {name && <>{t("onboarding.completeWelcome", { name })} </>}
          {t("onboarding.completeDescription")}
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <EmployeeOnboardingForm initialName={name} initialEmail={email} />
        </CardContent>
      </Card>
    </div>
  );
}
