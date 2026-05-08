-- ============================================
-- RentMyWay — Phase 2 Migration
-- Operations Enhancement & Tenant Self-Service
-- ============================================

-- ============================================
-- 1. ENHANCE COMPLAINTS
-- ============================================
-- Add categories, vendor info, resolution details, and ratings
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('plumbing','electrical','carpentry','painting','pest_control','appliance','structural','cleaning','security','other')),
  ADD COLUMN IF NOT EXISTS assigned_to TEXT,  -- vendor/contractor name
  ADD COLUMN IF NOT EXISTS assigned_phone TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_images TEXT[],
  ADD COLUMN IF NOT EXISTS tenant_rating INTEGER CHECK (tenant_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS tenant_feedback TEXT,
  ADD COLUMN IF NOT EXISTS sla_response_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS sla_resolution_hours INTEGER DEFAULT 72;

-- ============================================
-- 2. MAINTENANCE_SCHEDULE (Recurring Tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS public.maintenance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('plumbing','electrical','carpentry','painting','pest_control','appliance','structural','cleaning','security','other')),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','half_yearly','yearly','custom')),
  custom_days INTEGER,
  last_completed DATE,
  next_due DATE NOT NULL,
  estimated_cost NUMERIC,
  vendor_name TEXT,
  vendor_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.maintenance_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage maintenance schedule" ON public.maintenance_schedule
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Owners can view maintenance for their properties" ON public.maintenance_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      JOIN public.owners ON owners.id = properties.owner_id
      WHERE properties.id = maintenance_schedule.property_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_maint_property ON public.maintenance_schedule(property_id);
CREATE INDEX idx_maint_next_due ON public.maintenance_schedule(next_due);

-- ============================================
-- 3. OWNER_EXPENSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.owner_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  category TEXT NOT NULL CHECK (category IN (
    'property_tax','insurance','loan_emi','society_charges',
    'renovation','legal','registration','brokerage','other'
  )),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly','quarterly','yearly')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.owner_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage owner expenses" ON public.owner_expenses
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Owners can view their expenses" ON public.owner_expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.owners
      WHERE owners.id = owner_expenses.owner_id
      AND owners.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_owner_expenses_owner ON public.owner_expenses(owner_id);
CREATE INDEX idx_owner_expenses_property ON public.owner_expenses(property_id);

-- ============================================
-- 4. OWNER_DOCUMENTS (Property Vault)
-- ============================================
CREATE TABLE IF NOT EXISTS public.owner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'sale_deed','property_tax_receipt','insurance_policy',
    'society_noc','encumbrance_certificate','index_ii',
    '7_12_extract','building_plan','completion_certificate','other'
  )),
  file_url TEXT NOT NULL,
  file_name TEXT,
  expiry_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.owner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage owner documents" ON public.owner_documents
  FOR ALL USING (auth.uid() = (SELECT broker_id FROM public.owners WHERE id = owner_id));

CREATE POLICY "Owners can view their documents" ON public.owner_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.owners
      WHERE owners.id = owner_documents.owner_id
      AND owners.profile_id = auth.uid()
    )
  );

-- ============================================
-- 5. MOVE_OUT_REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.move_out_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  
  requested_date DATE NOT NULL,
  notice_served_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Checklist
  keys_returned BOOLEAN DEFAULT false,
  property_inspected BOOLEAN DEFAULT false,
  dues_cleared BOOLEAN DEFAULT false,
  deposit_refunded BOOLEAN DEFAULT false,
  deposit_refund_amount NUMERIC,
  deductions NUMERIC DEFAULT 0,
  deduction_reason TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','inspection_scheduled','completed','cancelled')),
  broker_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.move_out_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage move-out requests" ON public.move_out_requests
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can manage their move-out requests" ON public.move_out_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.id = move_out_requests.tenant_id
      AND tenants.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_move_out_tenant ON public.move_out_requests(tenant_id);
CREATE INDEX idx_move_out_status ON public.move_out_requests(status);

-- ============================================
-- 6. EMERGENCY_CONTACTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'plumber', 'electrician', 'security', etc.
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view emergency contacts for their property" ON public.emergency_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tenants
      WHERE tenants.property_id = emergency_contacts.property_id
      AND tenants.profile_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view emergency contacts for their properties" ON public.emergency_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties
      JOIN public.owners ON owners.id = properties.owner_id
      WHERE properties.id = emergency_contacts.property_id
      AND owners.profile_id = auth.uid()
    )
  );
