'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Simulates sending a WhatsApp message via Interakt API.
 * In a real app, this would be an HTTP POST to https://api.interakt.ai/v1/public/message/
 */
async function sendInteraktWhatsAppMessage(phone: string, templateName: string, bodyValues: string[]) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log(`[Interakt API Stub] Sending template '${templateName}' to ${phone} with values:`, bodyValues);
  
  // Return a mock message ID
  return `msg_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Triggers a manual rent reminder to a specific tenant.
 */
export async function sendRentReminder(tenantId: string, monthYear: string, amountDue: number, phone: string) {
  const supabase = await createClient();

  try {
    // 1. Call Interakt API
    const interaktId = await sendInteraktWhatsAppMessage(
      phone,
      'rent_reminder_v1',
      [monthYear, amountDue.toLocaleString('en-IN')]
    );

    // 2. Log in whatsapp_logs table
    const { error: logError } = await supabase.from('whatsapp_logs').insert({
      tenant_id: tenantId,
      message_type: 'rent_reminder',
      message_content: `Reminder: Rent of ₹${amountDue.toLocaleString('en-IN')} for ${monthYear} is due.`,
      interakt_message_id: interaktId,
      status: 'sent'
    });

    if (logError) {
      console.warn('Failed to insert whatsapp log:', logError);
      // We don't throw because the message was actually sent
    }

    revalidatePath(`/tenants/${tenantId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to send reminder via Interakt' };
  }
}

/**
 * Applies late fee to a specific pending payment.
 * Rule: Fixed ₹100 per day. We just apply a flat ₹100 for this action.
 */
export async function applyLateFee(paymentId: string, currentLateFee: number) {
  const supabase = await createClient();

  try {
    const newLateFee = (currentLateFee || 0) + 100; // Adding ₹100

    const { error } = await supabase
      .from('rent_payments')
      .update({ late_fee_applied: newLateFee })
      .eq('id', paymentId);

    if (error) throw new Error(error.message);

    revalidatePath('/payments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to apply late fee' };
  }
}

/**
 * Retrieves WhatsApp communication logs for a tenant.
 */
export async function getWhatsAppLogs(tenantId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}
