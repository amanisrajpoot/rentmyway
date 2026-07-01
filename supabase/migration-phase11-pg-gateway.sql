-- ============================================
-- Phase 11: Payment Gateway & Settlements
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. EXTEND ENUMS (if supported, otherwise we rely on app-level validation)
-- Note: PostgreSQL requires ALTER TYPE to add enum values if we were using ENUM types, 
-- but RentMyWay uses TEXT with CHECK constraints.
-- We will update existing check constraints for new payment modes

ALTER TABLE public.rent_payments DROP CONSTRAINT IF EXISTS rent_payments_payment_mode_check;
ALTER TABLE public.rent_payments ADD CONSTRAINT rent_payments_payment_mode_check 
  CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','online','enach','other'));

ALTER TABLE public.owner_payouts DROP CONSTRAINT IF EXISTS owner_payouts_payment_mode_check;
ALTER TABLE public.owner_payouts ADD CONSTRAINT owner_payouts_payment_mode_check 
  CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','online','other'));

-- 2. ADD COLUMNS TO EXISTING TABLES
-- rent_payments
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS convenience_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- rent_schedule
ALTER TABLE public.rent_schedule
  ADD COLUMN IF NOT EXISTS payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS enach_debit_id TEXT;

-- owner_payouts
ALTER TABLE public.owner_payouts
  ADD COLUMN IF NOT EXISTS cashfree_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS settlement_account_id UUID,
  ADD COLUMN IF NOT EXISTS gst_deducted NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_deducted NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS broker_commission NUMERIC DEFAULT 0;

-- 3. NEW TABLES

-- PG Gateway Config
CREATE TABLE IF NOT EXISTS public.pg_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cashfree_app_id TEXT,
  cashfree_secret_key TEXT,
  online_payments_enabled BOOLEAN DEFAULT false,
  convenience_fee_type TEXT DEFAULT 'fixed' CHECK (convenience_fee_type IN ('fixed', 'percentage')),
  convenience_fee_amount NUMERIC DEFAULT 0,
  webhook_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(broker_id)
);

ALTER TABLE public.pg_gateway_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage their pg config" ON public.pg_gateway_config
  FOR ALL USING (auth.uid() = broker_id);

-- Payment Links
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.rent_schedule(id) ON DELETE CASCADE,
  cashfree_link_id TEXT NOT NULL,
  short_url TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage payment links" ON public.payment_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rent_schedule WHERE rent_schedule.id = payment_links.schedule_id AND rent_schedule.broker_id = auth.uid())
  );
CREATE POLICY "Tenants can view payment links" ON public.payment_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rent_schedule rs
      JOIN public.tenants t ON rs.tenant_id = t.id
      WHERE rs.id = payment_links.schedule_id AND t.profile_id = auth.uid()
    )
  );

-- Online Transactions (Gateway logs)
CREATE TABLE IF NOT EXISTS public.online_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  tenant_id UUID REFERENCES public.tenants(id),
  schedule_id UUID REFERENCES public.rent_schedule(id),
  cashfree_order_id TEXT NOT NULL,
  cashfree_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'attempted', 'paid', 'failed')),
  method TEXT,
  error_code TEXT,
  error_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.online_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can view online transactions" ON public.online_transactions
  FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Tenants can view own transactions" ON public.online_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = online_transactions.tenant_id AND tenants.profile_id = auth.uid())
  );

-- E-NACH Mandates
CREATE TABLE IF NOT EXISTS public.enach_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  cashfree_customer_id TEXT,
  cashfree_order_id TEXT,
  cashfree_token_id TEXT,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'active', 'paused', 'cancelled', 'rejected')),
  max_amount NUMERIC NOT NULL,
  bank_name TEXT,
  account_last4 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enach_mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage mandates" ON public.enach_mandates
  FOR ALL USING (auth.uid() = broker_id);
CREATE POLICY "Tenants can view own mandates" ON public.enach_mandates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = enach_mandates.tenant_id AND tenants.profile_id = auth.uid())
  );

-- Settlement Accounts
CREATE TABLE IF NOT EXISTS public.settlement_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  bank_name TEXT,
  cashfree_account_id TEXT,
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.settlement_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage settlement accounts" ON public.settlement_accounts
  FOR ALL USING (auth.uid() = broker_id);
CREATE POLICY "Owners can view own settlement accounts" ON public.settlement_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.owners WHERE owners.id = settlement_accounts.owner_id AND owners.profile_id = auth.uid())
  );

-- Settlement Splits (Rules per property)
CREATE TABLE IF NOT EXISTS public.settlement_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_percent NUMERIC DEFAULT 5.0,
  owner_percent NUMERIC DEFAULT 95.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.settlement_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage settlement splits" ON public.settlement_splits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.properties WHERE properties.id = settlement_splits.property_id AND properties.broker_id = auth.uid())
  );

-- Tax Config
CREATE TABLE IF NOT EXISTS public.tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  gst_enabled BOOLEAN DEFAULT false,
  gst_number TEXT,
  gst_percent NUMERIC DEFAULT 18.0,
  tds_enabled BOOLEAN DEFAULT false,
  tds_percent NUMERIC DEFAULT 10.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id)
);

ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage tax config" ON public.tax_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.properties WHERE properties.id = tax_config.property_id AND properties.broker_id = auth.uid())
  );

-- Cash Collection OTPs
CREATE TABLE IF NOT EXISTS public.cash_collection_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.rent_schedule(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  collector_id UUID NOT NULL REFERENCES public.profiles(id),
  otp_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cash_collection_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can manage cash OTPs" ON public.cash_collection_otps
  FOR ALL USING (auth.uid() = collector_id);

-- Add missing foreign key for settlement_account_id if we didn't define it properly
ALTER TABLE public.owner_payouts
  ADD CONSTRAINT owner_payouts_settlement_account_id_fkey 
  FOREIGN KEY (settlement_account_id) REFERENCES public.settlement_accounts(id) ON DELETE SET NULL;

-- Create Indexes for performance
CREATE INDEX idx_payment_links_schedule ON public.payment_links(schedule_id);
CREATE INDEX idx_online_transactions_order ON public.online_transactions(cashfree_order_id);
CREATE INDEX idx_online_transactions_schedule ON public.online_transactions(schedule_id);
CREATE INDEX idx_enach_mandates_tenant ON public.enach_mandates(tenant_id);
CREATE INDEX idx_settlement_accounts_owner ON public.settlement_accounts(owner_id);
CREATE INDEX idx_cash_otps_schedule ON public.cash_collection_otps(schedule_id);
