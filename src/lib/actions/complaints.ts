'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { ComplaintInsert, ComplaintStatus } from '@/types/database';

export async function getComplaints(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
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
    let tenantId: string | null = null;
    const { data: byProfileId } = await supabase
      .from('tenants')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .single();
    if (byProfileId) {
      tenantId = byProfileId.id;
    } else if (profile.email) {
      const { data: byEmail } = await supabase
        .from('tenants')
        .select('id')
        .eq('email', profile.email)
        .eq('is_active', true)
        .single();
      if (byEmail) tenantId = byEmail.id;
    }
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      return [];
    }
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`);
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

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    const searchVal = `%${filters.search}%`;
    const [matchingProperties, matchingTenants] = await Promise.all([
      supabase.from('properties').select('id').ilike('title', searchVal),
      supabase.from('tenants').select('id').ilike('name', searchVal),
    ]);
    const propertyIds = matchingProperties.data?.map(p => p.id) || [];
    const tenantIds = matchingTenants.data?.map(t => t.id) || [];

    let orParts = [`title.ilike.${searchVal}`, `description.ilike.${searchVal}`];
    if (propertyIds.length > 0) {
      orParts.push(`property_id.in.(${propertyIds.join(',')})`);
    }
    if (tenantIds.length > 0) {
      orParts.push(`tenant_id.in.(${tenantIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  // Pagination
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? 12;
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createComplaint(data: ComplaintInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { data: complaint, error } = await supabase.from('complaints').insert({
    ...data,
    broker_id: data.broker_id || profile.id,
  }).select().single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Logged Complaint',
    entity_type: 'complaint',
    entity_id: complaint.id,
    details: { title: data.title, category: data.category, property_id: data.property_id },
  });

  revalidatePath('/complaints');
  return { success: true, data: complaint };
}

export async function updateComplaint(id: string, data: any) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('complaints')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/complaints');
  return { success: true };
}

export async function resolveComplaint(id: string, notes: string, cost: number, images?: string[]) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('complaints')
    .update({
      status: 'resolved',
      resolution_notes: notes,
      cost,
      resolution_images: images,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/complaints');
  return { success: true };
}

export async function rateComplaint(id: string, rating: number, feedback: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('complaints')
    .update({
      tenant_rating: rating,
      tenant_feedback: feedback,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/complaints');
  return { success: true };
}

