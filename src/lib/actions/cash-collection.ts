'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function generateCashCollectionOTP(scheduleId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: schedule } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(id, phone, name)')
    .eq('id', scheduleId)
    .single();

  if (!schedule || !schedule.tenant) return { error: 'Schedule or tenant not found' };

  // Expire any existing pending OTPs for this schedule
  await supabase
    .from('cash_collection_otps')
    .update({ status: 'expired' })
    .eq('schedule_id', scheduleId)
    .eq('status', 'pending');

  const otp = generateOTP();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

  const { error } = await supabase.from('cash_collection_otps').insert({
    schedule_id: scheduleId,
    tenant_id: schedule.tenant.id,
    collector_id: profile.id,
    otp_code: otp,
    expires_at: expiresAt.toISOString(),
    status: 'pending'
  });

  if (error) return { error: 'Failed to generate OTP' };

  // Simulate sending OTP via WhatsApp
  console.log(`[WhatsApp Mock] Sending OTP ${otp} to ${schedule.tenant.name} (${schedule.tenant.phone}) for cash collection.`);

  return { success: true, message: 'OTP sent to tenant via WhatsApp' };
}

export async function verifyCashCollectionOTP(scheduleId: string, otpCode: string, amount: number) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: otpRecord } = await supabase
    .from('cash_collection_otps')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('otp_code', otpCode)
    .eq('status', 'pending')
    .single();

  if (!otpRecord) return { error: 'Invalid or expired OTP' };

  if (new Date(otpRecord.expires_at) < new Date()) {
    await supabase.from('cash_collection_otps').update({ status: 'expired' }).eq('id', otpRecord.id);
    return { error: 'OTP has expired' };
  }

  // OTP verified, record payment
  await supabase.from('cash_collection_otps').update({ status: 'verified' }).eq('id', otpRecord.id);

  const { data: schedule } = await supabase
    .from('rent_schedule')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (!schedule) return { error: 'Schedule not found' };

  const paymentDate = new Date().toISOString().split('T')[0];

  const { data: payment, error: paymentError } = await supabase.from('rent_payments').insert({
    tenant_id: schedule.tenant_id,
    property_id: schedule.property_id,
    amount: amount,
    payment_date: paymentDate,
    payment_mode: 'cash',
    month_year: schedule.month_year,
    notes: `Cash collected by ${profile.full_name} (OTP Verified)`,
    status: 'paid',
    broker_id: schedule.broker_id,
    is_online: false
  }).select().single();

  if (paymentError || !payment) return { error: 'Failed to record payment' };

  // Update schedule status
  await supabase.from('rent_schedule').update({
    status: 'paid',
    payment_id: payment.id
  }).eq('id', scheduleId);

  revalidatePath('/payments');
  return { success: true };
}
