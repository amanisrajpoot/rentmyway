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
    // Try profile_id first, then fall back to email-based lookup
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
      return []; // No tenant record found
    }
  } else if (profile.role === 'owner') {
    // Owner: find all properties they own, then get complaints for those properties
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

export async function updateComplaint(id: string, data: any) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('complaints')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/complaints');
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

  if (error) throw new Error(error.message);
  revalidatePath('/complaints');
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

  if (error) throw new Error(error.message);
  revalidatePath('/complaints');
}

