import { AtsNav } from "@/components/ats/ats-nav";

/**
 * Recruiting (ATS) sub-layout: a sidebar navigation (Jobs / Applications)
 * inside the main app shell. Child pages render in the content column.
 */
export default function AtsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <AtsNav />
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  );
}
