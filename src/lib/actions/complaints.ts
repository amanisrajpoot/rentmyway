'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { ComplaintInsert, ComplaintStatus } from '@/types/database';

export async function getComplaints(filters?: { status?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('complaints')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality), utility:utilities(name, location)')
    .order('created_at', { ascending: false });

  // Filter based on role
  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'tenant') {
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('profile_id', profile.id)
      .single();
    if (tenantData) {
      query = query.eq('tenant_id', tenantData.id);
    }
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createComplaint(data: ComplaintInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { error } = await supabase.from('complaints').insert({
    ...data,
    broker_id: data.broker_id || profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/complaints');
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus, notes?: string, cost?: number) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes) updateData.resolution_notes = notes;
  if (cost !== undefined) updateData.cost = cost;

  const { error } = await supabase
    .from('complaints')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/complaints');
}
