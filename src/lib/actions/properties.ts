'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { PropertyInsert, PropertyUpdate } from '@/types/database';

export async function getProperties(filters?: {
  status?: string;
  type?: string;
  search?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('properties')
    .select('*, owner:owners(*)')
    .eq('broker_id', profile.id)
    .order('created_at', { ascending: false });

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
  return property;
}

export async function updateProperty(id: string, data: PropertyUpdate) {
  const supabase = await createClient();

  if (data.images !== undefined && (!data.images || data.images.length === 0)) {
    throw new Error('At least one property image is mandatory for a listing.');
  }

  const { error } = await supabase
    .from('properties')
    .update({ ...data, updated_at: new Date().toISOString() })
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
