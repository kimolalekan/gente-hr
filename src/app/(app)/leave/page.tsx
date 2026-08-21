import { LeaveCalendar } from "@/components/hr/leave-calendar";
import { LeaveRequestsTable } from "@/components/hr/leave-requests-table";
import { PageHeader } from "@/components/hr/page-header";
import { Tabs } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LEAVE_REQUESTS } from "@/lib/hr-data";

export const metadata = { title: "Leave" };

export default function LeavePage() {
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
                  <CardTitle>Leave calendar — August 2026</CardTitle>
                  <CardDescription>
                    Who&apos;s away. Overlapping requests are flagged as
                    conflicts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveCalendar />
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
                  <LeaveRequestsTable requests={LEAVE_REQUESTS} />
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
