'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/actions/auth';
import { logActivity } from './activity-log';
import { revalidatePath } from 'next/cache';
import type { RentScheduleInsert } from '@/types/database';

export async function getRentSchedule(filters?: {
  tenantId?: string;
  status?: string;
  month?: string;
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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
    if (!tenant) return { data: [] };
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
  if (error) return { error: error.message };
  return { data: data || [] };
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
  if (!profile) return { error: 'Not authenticated' };

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
    if (error) return { error: error.message };

    await logActivity({
      user_id: profile.id,
      action: 'Generated Rent Schedule',
      entity_type: 'rent_schedule',
      entity_id: leaseId,
      details: { tenant_id: tenantId, property_id: propertyId, entries_count: entries.length },
    });
  }

  revalidatePath('/payments');
  return { data: entries.length };
}

export async function markScheduleAsPaid(
  scheduleId: string,
  paymentId: string
) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  const { error } = await supabase
    .from('rent_schedule')
    .update({ status: 'paid', payment_id: paymentId })
    .eq('id', scheduleId);

  if (error) return { error: error.message };

  if (profile) {
    await logActivity({
      user_id: profile.id,
      action: 'Marked Rent Paid',
      entity_type: 'rent_schedule',
      entity_id: scheduleId,
      details: { payment_id: paymentId },
    });
  }

  revalidatePath('/payments');
  return { success: true };
}

export async function markScheduleAsOverdue(scheduleId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('rent_schedule')
    .update({ status: 'overdue' })
    .eq('id', scheduleId);

  if (error) return { error: error.message };
  revalidatePath('/payments');
  return { success: true };
}

export async function getOverdueRents() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(name, phone), property:properties(title, locality)')
    .eq('broker_id', profile.id)
    .in('status', ['pending', 'overdue'])
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getUpcomingDues(daysAhead: number = 7) {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { data: [] };

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

  if (error) return { error: error.message };
  return { data: data || [] };
}

export async function getRentSummary() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const { data: schedules, error } = await supabase
    .from('rent_schedule')
    .select('status, expected_amount')
    .eq('broker_id', profile.id)
    .eq('month_year', currentMonth);
    
  if (error) return { error: error.message };

  const items = schedules || [];
  const totalExpected = items.reduce((sum, s) => sum + s.expected_amount, 0);
  const collected = items.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.expected_amount, 0);
  const pending = items.filter(s => s.status === 'pending').length;
  const overdue = items.filter(s => s.status === 'overdue').length;
  const paid = items.filter(s => s.status === 'paid').length;

  return {
    data: {
      currentMonth,
      totalExpected,
      collected,
      pending,
      overdue,
      paid,
      total: items.length,
      collectionRate: items.length > 0 ? Math.round((paid / items.length) * 100) : 0,
    }
  };
}

import { createNotification } from '@/lib/actions/notifications';

export async function runRentAutomation() {
  const supabase = await createClient();
  const profile = await getUserProfile();
  if (!profile) return { error: 'Not authenticated' };

  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch all pending or overdue schedules whose due date has passed
  const { data: overdueSchedules, error: fetchErr } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(id, name, profile_id, phone), property:properties(id, title)')
    .eq('broker_id', profile.id)
    .in('status', ['pending', 'overdue'])
    .lt('due_date', today);

  if (fetchErr) return { error: fetchErr.message };

  let updatedCount = 0;

  for (const schedule of (overdueSchedules || [])) {
    // If status is pending, transition it to overdue
    if (schedule.status === 'pending') {
      const { error: updateErr } = await supabase
        .from('rent_schedule')
        .update({ status: 'overdue' })
        .eq('id', schedule.id);

      if (updateErr) continue;
      updatedCount++;
    }

    // Send notifications to tenant (if profile_id exists) and broker
    const tenantName = schedule.tenant?.name || 'Tenant';
    const propertyTitle = schedule.property?.title || 'your unit';
    const month = schedule.month_year;
    const amount = schedule.expected_amount;

    if (schedule.tenant?.profile_id) {
      await createNotification({
        user_id: schedule.tenant.profile_id,
        type: 'rent_overdue',
        title: 'Rent Overdue Alert',
        message: `Your rent of ₹${amount.toLocaleString('en-IN')} for ${month} at ${propertyTitle} is overdue. Please pay immediately.`,
        link: '/tenant/dashboard',
        metadata: { schedule_id: schedule.id }
      });
    }

    // Notify the broker too
    await createNotification({
      user_id: profile.id,
      type: 'rent_overdue',
      title: `Overdue Rent: ${tenantName}`,
      message: `Rent of ₹${amount.toLocaleString('en-IN')} for ${month} at ${propertyTitle} by ${tenantName} is overdue.`,
      link: '/payments',
      metadata: { schedule_id: schedule.id }
    });
  }

  // 2. Fetch all upcoming schedules (due within next 5 days) and notify the tenant
  const future = new Date();
  future.setDate(future.getDate() + 5);
  const futureStr = future.toISOString().split('T')[0];

  const { data: upcomingSchedules } = await supabase
    .from('rent_schedule')
    .select('*, tenant:tenants(id, name, profile_id), property:properties(id, title)')
    .eq('broker_id', profile.id)
    .eq('status', 'pending')
    .gte('due_date', today)
    .lte('due_date', futureStr);

  for (const schedule of (upcomingSchedules || [])) {
    if (schedule.tenant?.profile_id) {
      const propertyTitle = schedule.property?.title || 'your unit';
      const month = schedule.month_year;
      const amount = schedule.expected_amount;

      // Check if they already have an upcoming notification for this month to avoid duplicates
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', schedule.tenant.profile_id)
        .eq('type', 'rent_due')
        .contains('metadata', { schedule_id: schedule.id })
        .limit(1);

      if (!existing || existing.length === 0) {
        await createNotification({
          user_id: schedule.tenant.profile_id,
          type: 'rent_due',
          title: 'Upcoming Rent Reminder',
          message: `Your rent of ₹${amount.toLocaleString('en-IN')} for ${month} at ${propertyTitle} is due on ${schedule.due_date}.`,
          link: '/tenant/dashboard',
          metadata: { schedule_id: schedule.id }
        });
      }
    }
  }

  revalidatePath('/payments');
  return { data: { updatedCount } };
}

