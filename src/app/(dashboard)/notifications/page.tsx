import { getNotifications } from '@/lib/actions/notifications';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage() {
  const res = await getNotifications();
  const notifications = Array.isArray(res) ? res : ('data' in res && res.data ? res.data : []);

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Stay updated with your property operations and alerts.
        </p>
      </div>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
