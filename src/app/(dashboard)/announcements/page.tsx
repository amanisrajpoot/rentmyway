import { getAnnouncements } from '@/lib/actions/announcements';
import { AnnouncementsClient } from './announcements-client';
import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export default async function AnnouncementsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'broker') redirect('/dashboard');

  const res = await getAnnouncements();
  const announcements = Array.isArray(res) ? res : ('data' in res && res.data ? res.data : []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Broadcast messages and notices to your tenants and owners.
        </p>
      </div>
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}
