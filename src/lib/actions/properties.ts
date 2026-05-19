'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { PropertyInsert, PropertyUpdate } from '@/types/database';
import { logActivity } from './activity-log';

export async function getProperties(filters?: {
  status?: string;
  type?: string;
  search?: string;
  minRent?: number;
  maxRent?: number;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('properties')
    .select('*, owner:owners(*)');

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'tenant') {
    // Find the broker for this tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('broker_id')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .maybeSingle();

    let brokerId = tenantData?.broker_id;

    // Fallback to email if profile_id didn't work
    if (!brokerId && profile.email) {
      const { data: tenantByEmail } = await supabase
        .from('tenants')
        .select('broker_id')
        .eq('email', profile.email)
        .eq('is_active', true)
        .maybeSingle();
      brokerId = tenantByEmail?.broker_id;
    }

    if (brokerId) {
      query = query.eq('broker_id', brokerId).eq('status', 'available');
    } else {
      return []; // No broker found for tenant
    }
  } else if (profile.role === 'owner') {
    // Owners see their own properties
    const { data: owners } = await supabase.from('owners').select('id').eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    query = query.in('owner_id', ownerIds);
  }

  query = query.order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('property_type', filters.type);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,locality.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
    );
  }
  if (filters?.minRent !== undefined) {
    query = query.gte('rent', filters.minRent);
  }
  if (filters?.maxRent !== undefined) {
    query = query.lte('rent', filters.maxRent);
  }

  // Pagination range
  const limit = filters?.limit ?? 25;
  const page = filters?.page ?? 0;
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getProperty(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('properties')
    .select('*, owner:owners(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createProperty(data: PropertyInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  // Sanitize: convert empty-string UUID fields to null so Postgres doesn't error
  const sanitized = {
    ...data,
    broker_id: profile.id,
    owner_id: data.owner_id || null,
  };

  if (!sanitized.owner_id) throw new Error('Please select an owner before saving.');
  if (!sanitized.images || sanitized.images.length === 0) {
    throw new Error('At least one property image is mandatory for a listing.');
  }

  const { data: property, error } = await supabase
    .from('properties')
    .insert(sanitized)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/properties');

  await logActivity({
    user_id: profile.id,
    action: 'create_property',
    entity_type: 'property',
    entity_id: property.id,
    details: { title: property.title },
  });

  return property;
}

export async function updateProperty(id: string, data: PropertyUpdate) {
  const supabase = await createClient();

  if (data.images !== undefined && (!data.images || data.images.length === 0)) {
    throw new Error('At least one property image is mandatory for a listing.');
  }

  const updatePayload: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
  if (updatePayload.broker_id === '') {
    delete updatePayload.broker_id;
  }
  if (updatePayload.owner_id === '') {
    delete updatePayload.owner_id;
  }

  const { error } = await supabase
    .from('properties')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/properties');
  revalidatePath(`/properties/${id}`);
}

export async function markPropertyAsRented(propertyId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('properties')
    .update({ status: 'rented', updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  if (error) throw new Error(error.message);

  revalidatePath('/properties');
  revalidatePath(`/properties/${propertyId}`);

  const profile = await getUserProfile();
  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'mark_rented',
      entity_type: 'property',
      entity_id: propertyId,
      details: { status: 'rented' },
    });
  }
}

export async function markPropertyAsAvailable(propertyId: string) {
  const supabase = await createClient();

  // Also deactivate any active tenant
  await supabase
    .from('tenants')
    .update({ is_active: false })
    .eq('property_id', propertyId)
    .eq('is_active', true);

  const { error } = await supabase
    .from('properties')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  if (error) throw new Error(error.message);

  revalidatePath('/properties');
  revalidatePath(`/properties/${propertyId}`);
}

export async function deleteProperty(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/properties');
  return { success: true };
}

export async function getOwners() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('owners')
    .select('*')
    .eq('broker_id', profile.id)
    .order('name');

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOwner(data: { name: string; phone: string; email?: string; address?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { data: owner, error } = await supabase
    .from('owners')
    .insert({ ...data, broker_id: profile.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return owner;
}

export async function getMatchedProperties(lead: any) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('properties')
    .select('*')
    .eq('broker_id', profile.id)
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (lead.preferred_type) {
    query = query.eq('property_type', lead.preferred_type);
  }
  if (lead.budget_max) {
    query = query.lte('rent', lead.budget_max);
  }
  if (lead.budget_min) {
    query = query.gte('rent', lead.budget_min);
  }
  if (lead.preferred_locality) {
    query = query.ilike('locality', `%${lead.preferred_locality}%`);
  }

  const { data, error } = await query.limit(5);
  if (error) throw new Error(error.message);
  return data || [];
}
