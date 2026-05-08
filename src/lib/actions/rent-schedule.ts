'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { revalidatePath } from 'next/cache';
import type { RentScheduleInsert } from '@/types/database';

export async function getRentSchedule(filters?: {
  tenantId?: string;
  status?: string;
  month?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  let query = supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(id, name, phone), property:properties(id, title, locality)')
    .order('due_date', { ascending: false });

  if (profile.role === 'broker') {
    query = query.eq('broker_id', profile.id);
  } else if (profile.role === 'tenant') {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .or(`profile_id.eq.${profile.id},email.eq.${profile.email}`)
      .eq('is_active', true)
      .single();
    if (!tenant) return [];
    query = query.eq('tenant_id', tenant.id);
  }

  if (filters?.tenantId) {
    query = query.eq('tenant_id', filters.tenantId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.month) {
    query = query.eq('month_year', filters.month);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function generateRentSchedule(
  tenantId: string,
  propertyId: string,
  leaseId: string,
  monthlyRent: number,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) throw new Error('Not authenticated');

  const start = new Date(startDate);
  const end = new Date(endDate);
  const entries: RentScheduleInsert[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    const monthYear = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    // Due date is the 5th of each month (configurable later)
    const dueDate = new Date(current.getFullYear(), current.getMonth(), 5);
    // If the lease starts mid-month, first due date is 5th of start month or next month
    if (dueDate < start) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    entries.push({
      tenant_id: tenantId,
      property_id: propertyId,
      lease_id: leaseId,
      broker_id: profile.id,
      month_year: monthYear,
      expected_amount: monthlyRent,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      payment_id: null,
    });

    current.setMonth(current.getMonth() + 1);
  }

  if (entries.length > 0) {
    const { error } = await supabase.from('rent_schedule').insert(entries);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/payments');
  return entries.length;
}

export async function markScheduleAsPaid(
  scheduleId: string,
  paymentId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rent_schedule')
    .update({ status: 'paid', payment_id: paymentId })
    .eq('id', scheduleId);

  if (error) throw new Error(error.message);
  revalidatePath('/payments');
}

export async function markScheduleAsOverdue(scheduleId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rent_schedule')
    .update({ status: 'overdue' })
    .eq('id', scheduleId);

  if (error) throw new Error(error.message);
  revalidatePath('/payments');
}

export async function getOverdueRents() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .eq('broker_id', profile.id)
    .in('status', ['pending', 'overdue'])
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUpcomingDues(daysAhead: number = 7) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return [];

  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .eq('broker_id', profile.id)
    .eq('status', 'pending')
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', future.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getRentSummary() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return null;

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const { data: schedules } = await supabase
    .from('rent_schedule')
    .select('status, expected_amount')
    .eq('broker_id', profile.id)
    .eq('month_year', currentMonth);

  const items = schedules || [];
  const totalExpected = items.reduce((sum, s) => sum + s.expected_amount, 0);
  const collected = items.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.expected_amount, 0);
  const pending = items.filter(s => s.status === 'pending').length;
  const overdue = items.filter(s => s.status === 'overdue').length;
  const paid = items.filter(s => s.status === 'paid').length;

  return {
    currentMonth,
    totalExpected,
    collected,
    pending,
    overdue,
    paid,
    total: items.length,
    collectionRate: items.length > 0 ? Math.round((paid / items.length) * 100) : 0,
  };
}
