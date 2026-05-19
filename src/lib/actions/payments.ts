'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { RentPaymentInsert } from '@/types/database';

export async function getPayments(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('rent_payments')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .order('payment_date', { ascending: false });

  if (profile.role === 'broker') {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('broker_id', profile.id);
    const propIds = properties?.map(p => p.id) || [];
    if (propIds.length > 0) {
      query = query.in('property_id', propIds);
    } else {
      return [];
    }
  }

  if (filters?.search) {
    // Light search by tenant name or property title
    const searchVal = `%${filters.search}%`;
    const [matchingTenants, matchingProperties] = await Promise.all([
      supabase.from('tenants').select('id').ilike('name', searchVal),
      supabase.from('properties').select('id').ilike('title', searchVal),
    ]);
    const tenantIds = matchingTenants.data?.map(t => t.id) || [];
    const propertyIds = matchingProperties.data?.map(p => p.id) || [];

    if (tenantIds.length > 0 && propertyIds.length > 0) {
      query = query.or(`tenant_id.in.(${tenantIds.join(',')}),property_id.in.(${propertyIds.join(',')})`);
    } else if (tenantIds.length > 0) {
      query = query.in('tenant_id', tenantIds);
    } else if (propertyIds.length > 0) {
      query = query.in('property_id', propertyIds);
    } else {
      return []; // empty search match
    }
  }

  // Pagination
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? 12;
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function recordPayment(data: RentPaymentInsert) {
  const supabase = await createClient();

  const { error } = await supabase.from('rent_payments').insert(data);
  if (error) throw new Error(error.message);

  revalidatePath('/payments');
  return { success: true };
}

export async function getFinancialStats() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { totalCollected: 0, totalPayouts: 0, pendingPayouts: 0, totalCollectionsCount: 0, totalPayoutsCount: 0 };

  // Calculate collections sum
  let paymentsQuery = supabase
    .from('rent_payments')
    .select('amount');

  if (profile.role === 'broker') {
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('broker_id', profile.id);
    const propIds = properties?.map(p => p.id) || [];
    if (propIds.length > 0) {
      paymentsQuery = paymentsQuery.in('property_id', propIds);
    } else {
      paymentsQuery = paymentsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // match none
    }
  }

  const { data: paymentsData } = await paymentsQuery;
  const totalCollected = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalCollectionsCount = paymentsData?.length || 0;

  // Calculate payouts sums
  let payoutsQuery = supabase
    .from('owner_payouts')
    .select('amount, status');

  if (profile.role === 'broker') {
    payoutsQuery = payoutsQuery.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length > 0) {
      payoutsQuery = payoutsQuery.in('owner_id', ownerIds);
    } else {
      payoutsQuery = payoutsQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // match none
    }
  }

  const { data: payoutsData } = await payoutsQuery;
  const totalPayouts = payoutsData?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingPayouts = payoutsData?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPayoutsCount = payoutsData?.length || 0;

  return {
    totalCollected,
    totalPayouts,
    pendingPayouts,
    totalCollectionsCount,
    totalPayoutsCount,
  };
}
