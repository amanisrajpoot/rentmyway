'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { TenantInsert } from '@/types/database';

export async function bulkOnboardTenants(tenants: (TenantInsert & { bed_number: string, room_id: string })[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  let successCount = 0;
  const errors = [];

  for (const t of tenants) {
    // 1. Find the bed
    const { data: bed } = await supabase
      .from('pg_beds')
      .select('id, status')
      .eq('room_id', t.room_id)
      .eq('bed_number', t.bed_number)
      .single();

    if (!bed) {
      errors.push(`Bed ${t.bed_number} not found in room.`);
      continue;
    }
    if (bed.status === 'occupied') {
      errors.push(`Bed ${t.bed_number} is already occupied.`);
      continue;
    }

    // 2. Insert tenant
    const { data: newTenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        broker_id: profile.id,
        property_id: t.property_id,
        name: t.name,
        phone: t.phone,
        email: t.email || null,
        rent_amount: t.rent_amount,
        deposit_amount: t.deposit_amount,
        move_in_date: t.move_in_date,
        is_active: true,
        tenant_type: 'pg',
        pg_bed_id: bed.id,
      })
      .select()
      .single();

    if (tenantErr) {
      errors.push(`Failed to add tenant ${t.name}: ${tenantErr.message}`);
      continue;
    }

    // 3. Update bed status
    await supabase
      .from('pg_beds')
      .update({ tenant_id: newTenant.id, status: 'occupied' })
      .eq('id', bed.id);

    // 4. Update room occupancy
    const { data: occupiedBeds } = await supabase.from('pg_beds').select('id').eq('room_id', t.room_id).eq('status', 'occupied');
    await supabase.from('pg_rooms').update({ occupied_beds: occupiedBeds?.length || 0 }).eq('id', t.room_id);

    successCount++;
  }

  await logActivity({
    user_id: profile.id,
    action: 'Bulk Onboarded PG Tenants',
    entity_type: 'tenant',
    entity_id: null,
    details: { count: successCount, property_id: tenants[0]?.property_id },
  });

  revalidatePath('/pg/onboarding');
  revalidatePath('/pg/rooms');
  revalidatePath('/tenants');
  
  return { success: true, count: successCount, errors: errors.length > 0 ? errors : undefined };
}

export async function onboardSinglePgTenant(data: {
  property_id: string;
  name: string;
  phone: string;
  email?: string;
  room_id: string;
  bed_id: string;
  rent_amount: number;
  deposit_amount: number;
  move_in_date: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // 1. Verify bed is vacant
  const { data: bed, error: bedErr } = await supabase
    .from('pg_beds')
    .select('id, status, room_id')
    .eq('id', data.bed_id)
    .single();

  if (bedErr || !bed) return { error: 'Bed not found' };
  if (bed.status === 'occupied') return { error: 'Bed is already occupied' };

  // 2. Insert tenant
  const { data: newTenant, error: tenantErr } = await supabase
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
      tenant_type: 'pg',
      pg_bed_id: bed.id,
    })
    .select()
    .single();

  if (tenantErr) return { error: `Failed to create tenant: ${tenantErr.message}` };

  // 3. Update bed status
  await supabase
    .from('pg_beds')
    .update({ tenant_id: newTenant.id, status: 'occupied' })
    .eq('id', bed.id);

  // 4. Update room occupancy
  const { data: occupiedBeds } = await supabase.from('pg_beds').select('id').eq('room_id', bed.room_id).eq('status', 'occupied');
  await supabase.from('pg_rooms').update({ occupied_beds: occupiedBeds?.length || 0 }).eq('id', bed.room_id);

  await logActivity({
    user_id: profile.id,
    action: 'Onboarded Single PG Tenant',
    entity_type: 'tenant',
    entity_id: newTenant.id,
    details: { name: newTenant.name, property_id: data.property_id },
  });

  revalidatePath('/pg/onboarding');
  revalidatePath('/pg/rooms');
  revalidatePath('/tenants');

  return { success: true, data: newTenant };
}
