'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { RentPaymentInsert } from '@/types/database';

export async function getPayments() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('rent_payments')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .order('payment_date', { ascending: false });

  if (profile.role === 'broker') {
    // Filter payments for properties owned by this broker
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

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function recordPayment(data: RentPaymentInsert) {
  const supabase = await createClient();

  const { error } = await supabase.from('rent_payments').insert(data);
  if (error) throw new Error(error.message);

  revalidatePath('/payments');
}
