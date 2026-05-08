'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BrokerCommission, BrokerCommissionInsert, BrokerCommissionUpdate } from '@/types/database';

export async function getCommissions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('broker_commissions')
    .select(`
      *,
      tenant:tenants(name),
      property:properties(title),
      owner:owners(name)
    `)
    .eq('broker_id', user.id)
    .order('deal_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data as any[];
}

export async function createCommission(data: BrokerCommissionInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: commission, error } = await supabase
    .from('broker_commissions')
    .insert({ ...data, broker_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/commissions');
  return commission;
}

export async function updateCommission(id: string, data: BrokerCommissionUpdate) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('broker_commissions')
    .update(data)
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/commissions');
  return { success: true };
}

export async function deleteCommission(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('broker_commissions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/commissions');
  return { success: true };
}

export async function getCommissionStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total: 0, received: 0, pending: 0 };

  const { data, error } = await supabase
    .from('broker_commissions')
    .select('computed_amount, received_amount, status')
    .eq('broker_id', user.id);

  if (error) return { total: 0, received: 0, pending: 0 };

  const stats = data.reduce((acc, curr) => {
    acc.total += Number(curr.computed_amount);
    acc.received += Number(curr.received_amount);
    if (curr.status !== 'received') {
      acc.pending += (Number(curr.computed_amount) - Number(curr.received_amount));
    }
    return acc;
  }, { total: 0, received: 0, pending: 0 });

  return stats;
}
