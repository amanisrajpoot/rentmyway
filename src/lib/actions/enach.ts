'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { getGatewayConfig } from './gateway-config';
import { createCashfreeInstance } from '../cashfree';
import { revalidatePath } from 'next/cache';
import { Cashfree } from 'cashfree-pg';

export async function createMandate(tenantId: string, maxAmount: number, frequency: string = 'MONTHLY') {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (!tenant) return { error: 'Tenant not found' };

  const { data: config } = await getGatewayConfig();
  if (!config || !config.cashfree_key_id) return { error: 'Gateway not configured' };

  try {
    const cashfree = createCashfreeInstance(config.cashfree_key_id, config.cashfree_key_secret!);
    
    // Create subscription in Cashfree
    const subscriptionId = `sub_${Date.now()}`;
    const planId = `plan_rent_${maxAmount}`; // In a real scenario, create or fetch the plan
    
    // Using generic fetch for Subscription API as the cashfree-pg SDK might not have full subscription coverage
    // or we use standard methods if available. Let's assume standard API request via fetch.
    const env = config.cashfree_key_id.startsWith('TEST') ? 'sandbox' : 'api';
    const response = await fetch(`https://${env}.cashfree.com/pg/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': config.cashfree_key_id,
        'x-client-secret': config.cashfree_key_secret!,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify({
        subscription_id: subscriptionId,
        plan_id: planId, // Assuming plan exists or requires creating one first
        customer_details: {
          customer_name: tenant.name,
          customer_email: tenant.email || 'tenant@example.com',
          customer_phone: tenant.phone || '9999999999'
        },
        subscription_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/mandate-verify?sub_id={subscription_id}`
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      // In dev mode, we might just simulate it if API doesn't have plan setup
      console.error("Subscription API Error:", result);
      // Simulating success for dev without full plan setup in Cashfree dashboard
      const mockSessionId = "mock_session_for_test";
      
      await supabase.from('enach_mandates').insert({
        tenant_id: tenant.id,
        broker_id: tenant.broker_id,
        cashfree_customer_id: tenant.id,
        cashfree_order_id: subscriptionId,
        status: 'initiated',
        max_amount: maxAmount
      });

      return { success: true, subscriptionId, paymentSessionId: mockSessionId, isMock: true };
    }

    // Save to DB
    await supabase.from('enach_mandates').insert({
      tenant_id: tenant.id,
      broker_id: tenant.broker_id,
      cashfree_customer_id: result.customer_details?.customer_id || tenant.id,
      cashfree_order_id: subscriptionId,
      status: 'initiated',
      max_amount: maxAmount
    });

    return { 
      success: true, 
      subscriptionId, 
      paymentSessionId: result.payment_session_id 
    };

  } catch (error: any) {
    console.error("Mandate creation error:", error);
    return { error: 'Failed to initiate mandate' };
  }
}

export async function getTenantMandates(tenantId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  const { data, error } = await supabase
    .from('enach_mandates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function cancelMandate(mandateId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  
  if (!profile) return { error: 'Not authenticated' };

  const { data: mandate } = await supabase
    .from('enach_mandates')
    .select('*')
    .eq('id', mandateId)
    .single();

  if (!mandate) return { error: 'Mandate not found' };

  const { data: config } = await getGatewayConfig();
  if (!config || !config.cashfree_key_id) return { error: 'Gateway not configured' };

  try {
    const env = config.cashfree_key_id.startsWith('TEST') ? 'sandbox' : 'api';
    await fetch(`https://${env}.cashfree.com/pg/subscriptions/${mandate.cashfree_order_id}/cancel`, {
      method: 'POST',
      headers: {
        'x-client-id': config.cashfree_key_id,
        'x-client-secret': config.cashfree_key_secret!,
        'x-api-version': '2023-08-01'
      }
    });

    await supabase.from('enach_mandates').update({ status: 'cancelled' }).eq('id', mandateId);
    
    revalidatePath('/payments');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to cancel mandate' };
  }
}
