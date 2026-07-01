'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { getGatewayConfig } from './gateway-config';
import { createCashfreeInstance } from '../cashfree';
import { revalidatePath } from 'next/cache';
import type { SettlementAccountInsert, SettlementSplitInsert } from '@/types/database';

type AddAccountInput = Omit<SettlementAccountInsert, 'cashfree_account_id' | 'is_verified' | 'broker_id'>;

export async function addSettlementAccount(data: AddAccountInput) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // In a real implementation, we would register the beneficiary with Cashfree Payouts
  // and get a beneficiary/account ID back.
  // We mock the Cashfree beneficiary creation here
  const mockCashfreeAccountId = `bene_${Date.now()}`;

  const { data: account, error } = await supabase.from('settlement_accounts').insert({
    ...data,
    broker_id: profile.id,
    cashfree_account_id: mockCashfreeAccountId,
    is_verified: true
  }).select().single();

  if (error) return { error: error.message };

  if (data.is_default) {
    // Unset other defaults
    await supabase.from('settlement_accounts')
      .update({ is_default: false })
      .eq('owner_id', data.owner_id)
      .neq('id', account.id);
  }

  revalidatePath('/settlements');
  return { success: true, account };
}

export async function getSettlementAccounts(ownerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('settlement_accounts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function configureSettlementSplit(data: SettlementSplitInsert) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'broker') return { error: 'Not authorized' };

  const { data: existing } = await supabase
    .from('settlement_splits')
    .select('id')
    .eq('property_id', data.property_id)
    .single();

  if (existing) {
    const { error } = await supabase.from('settlement_splits').update({
      broker_percent: data.broker_percent,
      owner_percent: data.owner_percent,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('settlement_splits').insert(data);
    if (error) return { error: error.message };
  }

  revalidatePath('/settlements');
  return { success: true };
}

export async function processSettlement(paymentId: string) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  // Get the payment
  const { data: payment } = await supabase
    .from('rent_payments')
    .select('*, property:properties(owner_id)')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };

  // Get settlement split
  const { data: split } = await supabase
    .from('settlement_splits')
    .select('*')
    .eq('property_id', payment.property_id)
    .single();

  const brokerPercent = split?.broker_percent ?? 5; // Default 5%
  const ownerPercent = split?.owner_percent ?? 95; // Default 95%

  const amount = payment.amount;
  // Use TDS amount if we have it calculated (we assume it is pre-calculated on payment)
  const tdsDeducted = payment.tds_amount || 0;
  const gstDeducted = payment.gst_amount || 0;

  const netAmount = amount - tdsDeducted - gstDeducted;
  const brokerCommission = (netAmount * brokerPercent) / 100;
  const ownerAmount = netAmount - brokerCommission;

  // Get owner's default settlement account
  const { data: account } = await supabase
    .from('settlement_accounts')
    .select('*')
    .eq('owner_id', payment.property.owner_id)
    .eq('is_default', true)
    .single();

  if (!account) return { error: 'No default settlement account found for owner' };

  // Mock Cashfree Payout transfer
  const mockTransferId = `trf_${Date.now()}`;

  // Record payout
  const { data: payout, error } = await supabase.from('owner_payouts').insert({
    owner_id: payment.property.owner_id,
    broker_id: payment.broker_id,
    amount: ownerAmount,
    for_month: payment.month_year,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'bank_transfer',
    status: 'completed',
    notes: `Split Settlement (Broker: ${brokerPercent}%, Owner: ${ownerPercent}%)`,
    cashfree_transfer_id: mockTransferId,
    settlement_account_id: account.id,
    broker_commission: brokerCommission,
    gst_deducted: gstDeducted,
    tds_deducted: tdsDeducted
  }).select().single();

  if (error) return { error: error.message };

  revalidatePath('/settlements');
  return { success: true, payout };
}
