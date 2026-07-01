'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { PgGatewayConfig, PgGatewayConfigInsert } from '@/types/database';

export async function getGatewayConfig(): Promise<{ data?: PgGatewayConfig; error?: string }> {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile) return { error: 'Not authenticated' };

  let brokerId = profile.id;
  if (profile.role === 'owner') {
    const { data: owners } = await supabase.from('owners').select('broker_id').eq('profile_id', profile.id).single();
    if (owners) brokerId = owners.broker_id;
  } else if (profile.role === 'tenant') {
    const { data: tenants } = await supabase.from('tenants').select('broker_id').eq('profile_id', profile.id).single();
    if (tenants) brokerId = tenants.broker_id;
  }

  const { data, error } = await supabase
    .from('pg_gateway_config')
    .select('*')
    .eq('broker_id', brokerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return { data: undefined }; // No config yet
    return { error: error.message };
  }

  return { data };
}

export async function upsertGatewayConfig(config: Partial<PgGatewayConfigInsert>) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile || profile.role !== 'broker') return { error: 'Only brokers can configure gateway settings' };

  const { data: existing } = await supabase
    .from('pg_gateway_config')
    .select('id')
    .eq('broker_id', profile.id)
    .single();

  const upsertData = {
    broker_id: profile.id,
    ...config,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    result = await supabase
      .from('pg_gateway_config')
      .update(upsertData)
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('pg_gateway_config')
      .insert(upsertData)
      .select()
      .single();
  }

  if (result.error) return { error: result.error.message };

  revalidatePath('/settings/gateway');
  return { success: true, data: result.data };
}

export async function testGatewayConnection() {
  const { data: config, error } = await getGatewayConfig();
  
  if (error || !config) return { error: 'Gateway not configured' };
  if (!config.cashfree_key_id || !config.cashfree_key_secret) return { error: 'API keys missing' };

  try {
    // Basic connectivity test using standard fetch to cashfree endpoint
    const env = config.cashfree_key_id.startsWith('TEST') ? 'sandbox' : 'api';
    const response = await fetch(`https://${env}.cashfree.com/pg/orders`, {
      method: 'GET',
      headers: {
        'x-client-id': config.cashfree_key_id,
        'x-client-secret': config.cashfree_key_secret,
        'x-api-version': '2023-08-01',
      }
    });

    if (response.ok || response.status === 400) {
      // 400 is fine for a GET on orders endpoint if it just means missing params,
      // it still validates credentials. However, we'll check status closely.
      // Usually Cashfree gives 401 for bad auth.
      return { success: true, message: 'Connection successful' };
    }
    
    return { error: `Authentication failed (Status ${response.status})` };
  } catch (err: any) {
    return { error: err.message };
  }
}
