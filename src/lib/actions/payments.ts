'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { RentPaymentInsert } from '@/types/database';

export async function getPayments(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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
      return { data: [] };
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
      return { data: [] }; // empty search match
    }
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

export async function recordPayment(data: RentPaymentInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { data: payment, error } = await supabase.from('rent_payments').insert(data).select().single();
  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Recorded Payment',
      entity_type: 'payment',
      entity_id: payment.id,
      details: {
        amount: data.amount,
        tenant_id: data.tenant_id,
        property_id: data.property_id,
        method: data.payment_mode
      },
    });
  }

  revalidatePath('/payments');
  return { success: true, data: payment };
}

export async function getFinancialStats() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: { totalCollected: 0, totalPayouts: 0, pendingPayouts: 0, totalCollectionsCount: 0, totalPayoutsCount: 0 } };

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

  const { data: paymentsData, error: paymentsError } = await paymentsQuery;
  if (paymentsError) return { error: paymentsError.message };
  
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

  const { data: payoutsData, error: payoutsError } = await payoutsQuery;
  if (payoutsError) return { error: payoutsError.message };
  
  const totalPayouts = payoutsData?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0;
  const pendingPayouts = payoutsData?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;
  const totalPayoutsCount = payoutsData?.length || 0;

  return {
    data: {
      totalCollected,
      totalPayouts,
      pendingPayouts,
      totalCollectionsCount,
      totalPayoutsCount,
    }
  };
}

export async function getPaymentsByTenant(tenantId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  const { data, error } = await supabase
    .from('rent_payments')
    .select('*, property:properties(title, locality)')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function bulkRecordPayments(rows: any[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  const paymentsToInsert = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.tenant_id || !row.amount || !row.payment_date) {
      errors.push(`Row ${rowNum}: Missing required fields (tenant_id, amount, payment_date).`);
      skipped++;
      continue;
    }

    paymentsToInsert.push({
      tenant_id: row.tenant_id,
      property_id: row.property_id || null, // Best effort
      amount: parseFloat(row.amount) || 0,
      payment_date: row.payment_date,
      payment_mode: row.payment_mode ? String(row.payment_mode).toLowerCase() : 'cash',
      reference_number: row.reference_number ? String(row.reference_number) : null,
      notes: row.notes ? String(row.notes) : null,
      status: row.status ? String(row.status).toLowerCase() : 'completed',
    });
  }

  const chunkSize = 100;
  for (let i = 0; i < paymentsToInsert.length; i += chunkSize) {
    const chunk = paymentsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from('rent_payments').insert(chunk);
    
    if (error) {
      errors.push(`Batch insert error: ${error.message}`);
      skipped += chunk.length;
    } else {
      created += chunk.length;
    }
  }

  if (created > 0) {
    await logActivity({
      user_id: profile.id,
      action: 'bulk_import_payments',
      entity_type: 'payment',
      entity_id: 'bulk',
      details: { count: created },
    });
    revalidatePath('/payments');
  }

  return { created, skipped, errors };
}

export async function getMonthlyCollectionSummary() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'broker') return { data: [] };

  // Fetch all payments for this broker's properties for the last 6 months
  const { data: properties } = await supabase.from('properties').select('id').eq('broker_id', profile.id);
  const propIds = properties?.map(p => p.id) || [];
  
  if (propIds.length === 0) return { data: [] };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: payments } = await supabase
    .from('rent_payments')
    .select('amount, payment_date')
    .in('property_id', propIds)
    .gte('payment_date', sixMonthsAgo.toISOString());

  if (!payments) return { data: [] };

  // Group by month
  const monthlyData: Record<string, number> = {};
  
  payments.forEach(p => {
    const date = new Date(p.payment_date);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    monthlyData[monthYear] = (monthlyData[monthYear] || 0) + p.amount;
  });

  const formattedData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount
  })).sort((a, b) => {
    // Basic sorting - assumes formatting like "Jan 2024"
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  return { data: formattedData };
}
