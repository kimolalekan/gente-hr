import { OnboardingManager } from "@/components/hr/onboarding-manager";
import { PageHeader } from "@/components/hr/page-header";
import { EMPLOYEES, ONBOARDING_PLANS } from "@/lib/hr-data";

export const metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <>
      <PageHeader
        title="Onboarding"
        description="Welcome new hires with a structured task checklist."
      />
      <OnboardingManager plans={ONBOARDING_PLANS} employees={EMPLOYEES} />
    </>
  );
}
