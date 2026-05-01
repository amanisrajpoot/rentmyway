'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { RentPaymentInsert } from '@/types/database';

export async function getPayments() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const { data, error } = await supabase
    .from('rent_payments')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .order('payment_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function recordPayment(data: RentPaymentInsert) {
  const supabase = await createClient();

  const { error } = await supabase.from('rent_payments').insert(data);
  if (error) throw new Error(error.message);

  revalidatePath('/payments');
}
