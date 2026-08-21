import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { HrDashboard } from "@/components/dashboard/hr-dashboard";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login"); // layout guarantees auth; keeps types narrow

  switch (user.role) {
    case "admin":
      return <AdminDashboard user={user} />;
    case "hr":
      return <HrDashboard user={user} />;
    default:
      return <StaffDashboard user={user} />;
  }
}
