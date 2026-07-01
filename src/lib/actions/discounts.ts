'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

// In a real app we'd have a discounts table, but for now we'll 
// just implement the actions to manage discounts conceptually and 
// modify the rent_schedule directly.

export async function applyDiscount(scheduleId: string, amount: number, reason: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  
  if (!profile || profile.role !== 'broker') return { error: 'Not authorized' };

  const { data: schedule, error: fetchErr } = await supabase
    .from('rent_schedule')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (fetchErr || !schedule) return { error: 'Schedule not found' };

  const newAmount = schedule.expected_amount - amount;

  const { error } = await supabase
    .from('rent_schedule')
    .update({ 
      expected_amount: newAmount > 0 ? newAmount : 0 
    })
    .eq('id', scheduleId);

  if (error) return { error: error.message };

  // Log it to deposit transactions as a 'discount' conceptually or just a regular log
  await supabase.from('activity_logs').insert({
    user_id: profile.id,
    action: `Applied Discount`,
    entity_type: 'rent_schedule',
    entity_id: scheduleId,
    details: { amount, reason }
  });

  revalidatePath('/payments');
  return { success: true };
}
