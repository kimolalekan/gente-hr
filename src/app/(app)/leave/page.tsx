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
import { getTenantLocale, getTranslator } from "@/lib/server/i18n";
import { apiGet, type Paginated } from "@/lib/server/api-client";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("leave.title") };
}

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
  const locale = await getTenantLocale();
  const t = await getTranslator();

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
  ).toLocaleDateString(locale, { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title={t("leave.title")}
        description={t("leave.description")}
      ></PageHeader>

      <Tabs
        defaultTab="calendar"
        tabs={[
          {
            id: "calendar",
            label: t("common.calendar"),
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("leave.calendar")} — {monthLabel}
                  </CardTitle>
                  <CardDescription>
                    {t("leave.calendarDescription")}
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
            label: t("leave.requests"),
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>{t("leave.allRequests")}</CardTitle>
                  <CardDescription>
                    {t("leave.allRequestsDescription")}
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
