'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { OwnerExpenseInsert, OwnerDocumentInsert } from '@/types/database';

export async function getOwnerExpenses(ownerId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('owner_expenses')
    .select('*, property:properties(title), owner:owners(name)')
    .order('date', { ascending: false });

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

  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOwnerExpense(data: OwnerExpenseInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const { error } = await supabase.from('owner_expenses').insert({
    ...data,
    broker_id: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/owner/financials');
  return { success: true };
}

export async function getOwnerDocuments(ownerId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('owner_documents')
    .select('*, property:properties(title), owner:owners(name)')
    .order('uploaded_at', { ascending: false });

  if (profile.role === 'broker') {
    // Brokers can see docs for owners they manage
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('broker_id', profile.id);
    const ownerIds = owners?.map(o => o.id) || [];
    query = query.in('owner_id', ownerIds);
  } else if (profile.role === 'owner') {
    const { data: owners } = await supabase
      .from('owners')
      .select('id')
      .eq('email', profile.email);
    const ownerIds = owners?.map(o => o.id) || [];
    if (ownerIds.length === 0) return [];
    query = query.in('owner_id', ownerIds);
  }

  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createOwnerDocument(data: OwnerDocumentInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from('owner_documents').insert(data);
  if (error) throw new Error(error.message);
  revalidatePath('/owner/documents');
  return { success: true };
}

export async function deleteOwnerDocument(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('owner_documents').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/owner/documents');
  return { success: true };
}
