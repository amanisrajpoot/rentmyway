-- Migration Phase 8: Ratings, Deposits, and e-Signing 

-- ==========================================
-- 1. Property Ratings (Internal)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.property_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  categories JSONB DEFAULT '{}'::jsonb, -- e.g., {"cleanliness": 4, "maintenance": 5, "communication": 3}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.property_ratings ENABLE ROW LEVEL SECURITY;

-- Policies for property_ratings
-- Tenants can insert their own ratings
CREATE POLICY "Tenants can insert own ratings" ON public.property_ratings
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Brokers can view ratings for their properties
CREATE POLICY "Brokers can view ratings for their properties" ON public.property_ratings
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM public.properties WHERE broker_id = auth.uid()
    )
  );

-- ==========================================
-- 2. Deposit Transactions
-- ==========================================
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('advance', 'deduction', 'refund')),
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT, -- required for deductions
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- Brokers can manage deposits for their tenants
CREATE POLICY "Brokers manage deposits" ON public.deposit_transactions
  FOR ALL USING (broker_id = auth.uid());

-- Tenants can view their own deposits
CREATE POLICY "Tenants view own deposits" ON public.deposit_transactions
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email'
    )
  );

-- ==========================================
-- 3. e-Signing (Aadhaar Stub)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.esign_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  aadhaar_last4 VARCHAR(4),
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verified_at TIMESTAMP WITH TIME ZONE,
  session_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agreement_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  signature_type TEXT CHECK (signature_type IN ('aadhaar_esign', 'manual')),
  signature_data TEXT, -- Can be the e-Sign payload or base64 of manual signature
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.esign_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;

-- Brokers can view all
CREATE POLICY "Brokers view esign sessions" ON public.esign_sessions
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE property_id IN (
        SELECT id FROM public.properties WHERE broker_id = auth.uid()
      )
    )
  );

CREATE POLICY "Brokers view signatures" ON public.agreement_signatures
  FOR SELECT USING (
    property_id IN (
      SELECT id FROM public.properties WHERE broker_id = auth.uid()
    )
  );

-- Tenants manage their own
CREATE POLICY "Tenants manage esign sessions" ON public.esign_sessions
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Tenants manage signatures" ON public.agreement_signatures
  FOR ALL USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Add database types update trigger (if using typescript generator)
-- You may need to manually run `npx supabase gen types typescript --local > src/types/database.ts`
