'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function getTenants(filters?: {
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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

  // Pagination range
  const limit = filters?.limit ?? 25;
  const page = filters?.page ?? 0;
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getTenant(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*, property:properties(*, owner:owners(*)), documents(*)')
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deactivateTenant(tenantId: string) {
  const supabase = await createClient();

  // Get tenant to find property
  const { data: tenant, error: fetchError } = await supabase
    .from('tenants')
    .select('property_id')
    .eq('id', tenantId)
    .single();

  if (fetchError) return { error: fetchError.message };
  if (!tenant) return { error: 'Tenant not found' };

  // Deactivate tenant
  const { error: updateTenantError } = await supabase
    .from('tenants')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', tenantId);
    
  if (updateTenantError) return { error: updateTenantError.message };

  // Mark property as available
  const { error: updatePropError } = await supabase
    .from('properties')
    .update({ status: 'available', updated_at: new Date().toISOString() })
    .eq('id', tenant.property_id);
    
  if (updatePropError) return { error: updatePropError.message };

  revalidatePath('/tenants');
  revalidatePath('/properties');
  
  return { success: true };
}

export async function regenerateKycLink(tenantId: string) {
  const supabase = await createClient();
  const kycToken = crypto.randomBytes(32).toString('hex');
  const kycTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('tenants')
    .update({ kyc_token: kycToken, kyc_token_expiry: kycTokenExpiry })
    .eq('id', tenantId);

  if (error) return { error: error.message };

  revalidatePath(`/tenants/${tenantId}`);
  return { data: kycToken };
}

export async function createDirectTenant(data: {
  name: string;
  phone: string;
  email?: string;
  property_id: string;
  rent_amount: number;
  deposit_amount: number;
  move_in_date: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const kycToken = crypto.randomBytes(32).toString('hex');
  const kycTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      broker_id: profile.id,
      property_id: data.property_id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      rent_amount: data.rent_amount,
      deposit_amount: data.deposit_amount,
      move_in_date: data.move_in_date,
      is_active: true,
      kyc_token: kycToken,
      kyc_token_expiry: kycTokenExpiry,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Mark property as rented
  const { error: propError } = await supabase
    .from('properties')
    .update({ status: 'rented', updated_at: new Date().toISOString() })
    .eq('id', data.property_id);
    
  if (propError) return { error: propError.message };

  await logActivity({
    user_id: profile.id,
    action: 'Created Tenant',
    entity_type: 'tenant',
    entity_id: tenant.id,
    details: { name: tenant.name, property_id: tenant.property_id },
  });

  revalidatePath('/tenants');
  revalidatePath('/properties');

  return { data: tenant };
}
