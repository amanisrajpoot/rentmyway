'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';
import { processMediaUrls } from '@/lib/utils/media-processor';

export async function bulkCreateProperties(rows: any[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Fetch owners to match them up by email or phone (basic matching)
  const { data: owners } = await supabase
    .from('owners')
    .select('id, email, phone')
    .eq('broker_id', profile.id);

  const propertiesToInsert = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Basic validation
    if (!row.title || !row.rent || !row.locality) {
      errors.push(`Row ${rowNum}: Missing required fields (title, rent, or locality).`);
      skipped++;
      continue;
    }

    // Try to find the owner
    let ownerId = null;
    if (owners && (row.owner_email || row.owner_phone)) {
      const owner = owners.find(
        (o) => o.email === row.owner_email || o.phone === row.owner_phone
      );
      if (owner) ownerId = owner.id;
    }

    if (!ownerId && !row.owner_id) {
       // If no owner found, we either skip or assign to a dummy/default owner if the app allows it.
       // The schema requires owner_id.
       errors.push(`Row ${rowNum}: Owner not found for email ${row.owner_email || 'N/A'}.`);
       skipped++;
       continue;
    }

    ownerId = ownerId || row.owner_id;

    // Process media URLs
    let images: string[] = [];
    if (row.image_urls) {
      const urls = String(row.image_urls).split(',').map(s => s.trim()).filter(Boolean);
      if (urls.length > 0) {
        images = await processMediaUrls(urls, 'properties', profile.id);
      }
    }

    propertiesToInsert.push({
      broker_id: profile.id,
      owner_id: ownerId,
      title: String(row.title).trim(),
      status: row.status ? String(row.status).toLowerCase() : 'available',
      property_type: row.property_type ? String(row.property_type).toLowerCase() : '2bhk',
      furnishing: row.furnishing ? String(row.furnishing).toLowerCase() : 'unfurnished',
      rent: parseFloat(row.rent) || 0,
      deposit: parseFloat(row.deposit) || 0,
      maintenance_charge: parseFloat(row.maintenance_charge) || 0,
      locality: String(row.locality).trim(),
      city: String(row.city || 'Bangalore').trim(),
      state: String(row.state || 'Karnataka').trim(),
      address: String(row.address || row.locality).trim(),
      images: images.length > 0 ? images : null,
      description: row.description ? String(row.description).trim() : null,
      parking: String(row.parking).toLowerCase() === 'true',
      pet_friendly: String(row.pet_friendly).toLowerCase() === 'true',
    });
  }

  // Batch insert
  const chunkSize = 50; // Smaller chunk because of potential size
  for (let i = 0; i < propertiesToInsert.length; i += chunkSize) {
    const chunk = propertiesToInsert.slice(i, i + chunkSize);
    const { error } = await supabase.from('properties').insert(chunk);
    
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
      action: 'bulk_import_properties',
      entity_type: 'property',
      entity_id: 'bulk',
      details: { count: created },
    });
    revalidatePath('/properties');
  }

  return { created, skipped, errors };
}

export async function bulkDeleteProperties(ids: string[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  if (!ids || ids.length === 0) return { success: false, error: 'No IDs provided' };

  // For safety, we usually don't hard delete properties if they have leases/tenants.
  // So we mark them as 'draft' or 'archived'. But for this request, let's hard delete if we can.
  // Note: This may fail due to foreign key constraints if there are active leases.
  const { error } = await supabase
    .from('properties')
    .delete()
    .in('id', ids)
    .eq('broker_id', profile.id);

  if (error) {
    // If foreign key constraint fails, let's just mark them as draft
    if (error.code === '23503') {
      await supabase
        .from('properties')
        .update({ status: 'draft' })
        .in('id', ids)
        .eq('broker_id', profile.id);
      return { success: true, message: 'Some properties had active records, so they were marked as Draft instead of deleted.' };
    }
    return { success: false, error: error.message };
  }

  await logActivity({
    user_id: profile.id,
    action: 'bulk_delete_properties',
    entity_type: 'property',
    entity_id: 'bulk',
    details: { count: ids.length },
  });

  revalidatePath('/properties');
  return { success: true };
}
