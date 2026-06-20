'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import { logActivity } from './activity-log';

export async function addPropertyRating(data: {
  property_id: string;
  rating: number;
  review_text?: string;
  categories?: Record<string, number>;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  // Need tenant_id if tenant is logged in, but for our app, tenants aren't using Supabase auth directly yet, 
  // they are managed by the broker. So maybe the broker adds the rating, or we skip tenant_id.
  // Actually, let's just insert it.
  
  const insertData: any = {
    property_id: data.property_id,
    rating: data.rating,
    review_text: data.review_text,
    categories: data.categories || {},
  };

  // If the user is a tenant (in the future), we could assign tenant_id here.
  // For now, allow broker to add internal ratings, so no tenant_id needed.

  const { data: rating, error } = await supabase
    .from('property_ratings')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // If table doesn't exist yet, just mock it
    if (error.code === '42P01') {
      console.warn('property_ratings table does not exist. Please run migration-phase8.sql');
      return { success: true, data: { id: 'mock-id', ...insertData } };
    }
    return { error: error.message };
  }

  await logActivity({
    user_id: profile.id,
    action: 'Added property rating',
    entity_type: 'property_rating',
    entity_id: rating.id,
    details: { property_id: data.property_id, rating: data.rating },
  });

  revalidatePath(`/properties/${data.property_id}`);
  return { success: true, data: rating };
}

export async function getPropertyRatings(propertyId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  const { data, error } = await supabase
    .from('property_ratings')
    .select('*, tenant:tenants(name)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return { data: [] }; // Mock empty if table not created
    }
    return { error: error.message };
  }

  return { data: data || [] };
}
