'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { PgServiceRequestInsert, PgServiceRequestUpdate } from '@/types/database';

export async function getPgServiceRequests(filters?: { property_id?: string; status?: string }) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  let query = supabase
    .from('pg_service_requests')
    .select('*, tenant:tenants(name, phone, pg_bed_id), property:properties(title)')
    .order('created_at', { ascending: false });

  if (profile.role === 'broker' || profile.role === 'pg_owner') {
    query = query.eq('broker_id', profile.id);
    if (filters?.property_id) query = query.eq('property_id', filters.property_id);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('email', profile.email)
      .eq('is_active', true)
      .single();
    if (!tenant) return { data: [] };
    query = query.eq('tenant_id', tenant.id);
  }

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  // For broker side, enrich with room info
  if ((profile.role === 'broker' || profile.role === 'pg_owner') && data) {
    const enrichedData = await Promise.all(data.map(async (req) => {
      if (req.tenant?.pg_bed_id) {
        const { data: bed } = await supabase
          .from('pg_beds')
          .select('bed_number, room:pg_rooms(room_number)')
          .eq('id', req.tenant.pg_bed_id)
          .single();
        if (bed) {
          const roomObj = Array.isArray(bed.room) ? bed.room[0] : bed.room;
          return {
            ...req,
            roomInfo: `Room ${(roomObj as any)?.room_number} - Bed ${bed.bed_number}`
          };
        }
      }
      return { ...req, roomInfo: 'N/A' };
    }));
    return { data: enrichedData };
  }

  return { data: data || [] };
}

export async function createPgServiceRequest(data: PgServiceRequestInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_service_requests').insert(data);
  if (error) return { error: error.message };
  revalidatePath('/tenant/service-requests');
  revalidatePath('/pg/service-requests');
  return { success: true };
}

export async function updatePgServiceRequest(id: string, data: PgServiceRequestUpdate) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('pg_service_requests')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tenant/service-requests');
  revalidatePath('/pg/service-requests');
  return { success: true };
}

export async function deletePgServiceRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_service_requests').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/tenant/service-requests');
  return { success: true };
}
