'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { MoveOutRequestInsert, MoveOutRequestUpdate, EmergencyContactInsert } from '@/types/database';

export async function getMoveOutRequests() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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
    if (!tenant) return { data: [] };
    query = query.eq('tenant_id', tenant.id);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createMoveOutRequest(data: MoveOutRequestInsert) {
  const supabase = await createClient();

  // Smart Automation: Notice Period Penalty for PG Tenants
  try {
    const { data: tenant } = await supabase.from('tenants').select('tenant_type, property_id').eq('id', data.tenant_id).single();
    if (tenant?.tenant_type === 'pg') {
      const { data: noticePolicy } = await supabase.from('pg_notice_periods').select('*').eq('property_id', tenant.property_id).eq('is_active', true).single();
      
      if (noticePolicy) {
        const requestedDate = new Date(data.requested_date);
        const noticeDate = new Date(data.notice_served_date || new Date().toISOString());
        
        const diffTime = requestedDate.getTime() - noticeDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < noticePolicy.notice_days && noticePolicy.early_exit_penalty > 0) {
          data.deductions = (data.deductions || 0) + noticePolicy.early_exit_penalty;
          const note = `[Automated] ₹${noticePolicy.early_exit_penalty} deducted due to notice period violation (Served ${diffDays} days notice, required ${noticePolicy.notice_days} days).`;
          data.broker_notes = data.broker_notes ? `${data.broker_notes}\n${note}` : note;
        }
      }
    }
  } catch (err) {
    console.error('Error applying smart automation:', err);
  }

  const { error } = await supabase.from('move_out_requests').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateMoveOutRequest(id: string, data: MoveOutRequestUpdate) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('move_out_requests')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getEmergencyContacts(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('property_id', propertyId)
    .eq('is_active', true);
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createEmergencyContact(data: EmergencyContactInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from('emergency_contacts').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/properties');
  return { success: true };
}
