import { OffboardingManager } from "@/components/hr/offboarding-manager";
import { PageHeader } from "@/components/hr/page-header";
import { EMPLOYEES, OFFBOARDINGS } from "@/lib/hr-data";

export const metadata = { title: "Offboarding" };

export default function OffboardingPage() {
  return (
    <>
      <PageHeader
        title="Offboarding"
        description="Exit processes, checklists and final settlements."
      />
      <OffboardingManager offboardings={OFFBOARDINGS} employees={EMPLOYEES} />
    </>
  );
}
