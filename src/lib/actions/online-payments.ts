'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { getGatewayConfig } from './gateway-config';
import { createCashfreeInstance } from '../cashfree';
import { Cashfree } from 'cashfree-pg';
import { revalidatePath } from 'next/cache';

export async function createPaymentOrder(scheduleId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // Fetch schedule and related tenant/property
  const { data: schedule, error: schedError } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(id, name, phone, email), property:properties(id, title)')
    .eq('id', scheduleId)
    .single();

  if (schedError || !schedule) return { error: 'Schedule not found' };
  if (schedule.status === 'paid') return { error: 'Already paid' };

  // Fetch gateway config
  const { data: config } = await getGatewayConfig();
  if (!config || !config.online_payments_enabled) {
    return { error: 'Online payments are not enabled by the broker' };
  }

  // Calculate total amount (base rent + late fee - any applied discounts if we had them)
  let totalAmount = Number(schedule.expected_amount);
  
  // Calculate convenience fee
  let convenienceFee = 0;
  if (config.convenience_fee_amount > 0) {
    if (config.convenience_fee_type === 'percentage') {
      convenienceFee = (totalAmount * Number(config.convenience_fee_amount)) / 100;
    } else {
      convenienceFee = Number(config.convenience_fee_amount);
    }
  }

  const finalAmount = totalAmount + convenienceFee;

  try {
    const cashfree = createCashfreeInstance(config.cashfree_key_id!, config.cashfree_key_secret!);
    
    // Create unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const request = {
      order_amount: finalAmount,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: schedule.tenant_id,
        customer_name: schedule.tenant.name,
        customer_email: schedule.tenant.email || 'tenant@example.com',
        customer_phone: schedule.tenant.phone || '9999999999'
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/verify?order_id={order_id}`
      },
      order_note: `Rent for ${schedule.month_year} - ${schedule.property.title}`
    };

    const response = await cashfree.PGCreateOrder(request);
    
    // Save to online_transactions
    await supabase.from('online_transactions').insert({
      broker_id: schedule.broker_id,
      tenant_id: schedule.tenant_id,
      schedule_id: schedule.id,
      cashfree_order_id: orderId,
      amount: finalAmount,
      status: 'created'
    });

    return { 
      success: true, 
      orderId, 
      paymentSessionId: response.data.payment_session_id,
      amount: finalAmount,
      convenienceFee
    };

  } catch (error: any) {
    console.error("Cashfree order creation failed:", error.response?.data || error);
    return { error: 'Failed to initialize payment gateway' };
  }
}

export async function verifyAndRecordPayment(orderId: string) {
  const supabase = await createClient();
  
  // Get transaction record
  const { data: transaction } = await supabase
    .from('online_transactions')
    .select('*, schedule:rent_schedule(*)')
    .eq('cashfree_order_id', orderId)
    .single();

  if (!transaction) return { error: 'Transaction not found' };
  if (transaction.status === 'paid') return { success: true, message: 'Already verified' };

  // Get config using broker_id from transaction
  const { data: config } = await supabase
    .from('pg_gateway_config')
    .select('*')
    .eq('broker_id', transaction.broker_id)
    .single();

  if (!config) return { error: 'Gateway config missing' };

  try {
    const cashfree = createCashfreeInstance(config.cashfree_key_id!, config.cashfree_key_secret!);
    
    // Fetch order status from Cashfree
    const response = await cashfree.PGFetchOrder(orderId);
    
    if (response.data.order_status === 'PAID') {
      const paymentDate = new Date().toISOString();
      
      // Update transaction
      await supabase.from('online_transactions').update({
        status: 'paid',
        updated_at: paymentDate
      }).eq('id', transaction.id);

      // Create RentPayment record
      const { data: payment } = await supabase.from('rent_payments').insert({
        tenant_id: transaction.tenant_id,
        property_id: transaction.schedule.property_id,
        amount: transaction.amount,
        payment_date: paymentDate.split('T')[0],
        payment_mode: 'online',
        month_year: transaction.schedule.month_year,
        notes: `Online Payment (Order: ${orderId})`,
        status: 'paid',
        broker_id: transaction.broker_id,
        is_online: true,
        cashfree_order_id: orderId
      }).select().single();

      // Update RentSchedule
      if (payment) {
        await supabase.from('rent_schedule').update({
          status: 'paid',
          payment_id: payment.id
        }).eq('id', transaction.schedule_id);
      }

      revalidatePath('/payments');
      return { success: true };
    } else {
      await supabase.from('online_transactions').update({
        status: response.data.order_status?.toLowerCase() || 'attempted',
        updated_at: new Date().toISOString()
      }).eq('id', transaction.id);
      
      return { error: `Payment status is ${response.data.order_status}` };
    }

  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return { error: 'Payment verification failed' };
  }
}

export async function generatePaymentLink(scheduleId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const { data: schedule } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(name, phone, email), property:properties(title)')
    .eq('id', scheduleId)
    .single();

  if (!schedule) return { error: 'Schedule not found' };
  if (schedule.status === 'paid') return { error: 'Already paid' };

  const { data: config } = await getGatewayConfig();
  if (!config || !config.online_payments_enabled) {
    return { error: 'Online payments not enabled' };
  }

  try {
    const cashfree = createCashfreeInstance(config.cashfree_key_id!, config.cashfree_key_secret!);
    
    const linkId = `link_${Date.now()}`;
    const amount = Number(schedule.expected_amount); // Add convenience fee if needed

    const request = {
      link_id: linkId,
      link_amount: amount,
      link_currency: "INR",
      link_purpose: `Rent for ${schedule.month_year} - ${schedule.property.title}`,
      customer_details: {
        customer_phone: schedule.tenant.phone || '9999999999',
        customer_email: schedule.tenant.email || 'tenant@example.com',
        customer_name: schedule.tenant.name
      },
      link_notify: {
        send_sms: true,
        send_email: true
      }
    };

    const response = await cashfree.PGCreateLink(request as any);
    
    // Save link to DB
    await supabase.from('payment_links').insert({
      schedule_id: schedule.id,
      cashfree_link_id: linkId,
      short_url: response.data.link_url,
      amount: amount,
      status: 'created'
    });

    // Update schedule
    await supabase.from('rent_schedule').update({
      payment_link_url: response.data.link_url,
      payment_link_id: linkId
    }).eq('id', schedule.id);

    revalidatePath('/payments');
    return { success: true, url: response.data.link_url };

  } catch (error: any) {
    console.error("Payment link generation failed:", error.response?.data || error);
    return { error: 'Failed to generate payment link' };
  }
}
