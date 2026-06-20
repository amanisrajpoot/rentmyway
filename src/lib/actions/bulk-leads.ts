'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';

export async function bulkCreateLeads(rows: any[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch existing phones for this broker to skip duplicates efficiently
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('phone')
    .eq('broker_id', profile.id);
  
  const existingPhones = new Set(existingLeads?.map(l => l.phone) || []);

  const leadsToInsert = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Basic validation
    if (!row.name || !row.phone) {
      errors.push(`Row ${rowNum}: Missing required name or phone.`);
      skipped++;
      continue;
    }

    const phoneStr = String(row.phone).trim();
    if (existingPhones.has(phoneStr)) {
      errors.push(`Row ${rowNum}: Lead with phone ${phoneStr} already exists.`);
      skipped++;
      continue;
    }

    // Default status handling
    let status = 'new';
    const validStatuses = ['new', 'contacted', 'site_visit_scheduled', 'site_visit_done', 'negotiation', 'token_paid', 'converted', 'lost'];
    if (row.status && validStatuses.includes(row.status.toLowerCase())) {
      status = row.status.toLowerCase();
    }

    leadsToInsert.push({
      broker_id: profile.id,
      name: String(row.name).trim(),
      phone: phoneStr,
      email: row.email ? String(row.email).trim() : null,
      source: row.source ? String(row.source).toLowerCase() : 'other',
      status: status,
      budget_min: row.budget_min ? parseFloat(row.budget_min) : null,
      budget_max: row.budget_max ? parseFloat(row.budget_max) : null,
      preferred_locality: row.locality ? String(row.locality).trim() : null,
      preferred_type: row.property_type ? String(row.property_type).toLowerCase() : null,
      notes: row.notes ? String(row.notes).trim() : null,
    });

    // Add to set to prevent duplicates within the CSV itself
    existingPhones.add(phoneStr);
  }

  // Batch insert in chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
    const chunk = leadsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from('leads').insert(chunk);
    
    if (error) {
      errors.push(`Batch insert error: ${error.message}`);
      skipped += chunk.length;
    } else {
      created += chunk.length;
    }
  }

  if (created > 0) {
    await logActivity({
      user_id: profile.id,
      action: 'bulk_import_leads',
      entity_type: 'lead',
      entity_id: 'bulk',
      details: { count: created },
    });
    revalidatePath('/leads');
  }

  return { created, skipped, errors };
}

export async function bulkDeleteLeads(ids: string[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  if (!ids || ids.length === 0) return { success: false, error: 'No IDs provided' };

  const { error } = await supabase
    .from('leads')
    .delete()
    .in('id', ids)
    .eq('broker_id', profile.id); // Security: only delete own leads

  if (error) return { success: false, error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'bulk_delete_leads',
    entity_type: 'lead',
    entity_id: 'bulk',
    details: { count: ids.length },
  });

  revalidatePath('/leads');
  return { success: true };
}
