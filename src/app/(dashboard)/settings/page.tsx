import { getUserProfile } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsClient } from './settings-client';

export default async function SettingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect('/login');

  return <SettingsClient initialProfile={profile} />;
}
