import { EmployeeOnboardingForm } from "@/components/hr/employee-onboarding-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Complete your onboarding" };

/** Public page linked from the invite email — no authentication required. */
export default async function CompleteOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; email?: string }>;
}) {
  const { name, email } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center p-4 sm:p-6">
      <div className="mb-6 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-sm">
          G
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Complete your onboarding
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {name ? (
            <>
              Welcome,{" "}
              <span className="font-medium text-foreground">{name}</span>.{" "}
            </>
          ) : null}
          Fill in the details below to finish setting up your profile.
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
