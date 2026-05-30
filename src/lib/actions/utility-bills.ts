'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { UtilityBillInsert, UtilityBillUpdate } from '@/types/database';

export async function getUtilityBills(filters?: {
  propertyId?: string;
  billType?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  let query = supabase
    .from('utility_bills')
    .select('*, property:properties(id, title, locality), tenant:tenants(id, name)')
    .order('bill_date', { ascending: false });

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length === 0) return { data: [] };

    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .in('owner_id', ownerIds);
    const propertyIds = properties?.map(p => p.id) || [];
    if (propertyIds.length === 0) return { data: [] };

    query = query.in('property_id', propertyIds);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`)
      .eq('is_active', true)
      .single();
    if (!tenant) return { data: [] };
    query = query.eq('tenant_id', tenant.id);
  }

  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  if (filters?.billType && filters.billType !== 'all') {
    query = query.eq('bill_type', filters.billType);
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

    let orParts = [`notes.ilike.${searchVal}`, `bill_month.ilike.${searchVal}`];
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

export async function getUtilityBillStats() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: { totalAmount: 0, pendingAmount: 0 } };

  let query = supabase
    .from('utility_bills')
    .select('amount, status');

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length === 0) return { data: { totalAmount: 0, pendingAmount: 0 } };

    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .in('owner_id', ownerIds);
    const propertyIds = properties?.map(p => p.id) || [];
    if (propertyIds.length === 0) return { data: { totalAmount: 0, pendingAmount: 0 } };

    query = query.in('property_id', propertyIds);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`)
      .eq('is_active', true)
      .single();
    if (!tenant) return { data: { totalAmount: 0, pendingAmount: 0 } };
    query = query.eq('tenant_id', tenant.id);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  
  const bills = data || [];

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + b.amount, 0);

  return { data: { totalAmount, pendingAmount } };
}

export async function createUtilityBill(data: UtilityBillInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: bill, error } = await supabase.from('utility_bills').insert({
    ...data,
    broker_id: profile.id,
  }).select().single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Created Utility Bill',
    entity_type: 'utility_bill',
    entity_id: bill.id,
    details: { amount: data.amount, bill_type: data.bill_type, property_id: data.property_id },
  });

  revalidatePath('/utility-bills');
  return { success: true };
}

export async function updateUtilityBill(id: string, data: UtilityBillUpdate) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase
    .from('utility_bills')
    .update(data)
    .eq('id', id);

  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Updated Utility Bill',
      entity_type: 'utility_bill',
      entity_id: id,
      details: { ...data },
    });
  }

  revalidatePath('/utility-bills');
  return { success: true };
}

export async function deleteUtilityBill(id: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase.from('utility_bills').delete().eq('id', id);
  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Deleted Utility Bill',
      entity_type: 'utility_bill',
      entity_id: id,
      details: { deleted: true },
    });
  }

  revalidatePath('/utility-bills');
  return { success: true };
}

export async function getUtilityBillSummary(propertyId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  let query = supabase
    .from('utility_bills')
    .select('bill_type, amount, status')
    .eq('broker_id', profile.id);

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  
  const bills = data || [];

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);

  // Group by type
  const byType: Record<string, number> = {};
  bills.forEach(b => {
    byType[b.bill_type] = (byType[b.bill_type] || 0) + b.amount;
  });

  return { data: { totalAmount, pendingAmount, paidAmount, byType } };
}
