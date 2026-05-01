-- ============================================
-- RentMyWay — Complete Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('broker', 'owner', 'tenant')),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. OWNERS
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their owners" ON public.owners
  FOR ALL USING (auth.uid() = broker_id);

CREATE INDEX idx_owners_broker ON public.owners(broker_id);

-- 3. PROPERTIES
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  owner_id UUID NOT NULL REFERENCES public.owners(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','available','rented')),
  property_type TEXT NOT NULL CHECK (property_type IN ('1bhk','2bhk','3bhk','4bhk','studio','villa','independent_house','pg')),
  furnishing TEXT NOT NULL CHECK (furnishing IN ('unfurnished','semi_furnished','fully_furnished')),
  rent NUMERIC NOT NULL,
  deposit NUMERIC NOT NULL,
  maintenance_charge NUMERIC DEFAULT 0,
  locality TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Maharashtra',
  address TEXT NOT NULL,
  pincode TEXT,
  floor_number INTEGER,
  total_floors INTEGER,
  area_sqft NUMERIC,
  facing TEXT,
  parking BOOLEAN DEFAULT false,
  pet_friendly BOOLEAN DEFAULT false,
  non_veg_allowed BOOLEAN DEFAULT true,
  bachelor_allowed BOOLEAN DEFAULT true,
  preferred_tenant TEXT CHECK (preferred_tenant IN ('family','bachelor','company','any')),
  description TEXT,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their properties" ON public.properties
  FOR ALL USING (auth.uid() = broker_id);

-- Owners can view their own properties
CREATE POLICY "Owners can view their properties" ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.owners
      WHERE owners.id = properties.owner_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_properties_broker ON public.properties(broker_id);
CREATE INDEX idx_properties_owner ON public.properties(owner_id);
CREATE INDEX idx_properties_status ON public.properties(status);

-- 4. LEADS
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT CHECK (source IN ('walkin','99acres','magicbricks','housing','olx','referral','social_media','other')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','site_visit_scheduled','site_visit_done','negotiation','token_paid','converted','lost')),
  budget_min NUMERIC,
  budget_max NUMERIC,
  preferred_locality TEXT,
  preferred_city TEXT,
  preferred_type TEXT,
  preferred_furnishing TEXT,
  move_in_date DATE,
  notes TEXT,
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their leads" ON public.leads
  FOR ALL USING (auth.uid() = broker_id);

CREATE INDEX idx_leads_broker ON public.leads(broker_id);
CREATE INDEX idx_leads_status ON public.leads(status);

-- 5. LEAD_PROPERTY_MATCHES
CREATE TABLE IF NOT EXISTS public.lead_property_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_property_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage matches" ON public.lead_property_matches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_property_matches.lead_id AND leads.broker_id = auth.uid())
  );

-- 6. LEAD_FOLLOW_UPS
CREATE TABLE IF NOT EXISTS public.lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL CHECK (type IN ('call','whatsapp','email','site_visit','meeting','other')),
  notes TEXT,
  follow_up_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their follow-ups" ON public.lead_follow_ups
  FOR ALL USING (auth.uid() = broker_id);

-- 7. TENANTS
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  lead_id UUID REFERENCES public.leads(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  rent_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  move_in_date DATE NOT NULL,
  lease_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  kyc_token TEXT UNIQUE,
  kyc_token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their tenants" ON public.tenants
  FOR ALL USING (auth.uid() = broker_id);

-- Allow anonymous access for KYC token lookup
CREATE POLICY "Public can read tenant by kyc_token" ON public.tenants
  FOR SELECT USING (kyc_token IS NOT NULL);

CREATE INDEX idx_tenants_broker ON public.tenants(broker_id);
CREATE INDEX idx_tenants_property ON public.tenants(property_id);
CREATE INDEX idx_tenants_kyc ON public.tenants(kyc_token);

-- 8. DOCUMENTS (KYC)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('aadhaar','pan','passport','driving_license','rent_agreement','other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view documents" ON public.documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = documents.tenant_id AND tenants.broker_id = auth.uid())
  );

-- Allow public insert for KYC upload
CREATE POLICY "Anyone can upload documents" ON public.documents
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_documents_tenant ON public.documents(tenant_id);

-- 9. UTILITIES
CREATE TABLE IF NOT EXISTS public.utilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  count INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'working' CHECK (condition IN ('working','not_working','needs_repair')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage utilities" ON public.utilities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.properties WHERE properties.id = utilities.property_id AND properties.broker_id = auth.uid())
  );

CREATE INDEX idx_utilities_property ON public.utilities(property_id);

-- 10. COMPLAINTS
CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  utility_id UUID REFERENCES public.utilities(id),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  resolution_notes TEXT,
  cost NUMERIC,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage complaints" ON public.complaints
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view their complaints" ON public.complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = complaints.tenant_id AND tenants.profile_id = auth.uid())
  );

CREATE INDEX idx_complaints_broker ON public.complaints(broker_id);
CREATE INDEX idx_complaints_tenant ON public.complaints(tenant_id);
CREATE INDEX idx_complaints_property ON public.complaints(property_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- 11. RENT_PAYMENTS
CREATE TABLE IF NOT EXISTS public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode TEXT CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','other')),
  month_year TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage payments" ON public.rent_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.id = rent_payments.tenant_id AND tenants.broker_id = auth.uid())
  );

CREATE INDEX idx_payments_tenant ON public.rent_payments(tenant_id);
CREATE INDEX idx_payments_property ON public.rent_payments(property_id);

-- ============================================
-- Storage Bucket for Documents
-- ============================================
-- NOTE: Create a storage bucket called "documents" in the Supabase Dashboard
-- Storage > New Bucket > Name: "documents" > Public: true

-- ============================================
-- Done! All tables, RLS policies, and indexes created.
-- ============================================
