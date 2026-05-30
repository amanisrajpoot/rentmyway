'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActivityLogInsert } from '@/types/database';

export async function logActivity(data: ActivityLogInsert) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('activity_log')
    .insert(data);

  if (error) console.error('Failed to log activity:', error.message);
}

export async function getActivityLog() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  return { data: data || [] };
}
