'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { LeadInsert, LeadUpdate, LeadStatus } from '@/types/database';
import crypto from 'crypto';
import { logActivity } from './activity-log';

export async function getLeads(filters?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

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

export async function getLead(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function createLead(data: LeadInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // Check for duplicate lead by phone number
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id, name, phone, status')
    .eq('broker_id', profile.id)
    .eq('phone', data.phone)
    .maybeSingle();

  if (existingLead) {
    return { error: `A lead with phone ${data.phone} already exists: "${existingLead.name}" (${existingLead.status}). Please update the existing lead instead.` };
  }

  const leadInsertData: any = { ...data, broker_id: profile.id };
  delete leadInsertData.images; // the column doesn't exist yet in the database

  const { data: lead, error } = await supabase
    .from('leads')
    .insert(leadInsertData)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/leads');

  await logActivity({
    user_id: profile.id,
    action: 'create_lead',
    entity_type: 'lead',
    entity_id: lead.id,
    details: { name: lead.name, phone: lead.phone },
  });

  return { data: lead };
}

export async function updateLead(id: string, data: LeadUpdate) {
  const supabase = await createClient();

  const leadUpdateData: any = { ...data, updated_at: new Date().toISOString() };
  delete leadUpdateData.images; // the column doesn't exist yet in the database

  const { error } = await supabase
    .from('leads')
    .update(leadUpdateData)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/leads');
  revalidatePath(`/leads/${id}`);
  
  return { success: true };
}

export async function updateLeadStage(id: string, status: LeadStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/leads');
  
  return { success: true };
}

export async function convertLead(leadId: string, propertyId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) return { error: 'Lead not found' };

  // Get property data
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propError || !property) return { error: 'Property not found' };

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

  if (tenantError) return { error: tenantError.message };

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

  await logActivity({
    user_id: profile.id,
    action: 'convert_lead',
    entity_type: 'tenant',
    entity_id: leadId,
    details: { name: lead.name, property: property.title },
  });

  return { data: { kycToken } };
}

export async function addFollowUp(data: {
  lead_id: string;
  type: string;
  notes: string;
  follow_up_date?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { error } = await supabase.from('lead_follow_ups').insert({
    ...data,
    broker_id: profile.id,
    follow_up_date: data.follow_up_date || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/leads/${data.lead_id}`);
  
  return { success: true };
}

export async function getFollowUps(leadId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lead_follow_ups')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function deleteLead(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/leads');
  
  return { success: true };
}

export async function getBrokerSiteVisits() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  const { data, error } = await supabase
    .from('lead_follow_ups')
    .select('*, lead:leads(name, phone, email, preferred_locality, preferred_city)')
    .eq('broker_id', profile.id)
    .eq('type', 'site_visit')
    .order('follow_up_date', { ascending: true });

  if (error) return { error: error.message };
  return { data: data || [] };
}


