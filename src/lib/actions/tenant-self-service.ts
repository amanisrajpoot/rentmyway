'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { MoveOutRequestInsert, MoveOutRequestUpdate, EmergencyContactInsert } from '@/types/database';

export async function getMoveOutRequests() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('move_out_requests')
    .select('*, tenant:tenants(name), property:properties(title)')
    .order('created_at', { ascending: false });

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('profile_id', profile.id)
      .single();
    if (!tenant) return [];
    query = query.eq('tenant_id', tenant.id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMoveOutRequest(data: MoveOutRequestInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from('move_out_requests').insert(data);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

export async function updateMoveOutRequest(id: string, data: MoveOutRequestUpdate) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('move_out_requests')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
}

export async function getEmergencyContacts(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('property_id', propertyId)
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createEmergencyContact(data: EmergencyContactInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from('emergency_contacts').insert(data);
  if (error) throw new Error(error.message);
  revalidatePath('/properties');
}
