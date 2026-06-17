'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { PgRuleInsert, PgRuleUpdate } from '@/types/database';

export async function getPgRules(propertyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pg_rules')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function createPgRule(data: PgRuleInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: rule, error } = await supabase
    .from('pg_rules')
    .insert({ ...data, broker_id: profile.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    user_id: profile.id,
    action: 'Created PG Rule',
    entity_type: 'pg_rule',
    entity_id: rule.id,
    details: { rule_type: data.rule_type, property_id: data.property_id },
  });

  revalidatePath('/pg/rules');
  return { data: rule };
}

export async function updatePgRule(id: string, data: PgRuleUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_rules').update(data).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/rules');
  return { success: true };
}

export async function deletePgRule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('pg_rules').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/pg/rules');
  return { success: true };
}
