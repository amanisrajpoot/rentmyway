'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getTenants(filters?: { active?: boolean; search?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('tenants')
    .select('*, property:properties(id, title, locality, city)')
    .eq('broker_id', profile.id)
    .order('created_at', { ascending: false });

  if (filters?.active !== undefined) {
    query = query.eq('is_active', filters.active);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getTenant(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*, property:properties(*, owner:owners(*)), documents(*)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deactivateTenant(tenantId: string) {
  const supabase = await createClient();

  // Get tenant to find property
  const { data: tenant } = await supabase
    .from('tenants')
    .select('property_id')
    .eq('id', tenantId)
    .single();

  if (!tenant) throw new Error('Tenant not found');

  // Deactivate tenant
  await supabase
    .from('tenants')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tenantId);

  // Mark property as available
  await supabase
    .from('properties')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', tenant.property_id);

  revalidatePath('/tenants');
  revalidatePath('/properties');
}

export async function regenerateKycLink(tenantId: string) {
  const supabase = await createClient();
  const kycToken = crypto.randomBytes(32).toString('hex');
  const kycTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from('tenants')
    .update({ kyc_token: kycToken, kyc_token_expiry: kycTokenExpiry })
    .eq('id', tenantId);

  revalidatePath(`/tenants/${tenantId}`);
  return kycToken;
}
