'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { LeadInsert, LeadUpdate, LeadStatus } from '@/types/database';
import crypto from 'crypto';

export async function getLeads(filters?: { status?: string; search?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('leads')
    .select('*')
    .eq('broker_id', profile.id)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLead(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createLead(data: LeadInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ ...data, broker_id: profile.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/leads');
  return lead;
}

export async function updateLead(id: string, data: LeadUpdate) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
}

export async function updateLeadStage(id: string, status: LeadStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/leads');
}

export async function convertLead(leadId: string, propertyId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) throw new Error('Lead not found');

  // Get property data
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propError || !property) throw new Error('Property not found');

  // Generate KYC token
  const kycToken = crypto.randomBytes(32).toString('hex');
  const kycTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  // Create tenant
  const { error: tenantError } = await supabase.from('tenants').insert({
    broker_id: profile.id,
    lead_id: leadId,
    property_id: propertyId,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    rent_amount: property.rent,
    deposit_amount: property.deposit,
    move_in_date: lead.move_in_date || new Date().toISOString().split('T')[0],
    is_active: true,
    kyc_token: kycToken,
    kyc_token_expiry: kycTokenExpiry,
  });

  if (tenantError) throw new Error(tenantError.message);

  // Update lead status to converted
  await supabase
    .from('leads')
    .update({ status: 'converted', updated_at: new Date().toISOString() })
    .eq('id', leadId);

  // Mark property as rented
  await supabase
    .from('properties')
    .update({ status: 'rented', updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  revalidatePath('/leads');
  revalidatePath('/properties');
  revalidatePath('/tenants');

  return { kycToken };
}

export async function addFollowUp(data: {
  lead_id: string;
  type: string;
  notes: string;
  follow_up_date?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { error } = await supabase.from('lead_follow_ups').insert({
    ...data,
    broker_id: profile.id,
    follow_up_date: data.follow_up_date || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/leads/${data.lead_id}`);
}

export async function getFollowUps(leadId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lead_follow_ups')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteLead(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidatePath('/leads');
}
