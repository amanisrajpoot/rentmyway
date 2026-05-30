'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
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

  if (error) return { error: error.message };
  return { data: data as (Announcement & { property?: { title: string } | null })[] };
}

export async function createAnnouncement(data: AnnouncementInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: announcement, error } = await supabase
    .from('announcements')
    .insert(data)
    .select()
    .single();

  if (error) return { error: error.message };

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

  if (user) {
    await logActivity({
      user_id: user.id,
      action: 'Created Announcement',
      entity_type: 'announcement',
      entity_id: announcement.id,
      details: { title: data.title, target: data.target_role },
    });
  }

  revalidatePath('/announcements');
  return { success: true, data: announcement };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await logActivity({
      user_id: user.id,
      action: 'Deleted Announcement',
      entity_type: 'announcement',
      entity_id: id,
      details: { deleted: true },
    });
  }

  revalidatePath('/announcements');
  return { success: true };
}
