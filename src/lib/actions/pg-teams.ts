'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { PgMaintenanceTeamInsert, PgMaintenanceTeamUpdate } from '@/types/database';

export async function getMaintenanceTeams(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pg_maintenance_teams')
    .select('*')
    .eq('property_id', propertyId)
    .order('priority_order', { ascending: true });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createMaintenanceTeam(data: PgMaintenanceTeamInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: team, error } = await supabase
    .from('pg_maintenance_teams')
    .insert({ ...data, broker_id: profile.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Created Maintenance Team',
    entity_type: 'pg_team',
    entity_id: team.id,
    details: { team_name: data.team_name, property_id: data.property_id },
  });

  revalidatePath('/pg/teams');
  return { data: team };
}

export async function updateMaintenanceTeam(id: string, data: PgMaintenanceTeamUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_maintenance_teams').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/teams');
  return { success: true };
}

export async function deleteMaintenanceTeam(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_maintenance_teams').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/teams');
  return { success: true };
}

// For Auto-delegation
export async function getTeamForCategory(propertyId: string, category: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pg_maintenance_teams')
    .select('*')
    .eq('property_id', propertyId)
    .eq('category', category)
    .eq('is_active', true)
    .order('priority_order', { ascending: true })
    .limit(1)
    .single();
    
  return data;
}
