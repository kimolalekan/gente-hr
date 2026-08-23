import {
  LeaveCalendar,
  type LeaveCalendarDay,
} from "@/components/hr/leave-calendar";
import {
  LeaveRequestsTable,
  type LeaveRow,
} from "@/components/hr/leave-requests-table";
import { MyLeave, type ApiLeaveBalance } from "@/components/hr/my-leave";
import { PageHeader } from "@/components/hr/page-header";
import { Tabs } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/auth";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export const metadata = { title: "Leave" };

interface LeaveCalendarData {
  month: string;
  days: LeaveCalendarDay[];
}

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function LeavePage() {
  const user = await getCurrentUser();

  if (user?.role === "member") {
    const myEmployee = await apiGet<{ id: string }>("/api/employees/me").catch(
      () => null,
    );
    const [requests, balances] = await Promise.all([
      apiGet<Paginated<LeaveRow>>("/api/leave", { pageSize: 100 }),
      apiGet<ApiLeaveBalance[]>("/api/leave/balances"),
    ]);
    const year = new Date().getFullYear();
    const balance =
      balances.find((item) => item.year === year) ?? balances[0] ?? null;
    return (
      <MyLeave
        employeeId={myEmployee?.id ?? ""}
        initialRequests={requests.items}
        balance={balance}
      />
    );
  }

  const month = currentMonth();
  const [requests, calendar] = await Promise.all([
    apiGet<Paginated<LeaveRow>>("/api/leave", { pageSize: 200 }),
    apiGet<LeaveCalendarData>("/api/leave/calendar", { month }),
  ]);
  const monthLabel = new Date(
    `${calendar.month}-01T00:00:00`,
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Leave"
        description="Review requests and track balances."
      ></PageHeader>

      <Tabs
        defaultTab="calendar"
        tabs={[
          {
            id: "calendar",
            label: "Calendar",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Leave calendar — {monthLabel}</CardTitle>
                  <CardDescription>
                    Who&apos;s away. Overlapping requests are flagged as
                    conflicts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveCalendar month={calendar.month} days={calendar.days} />
                </CardContent>
              </Card>
            ),
          },
          {
            id: "requests",
            label: "Requests",
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>All requests</CardTitle>
                  <CardDescription>
                    Every request this year — approve, extend or cancel.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsTable requests={requests.items} />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
