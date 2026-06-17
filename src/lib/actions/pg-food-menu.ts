'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { PgFoodMenuInsert } from '@/types/database';

export async function getFoodMenu(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pg_food_menu')
    .select('*')
    .eq('property_id', propertyId)
    .order('day_of_week', { ascending: true });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function upsertFoodMenu(data: PgFoodMenuInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('pg_food_menu')
    .upsert({ ...data, broker_id: profile.id }, { onConflict: 'property_id, day_of_week, meal_type' });

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Updated Food Menu',
    entity_type: 'pg_food_menu',
    entity_id: data.property_id, // using property_id as aggregate
    details: { day: data.day_of_week, meal: data.meal_type },
  });

  revalidatePath('/pg/food-menu');
  return { success: true };
}

export async function deleteFoodMenuItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_food_menu').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/food-menu');
  return { success: true };
}
