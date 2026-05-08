'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Announcement, AnnouncementInsert } from '@/types/database';
import { createNotification } from './notifications';

export async function getAnnouncements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('announcements')
    .select('*, property:properties(title)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as (Announcement & { property?: { title: string } | null })[];
}

export async function createAnnouncement(data: AnnouncementInsert) {
  const supabase = await createClient();
  
  const { data: announcement, error } = await supabase
    .from('announcements')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Broadcast notifications to targets
  // This is a simplified version; in production, you'd use a background worker or edge function
  // to scale to thousands of users.
  
  let targetQuery = supabase.from('profiles').select('id');
  
  if (data.target_role && data.target_role !== 'all') {
    targetQuery = targetQuery.eq('role', data.target_role);
  }

  const { data: targets } = await targetQuery;

  if (targets) {
    const notifications = targets.map(target => ({
      user_id: target.id,
      type: 'announcement',
      title: data.title,
      message: data.message,
      link: '/dashboard', // Or a dedicated announcement page
    }));

    // Insert in batches of 100 to avoid limits
    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await supabase.from('notifications').insert(batch);
    }
  }

  revalidatePath('/announcements');
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/announcements');
}
