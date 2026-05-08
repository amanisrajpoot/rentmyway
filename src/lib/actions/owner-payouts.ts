'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { OwnerPayoutInsert } from '@/types/database';

export async function getOwnerPayouts(filters?: {
  ownerId?: string;
  propertyId?: string;
  status?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('owner_payouts')
    .select('*, owner:owners(id, name, phone), property:properties(id, title, locality)')
    .order('created_at', { ascending: false });

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length === 0) return [];
    query = query.in('owner_id', ownerIds);
  }

  if (filters?.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }
  if (filters?.propertyId) {
    query = query.eq('property_id', filters.propertyId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOwnerPayout(data: OwnerPayoutInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { error } = await supabase.from('owner_payouts').insert({
    ...data,
    broker_id: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/payments');
  revalidatePath('/owner/financials');
}

export async function markPayoutAsPaid(id: string, paymentDate: string, paymentMode: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('owner_payouts')
    .update({
      status: 'paid',
      payment_date: paymentDate,
      payment_mode: paymentMode,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/payments');
  revalidatePath('/owner/financials');
}

export async function getPayoutSummary(ownerId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return null;

  let query = supabase
    .from('owner_payouts')
    .select('amount, status, for_month');

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  }
  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  }

  const { data } = await query;
  const payouts = data || [];

  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return { totalPaid, totalPending, totalPayouts: payouts.length };
}
