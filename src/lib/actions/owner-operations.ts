'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { OwnerExpenseInsert, OwnerDocumentInsert } from '@/types/database';

export async function getOwnerExpenses(ownerId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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
    if (ownerIds.length === 0) return { data: [] };
    query = query.in('owner_id', ownerIds);
  }

  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createOwnerExpense(data: OwnerExpenseInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: expense, error } = await supabase.from('owner_expenses').insert({
    ...data,
    broker_id: profile.id,
  }).select().single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Logged Owner Expense',
    entity_type: 'owner_expense',
    entity_id: expense.id,
    details: { amount: data.amount, category: data.category, property_id: data.property_id },
  });
  revalidatePath('/owner/financials');
  return { success: true };
}

export async function getOwnerDocuments(ownerId?: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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
    if (ownerIds.length === 0) return { data: [] };
    query = query.in('owner_id', ownerIds);
  }

  if (ownerId) query = query.eq('owner_id', ownerId);

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createOwnerDocument(data: OwnerDocumentInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { data: doc, error } = await supabase.from('owner_documents').insert(data).select().single();
  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Uploaded Owner Document',
      entity_type: 'owner_document',
      entity_id: doc.id,
      details: { document_type: data.doc_type, owner_id: data.owner_id },
    });
  }
  revalidatePath('/owner/documents');
  return { success: true };
}

export async function deleteOwnerDocument(id: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase.from('owner_documents').delete().eq('id', id);
  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Deleted Owner Document',
      entity_type: 'owner_document',
      entity_id: id,
      details: { deleted: true },
    });
  }
  revalidatePath('/owner/documents');
  return { success: true };
}
