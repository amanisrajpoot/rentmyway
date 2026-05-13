'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { LeaseAgreementInsert, LeaseAgreementUpdate, LeaseStatus } from '@/types/database';

export async function getLeases(filters?: { status?: string; search?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('lease_agreements')
    .select('*, tenant:tenants(id, name, phone, email), property:properties(id, title, locality, city, rent)')
    .order('created_at', { ascending: false });

  // Role-based filtering
  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    // Owner: find properties they own, then get leases for those
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
  } else if (profile.role === 'tenant') {
    // Tenant: find their tenant record
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`)
      .eq('is_active', true)
      .single();
    if (!tenant) return [];
    query = query.eq('tenant_id', tenant.id);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    // Search by tenant name (via joined table) is tricky, filter client-side
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let results = data || [];

  // Client-side search filter for tenant name
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter((l: any) =>
      l.tenant?.name?.toLowerCase().includes(s) ||
      l.property?.title?.toLowerCase().includes(s)
    );
  }

  return results;
}

export async function getLease(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lease_agreements')
    .select('*, tenant:tenants(*, property:properties(*, owner:owners(*))), property:properties(id, title, locality, city, rent, address)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createLease(data: LeaseAgreementInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { data: lease, error } = await supabase
    .from('lease_agreements')
    .insert({
      ...data,
      broker_id: profile.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/leases');
  revalidatePath('/tenants');
  return lease;
}

export async function updateLease(id: string, data: LeaseAgreementUpdate) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('lease_agreements')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/leases');
  revalidatePath(`/leases/${id}`);
}

export async function updateLeaseStatus(id: string, status: LeaseStatus, reason?: string) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'terminated') {
    updateData.terminated_at = new Date().toISOString().split('T')[0];
    if (reason) updateData.termination_reason = reason;
  }

  const { error } = await supabase
    .from('lease_agreements')
    .update(updateData)
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/leases');
  revalidatePath(`/leases/${id}`);
}

export async function renewLease(
  oldLeaseId: string,
  newLeaseData: Omit<LeaseAgreementInsert, 'broker_id' | 'renewed_from_id'>
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  // Mark old lease as renewed
  await supabase
    .from('lease_agreements')
    .update({ status: 'renewed', updated_at: new Date().toISOString() })
    .eq('id', oldLeaseId);

  // Create new lease
  const { data: newLease, error } = await supabase
    .from('lease_agreements')
    .insert({
      ...newLeaseData,
      broker_id: profile.id,
      renewed_from_id: oldLeaseId,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/leases');
  return newLease;
}

export async function getExpiringLeases(daysAhead: number = 30) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('lease_agreements')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .eq('broker_id', profile.id)
    .eq('status', 'active')
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('end_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLeaseForTenant(tenantId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lease_agreements')
    .select('*, property:properties(id, title, locality, city)')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'expiring'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null;
}
