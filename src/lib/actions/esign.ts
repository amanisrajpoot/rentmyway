'use server';

import { createClient } from '@/lib/supabase/server';

export async function initiateESign(tenantId: string) {
  const supabase = await createClient();

  // Create a pending session
  const { data: session, error } = await supabase
    .from('esign_sessions')
    .insert({
      tenant_id: tenantId,
      verification_status: 'pending',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01') {
      console.warn('esign_sessions table does not exist. Please run migration-phase8.sql');
      return { success: true, data: { id: 'mock-session-id', tenant_id: tenantId } };
    }
    return { error: error.message };
  }

  return { success: true, data: session };
}

export async function verifyAadhaarOtp(sessionId: string, otp: string, last4: string, tenantId: string) {
  // Mock verification - any 6 digit OTP works
  if (otp.length !== 6) {
    return { error: 'Invalid OTP length' };
  }

  const supabase = await createClient();

  // Mark session verified
  const { error: sessionError } = await supabase
    .from('esign_sessions')
    .update({
      verification_status: 'verified',
      aadhaar_last4: last4,
      verified_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (sessionError && sessionError.code !== '42P01') {
    return { error: sessionError.message };
  }

  // Look for property to attach signature
  const { data: tenant } = await supabase
    .from('tenants')
    .select('property_id')
    .eq('id', tenantId)
    .single();

  if (tenant) {
    // Record signature
    await supabase.from('agreement_signatures').insert({
      property_id: tenant.property_id,
      tenant_id: tenantId,
      signature_type: 'aadhaar_esign',
      signature_data: `Aadhaar XXXX-XXXX-${last4} Verified via OTP`,
    });
  }

  return { success: true };
}
