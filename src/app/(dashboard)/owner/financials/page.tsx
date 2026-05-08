import { getUserProfile } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { FinancialsClient } from './financials-client';

export default async function OwnerFinancialsPage() {
  const profile = await getUserProfile();
  if (!profile || profile.role !== 'owner') redirect('/dashboard');

  const supabase = await createClient();

  // Find owner records
  const { data: owners } = await supabase
    .from('owners')
    .select('id')
    .eq('email', profile.email);
  const ownerIds = owners?.map(o => o.id) || [];

  if (ownerIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">No Financial Data</h2>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t find your owner profile. Please contact your broker.
        </p>
      </div>
    );
  }

  // Get properties
  const { data: properties } = await supabase
    .from('properties')
    .select('id, title, rent, status, locality')
    .in('owner_id', ownerIds);
  const props = properties || [];
  const propertyIds = props.map(p => p.id);

  // Get payouts
  const { data: payouts } = await supabase
    .from('owner_payouts')
    .select('*, owner:owners(id, name, phone), property:properties(id, title, locality)')
    .in('owner_id', ownerIds)
    .order('created_at', { ascending: false });
  const payoutList = payouts || [];

  // Get rent payments for these properties
  const { data: rentPayments } = propertyIds.length > 0
    ? await supabase
        .from('rent_payments')
        .select('amount, payment_date, month_year')
        .in('property_id', propertyIds)
        .order('payment_date', { ascending: false })
        .limit(20)
    : { data: [] };
  const payments = rentPayments || [];

  // Get expenses
  const { data: ownerExpenses } = await supabase
    .from('owner_expenses')
    .select('*, property:properties(title)')
    .in('owner_id', ownerIds)
    .order('date', { ascending: false });
  const expenses = ownerExpenses || [];

  // Calculate stats
  const totalRentCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPayoutsReceived = payoutList.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayouts = payoutList.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const monthlyExpectedRent = props.filter(p => p.status === 'rented').reduce((sum, p) => sum + (p.rent || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <FinancialsClient 
      profile={profile}
      stats={{
        totalRentCollected,
        totalPayoutsReceived,
        pendingPayouts,
        monthlyExpectedRent,
        totalExpenses
      }}
      data={{
        payoutList,
        expenses,
        payments
      }}
    />
  );
}
