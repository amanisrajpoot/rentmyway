'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { PgRoomInsert, PgRoomUpdate, PgBedInsert } from '@/types/database';

export async function getPgRooms(propertyId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  let query = supabase
    .from('pg_rooms')
    .select('*, beds:pg_beds(*, tenant:tenants!tenant_id(id, name, phone, email))')
    .eq('property_id', propertyId)
    .order('room_number', { ascending: true });

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getUnassignedTenants(propertyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, phone, email')
    .eq('property_id', propertyId)
    .is('pg_bed_id', null)
    .eq('is_active', true);

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createPgRoom(data: PgRoomInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: room, error: roomError } = await supabase
    .from('pg_rooms')
    .insert({ ...data, broker_id: profile.id })
    .select()
    .single();

  if (roomError) return { error: roomError.message };

  // Generate beds
  const beds: PgBedInsert[] = [];
  for (let i = 0; i < data.total_beds; i++) {
    beds.push({
      room_id: room.id,
      bed_number: String.fromCharCode(65 + i), // A, B, C...
      status: 'vacant',
    });
  }

  if (beds.length > 0) {
    const { error: bedsError } = await supabase.from('pg_beds').insert(beds);
    if (bedsError) return { error: bedsError.message };
  }

  await logActivity({
    user_id: profile.id,
    action: 'Created PG Room',
    entity_type: 'pg_room',
    entity_id: room.id,
    details: { room_number: room.room_number, property_id: room.property_id },
  });

  revalidatePath('/pg/rooms');
  return { data: room };
}

export async function updatePgRoom(id: string, data: PgRoomUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_rooms').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/rooms');
  return { success: true };
}

export async function deletePgRoom(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_rooms').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/rooms');
  return { success: true };
}

export async function assignBedToTenant(bedId: string, tenantId: string, rentOverride?: number) {
  const supabase = await createClient();
  
  const { error: bedError } = await supabase
    .from('pg_beds')
    .update({ tenant_id: tenantId, status: 'occupied', rent_override: rentOverride || null })
    .eq('id', bedId);
    
  if (bedError) return { error: bedError.message };

  // Also update tenant's bed_id
  await supabase.from('tenants').update({ pg_bed_id: bedId }).eq('id', tenantId);

  // Update room occupancy count
  const { data: bed } = await supabase.from('pg_beds').select('room_id').eq('id', bedId).single();
  if (bed) {
    const { data: occupiedBeds } = await supabase.from('pg_beds').select('id').eq('room_id', bed.room_id).eq('status', 'occupied');
    await supabase.from('pg_rooms').update({ occupied_beds: occupiedBeds?.length || 0 }).eq('id', bed.room_id);
  }

  revalidatePath('/pg/rooms');
  return { success: true };
}

export async function vacateBed(bedId: string) {
  const supabase = await createClient();
  
  // Get tenant currently on bed to clear their bed_id
  const { data: bed } = await supabase.from('pg_beds').select('tenant_id, room_id').eq('id', bedId).single();
  if (bed && bed.tenant_id) {
    await supabase.from('tenants').update({ pg_bed_id: null }).eq('id', bed.tenant_id);
  }

  const { error: updateError } = await supabase
    .from('pg_beds')
    .update({ tenant_id: null, status: 'vacant', rent_override: null })
    .eq('id', bedId);
    
  if (updateError) return { error: updateError.message };

  if (bed && bed.room_id) {
    const { data: occupiedBeds } = await supabase.from('pg_beds').select('id').eq('room_id', bed.room_id).eq('status', 'occupied');
    await supabase.from('pg_rooms').update({ occupied_beds: occupiedBeds?.length || 0 }).eq('id', bed.room_id);
  }

  revalidatePath('/pg/rooms');
  return { success: true };
}

export async function bulkCreatePgRooms(propertyId: string, roomsData: any[]) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const roomsToInsert = roomsData.map(r => ({
    property_id: propertyId,
    broker_id: profile.id,
    room_number: String(r.room_number),
    room_type: String(r.room_type || 'single').toLowerCase(),
    total_beds: Number(r.total_beds) || 1,
    rent_per_bed: Number(r.rent_per_bed) || 0,
    deposit_per_bed: Number(r.deposit_per_bed) || 0,
    occupied_beds: 0,
  }));

  const { data: createdRooms, error: roomsError } = await supabase
    .from('pg_rooms')
    .insert(roomsToInsert)
    .select();

  if (roomsError) return { error: roomsError.message };

  // Generate beds for all created rooms
  const allBeds: PgBedInsert[] = [];
  for (const room of createdRooms) {
    for (let i = 0; i < room.total_beds; i++) {
      allBeds.push({
        room_id: room.id,
        bed_number: String.fromCharCode(65 + i),
        status: 'vacant',
      });
    }
  }

  if (allBeds.length > 0) {
    // Insert beds in chunks if too many, but typically < 1000 so one insert is fine
    const { error: bedsError } = await supabase.from('pg_beds').insert(allBeds);
    if (bedsError) return { error: bedsError.message };
  }

  await logActivity({
    user_id: profile.id,
    action: 'Bulk Created PG Rooms',
    entity_type: 'property',
    entity_id: propertyId,
    details: { count: createdRooms.length },
  });

  revalidatePath('/pg/rooms');
  return { success: true, count: createdRooms.length };
}
