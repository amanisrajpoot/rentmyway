'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { TaxConfigInsert } from '@/types/database';

export async function getTaxConfig(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tax_config')
    .select('*')
    .eq('property_id', propertyId)
    .single();

  if (error && error.code !== 'PGRST116') return { error: error.message };
  return { data };
}

export async function upsertTaxConfig(data: TaxConfigInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'broker') return { error: 'Not authorized' };

  const { data: existing } = await getTaxConfig(data.property_id);

  if (existing) {
    const { error } = await supabase
      .from('tax_config')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('tax_config').insert(data);
    if (error) return { error: error.message };
  }

  revalidatePath('/tax-settings');
  return { success: true };
}

export async function calculateGST(amount: number, isCommercial: boolean, monthlyRent: number, percent: number = 18): Promise<number> {
  if (isCommercial) {
    return (amount * percent) / 100;
  }
  // Residential: only if monthly > 20k (mock rule, adjust as needed)
  if (monthlyRent > 20000) {
    return (amount * percent) / 100;
  }
  return 0;
}

export async function calculateTDS(amount: number, annualRent: number, percent: number = 10): Promise<number> {
  if (annualRent > 240000) { // ₹2.4 Lakh
    return (amount * percent) / 100;
  }
  return 0;
}
