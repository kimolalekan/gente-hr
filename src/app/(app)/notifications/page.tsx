import { NotificationCenter } from '@/components/hr/notification-center';
import { PageHeader } from '@/components/hr/page-header';

export const metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates on leave, payroll, onboarding and more."
      />
      <NotificationCenter />
    </>
  );
}
