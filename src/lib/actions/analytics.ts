'use server';

import { createClient } from '@/lib/supabase/server';
import { startOfMonth, endOfMonth, subMonths, format, isAfter, isBefore } from 'date-fns';

export async function getBrokerAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Occupancy Data
  const { data: properties } = await supabase
    .from('properties')
    .select('status');
  
  const occupancy = {
    occupied: properties?.filter(p => p.status === 'rented').length || 0,
    vacant: properties?.filter(p => p.status === 'available').length || 0,
    maintenance: properties?.filter(p => p.status === 'maintenance').length || 0,
    total: properties?.length || 0,
  };

  // 2. Revenue Trends (Last 6 months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    return format(date, 'MMM yyyy');
  }).reverse();

  const { data: payments } = await supabase
    .from('rent_payments')
    .select('amount, payment_date')
    .gte('payment_date', format(subMonths(new Date(), 6), 'yyyy-MM-dd'));

  const revenueTrends = last6Months.map(month => {
    const monthTotal = payments
      ?.filter(p => format(new Date(p.payment_date), 'MMM yyyy') === month)
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    return { month, amount: monthTotal };
  });

  // 3. Lead Conversion
  const { data: leads } = await supabase
    .from('leads')
    .select('status');
  
  const leadStats = {
    new: leads?.filter(l => l.status === 'new').length || 0,
    contacted: leads?.filter(l => l.status === 'contacted').length || 0,
    viewing: leads?.filter(l => l.status === 'viewing').length || 0,
    negotiating: leads?.filter(l => l.status === 'negotiating').length || 0,
    converted: leads?.filter(l => l.status === 'converted').length || 0,
    lost: leads?.filter(l => l.status === 'lost').length || 0,
  };

  // 4. Commission Stats
  const { data: commissions } = await supabase
    .from('broker_commissions')
    .select('computed_amount, status');
  
  const commissionStats = {
    total: commissions?.reduce((sum, c) => sum + Number(c.computed_amount), 0) || 0,
    received: commissions?.filter(c => c.status === 'received').reduce((sum, c) => sum + Number(c.computed_amount), 0) || 0,
    pending: commissions?.filter(c => c.status !== 'received').reduce((sum, c) => sum + Number(c.computed_amount), 0) || 0,
  };

  return {
    occupancy,
    revenueTrends,
    leadStats,
    commissionStats
  };
}

export async function getOwnerAnalytics() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('profile_id', user.id)
    .single();
  
  if (!owner) return null;

  // 1. Property Performance
  const { data: props } = await supabase
    .from('properties')
    .select(`
      id, title, status,
      rent_payments(amount),
      owner_expenses(amount)
    `)
    .eq('owner_id', owner.id);

  const propertyPerformance = props?.map(p => {
    const totalRent = (p.rent_payments as any[])?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    const totalExp = (p.owner_expenses as any[])?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    return {
      title: p.title,
      rent: totalRent,
      expenses: totalExp,
      net: totalRent - totalExp,
      yield: totalRent > 0 ? ((totalRent - totalExp) / totalRent) * 100 : 0
    };
  }) || [];

  // 2. Monthly Cashflow (Last 6 months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    return format(date, 'MMM yyyy');
  }).reverse();

  const { data: allRent } = await supabase
    .from('rent_payments')
    .select('amount, payment_date')
    .in('property_id', props?.map(p => p.id) || []);

  const { data: allExp } = await supabase
    .from('owner_expenses')
    .select('amount, date')
    .eq('owner_id', owner.id);

  const cashflow = last6Months.map(month => {
    const rent = allRent
      ?.filter(r => format(new Date(r.payment_date), 'MMM yyyy') === month)
      .reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    
    const exp = allExp
      ?.filter(e => format(new Date(e.date), 'MMM yyyy') === month)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    return { month, rent, expenses: exp, net: rent - exp };
  });

  return {
    propertyPerformance,
    cashflow
  };
}
