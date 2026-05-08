'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { UtilityBillInsert, UtilityBillUpdate } from '@/types/database';

export async function getUtilityBills(filters?: {
  propertyId?: string;
  billType?: string;
  status?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

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
    if (ownerIds.length === 0) return [];

    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .in('owner_id', ownerIds);
    const propertyIds = properties?.map(p => p.id) || [];
    if (propertyIds.length === 0) return [];

    query = query.in('property_id', propertyIds);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`)
      .eq('is_active', true)
      .single();
    if (!tenant) return [];
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

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createUtilityBill(data: UtilityBillInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { error } = await supabase.from('utility_bills').insert({
    ...data,
    broker_id: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/utility-bills');
  return { success: true };
}

export async function updateUtilityBill(id: string, data: UtilityBillUpdate) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('utility_bills')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/utility-bills');
  return { success: true };
}

export async function deleteUtilityBill(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('utility_bills').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/utility-bills');
  return { success: true };
}

export async function getUtilityBillSummary(propertyId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return null;

  let query = supabase
    .from('utility_bills')
    .select('bill_type, amount, status')
    .eq('broker_id', profile.id);

  if (propertyId) {
    query = query.eq('property_id', propertyId);
  }

  const { data } = await query;
  const bills = data || [];

  const totalAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingAmount = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
  const paidAmount = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);

  // Group by type
  const byType: Record<string, number> = {};
  bills.forEach(b => {
    byType[b.bill_type] = (byType[b.bill_type] || 0) + b.amount;
  });

  return { totalAmount, pendingAmount, paidAmount, byType };
}
