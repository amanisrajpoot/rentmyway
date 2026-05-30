'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { MaintenanceScheduleInsert, MaintenanceScheduleUpdate } from '@/types/database';

export async function getMaintenanceSchedule(propertyId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('maintenance_schedule')
    .select('*, property:properties(title, locality)')
    .order('next_due', { ascending: true });

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length === 0) return [];

    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .in('owner_id', ownerIds);
    const propertyIds = properties?.map(p => p.id) || [];
    if (propertyIds.length === 0) return [];

    query = query.in('property_id', propertyIds);
  }

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createMaintenanceSchedule(data: MaintenanceScheduleInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  const { data: schedule, error } = await supabase.from('maintenance_schedule').insert({
    ...data,
    broker_id: profile.id,
  }).select().single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Scheduled Maintenance',
    entity_type: 'maintenance',
    entity_id: schedule.id,
    details: { property_id: data.property_id, title: data.title },
  });

  revalidatePath('/maintenance');
  return { success: true };
}

export async function updateMaintenanceSchedule(id: string, data: MaintenanceScheduleUpdate) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase
    .from('maintenance_schedule')
    .update(data)
    .eq('id', id);

  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Updated Maintenance',
      entity_type: 'maintenance',
      entity_id: id,
      details: { ...data },
    });
  }

  revalidatePath('/maintenance');
  return { success: true };
}

export async function completeMaintenanceTask(id: string, cost: number, nextDueDate: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase
    .from('maintenance_schedule')
    .update({
      last_completed: new Date().toISOString().split('T')[0],
      next_due: nextDueDate,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Completed Maintenance',
      entity_type: 'maintenance',
      entity_id: id,
      details: { cost, next_due: nextDueDate },
    });
  }

  revalidatePath('/maintenance');
  return { success: true };
}
