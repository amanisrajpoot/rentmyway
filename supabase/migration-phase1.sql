-- ============================================
-- RentMyWay — Phase 1 Migration
-- Lease & Rent Management Expansion
-- Run this in Supabase SQL Editor AFTER the base migration
-- ============================================

-- ============================================
-- 1. LEASE AGREEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.lease_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),

  -- Lease Terms
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  lock_in_months INTEGER DEFAULT 6,
  notice_period_days INTEGER DEFAULT 30,

  -- Financial Terms
  monthly_rent NUMERIC NOT NULL,
  security_deposit NUMERIC NOT NULL,
  maintenance_charge NUMERIC DEFAULT 0,
  escalation_percent NUMERIC DEFAULT 5,
  escalation_frequency_months INTEGER DEFAULT 12,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','expiring','expired','renewed','terminated')),

  -- Renewal
  renewed_from_id UUID REFERENCES public.lease_agreements(id),
  renewal_notes TEXT,

  -- Agreement Document
  agreement_url TEXT,

  -- Termination
  terminated_at DATE,
  termination_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage leases" ON public.lease_agreements
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view their leases" ON public.lease_agreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = lease_agreements.tenant_id
      AND tenants.profile_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view leases for their properties" ON public.lease_agreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      JOIN public.owners ON owners.id = properties.owner_id
      WHERE properties.id = lease_agreements.property_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_leases_broker ON public.lease_agreements(broker_id);
CREATE INDEX idx_leases_tenant ON public.lease_agreements(tenant_id);
CREATE INDEX idx_leases_property ON public.lease_agreements(property_id);
CREATE INDEX idx_leases_status ON public.lease_agreements(status);
CREATE INDEX idx_leases_end_date ON public.lease_agreements(end_date);

-- ============================================
-- 2. ENHANCE RENT_PAYMENTS
-- ============================================
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT,
  ADD COLUMN IF NOT EXISTS late_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES public.profiles(id);

-- Add check constraint for status (only if column was just added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rent_payments_status_check'
  ) THEN
    ALTER TABLE public.rent_payments
      ADD CONSTRAINT rent_payments_status_check
      CHECK (status IN ('pending','paid','partial','overdue','waived'));
  END IF;
END $$;

-- ============================================
-- 3. RENT SCHEDULE (Expected Monthly Payments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rent_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.lease_agreements(id) ON DELETE SET NULL,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  month_year TEXT NOT NULL,
  expected_amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','partial','overdue','waived')),
  payment_id UUID REFERENCES public.rent_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rent_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage rent schedule" ON public.rent_schedule
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view their rent schedule" ON public.rent_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = rent_schedule.tenant_id
      AND (tenants.profile_id = auth.uid() OR tenants.email = (
        SELECT email FROM public.profiles WHERE id = auth.uid()
      ))
    )
  );

CREATE INDEX idx_rent_schedule_tenant ON public.rent_schedule(tenant_id);
CREATE INDEX idx_rent_schedule_property ON public.rent_schedule(property_id);
CREATE INDEX idx_rent_schedule_status ON public.rent_schedule(status);
CREATE INDEX idx_rent_schedule_due ON public.rent_schedule(due_date);

-- ============================================
-- 4. OWNER PAYOUTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.owner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  for_month TEXT NOT NULL,
  payment_date DATE,
  payment_mode TEXT CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.owner_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage payouts" ON public.owner_payouts
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Owners can view their payouts" ON public.owner_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.owners
      WHERE owners.id = owner_payouts.owner_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_payouts_owner ON public.owner_payouts(owner_id);
CREATE INDEX idx_payouts_broker ON public.owner_payouts(broker_id);
CREATE INDEX idx_payouts_property ON public.owner_payouts(property_id);

-- ============================================
-- 5. UTILITY BILLS
-- ============================================
CREATE TABLE IF NOT EXISTS public.utility_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  bill_type TEXT NOT NULL CHECK (bill_type IN ('electricity','water','gas','internet','maintenance','society','other')),
  amount NUMERIC NOT NULL,
  bill_date DATE NOT NULL,
  due_date DATE,
  bill_month TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  paid_by TEXT CHECK (paid_by IN ('tenant','owner','broker')),
  bill_image_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage utility bills" ON public.utility_bills
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view their utility bills" ON public.utility_bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = utility_bills.tenant_id
      AND (tenants.profile_id = auth.uid() OR tenants.email = (
        SELECT email FROM public.profiles WHERE id = auth.uid()
      ))
    )
  );

CREATE POLICY "Owners can view utility bills for their properties" ON public.utility_bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      JOIN public.owners ON owners.id = properties.owner_id
      WHERE properties.id = utility_bills.property_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_utility_bills_property ON public.utility_bills(property_id);
CREATE INDEX idx_utility_bills_tenant ON public.utility_bills(tenant_id);
CREATE INDEX idx_utility_bills_status ON public.utility_bills(status);

-- ============================================
-- 6. NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'rent_due','rent_overdue','rent_paid',
    'complaint_created','complaint_updated','complaint_resolved',
    'lease_expiring','lease_renewed','lease_created',
    'maintenance_scheduled','maintenance_completed',
    'announcement','document_uploaded','move_out','general'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================
-- 7. ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert activity" ON public.activity_log
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_activity_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON public.activity_log(created_at DESC);

-- ============================================
-- Done! Phase 1 migration complete.
-- ============================================
