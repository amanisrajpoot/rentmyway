'use server';

import { createClient } from '@/lib/supabase/server';
import type { EnquiryInsert } from '@/types/database';

export async function submitEnquiry(data: EnquiryInsert) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('enquiries')
    .insert(data);

  if (error) return { error: error.message };
  
  return { data: { success: true } };
}

export async function getPublicProperties(filters?: {
  city?: string;
  locality?: string;
  type?: string;
  furnishing?: string;
  minRent?: number;
  maxRent?: number;
  parking?: boolean;
  pet_friendly?: boolean;
  bachelor_allowed?: boolean;
  non_veg_allowed?: boolean;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();

  // Using an anonymous client for these public reads.
  // Note: the RLS policy on properties ensures they only get 'available' properties.
  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', 'available');

  if (filters?.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters?.locality) {
    query = query.ilike('locality', `%${filters.locality}%`);
  }
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('property_type', filters.type);
  }
  if (filters?.furnishing && filters.furnishing !== 'all') {
    query = query.eq('furnishing', filters.furnishing);
  }
  if (filters?.minRent !== undefined) {
    query = query.gte('rent', filters.minRent);
  }
  if (filters?.maxRent !== undefined) {
    query = query.lte('rent', filters.maxRent);
  }
  if (filters?.parking) {
    query = query.eq('parking', true);
  }
  if (filters?.pet_friendly) {
    query = query.eq('pet_friendly', true);
  }
  if (filters?.bachelor_allowed) {
    query = query.eq('bachelor_allowed', true);
  }
  if (filters?.non_veg_allowed) {
    query = query.eq('non_veg_allowed', true);
  }

  query = query.order('created_at', { ascending: false });

  // Pagination range
  const limit = filters?.limit ?? 12;
  const page = filters?.page ?? 0;
  const from = page * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) return { error: error.message };
  
  return { data: data || [] };
}

export async function getPublicProperty(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .eq('status', 'available')
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getSimilarProperties(propertyId: string, city: string, type: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'available')
    .eq('city', city)
    .eq('property_type', type)
    .neq('id', propertyId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getMostPopularCity() {
  const supabase = await createClient();
  
  // Fetch a sample of available properties to determine the most common city
  const { data, error } = await supabase
    .from('properties')
    .select('city')
    .eq('status', 'available')
    .limit(50);
    
  if (error || !data || data.length === 0) return 'Mumbai';
  
  const counts = data.reduce((acc, curr) => {
    if (!curr.city) return acc;
    acc[curr.city] = (acc[curr.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let maxCity = 'Mumbai';
  let maxCount = 0;
  for (const [city, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxCity = city;
    }
  }
  
  return maxCity;
}
