-- Migration Phase 9: India-First CRM Features (Munim + Chowkidar)

-- ==========================================
-- 1. Property Maintenance Schedules
-- ==========================================
CREATE TABLE IF NOT EXISTS public.property_maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- e.g., 'Paint', 'AC Service', 'Water Tank Cleaning'
  last_done_date DATE,
  next_due_date DATE,
  cost_estimate NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.property_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Brokers can manage maintenance" ON public.property_maintenance_schedules
  FOR ALL USING (
    property_id IN (
      SELECT id FROM public.properties WHERE broker_id = auth.uid()
    )
  );

-- ==========================================
-- 2. Modify Tenants (Tenant Passport & Kiraya Score)
-- ==========================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS police_verification_status TEXT DEFAULT 'pending' CHECK (police_verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS emergency_contact_details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kiraya_score INTEGER DEFAULT 800 CHECK (kiraya_score >= 0 AND kiraya_score <= 1000);

-- ==========================================
-- 3. Modify Service Requests (Complaint Ticketing)
-- ==========================================
ALTER TABLE public.pg_service_requests
  ADD COLUMN IF NOT EXISTS assigned_vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS repair_cost NUMERIC DEFAULT 0;

-- ==========================================
-- 4. Modify Rent Payments (Rent Collection Engine)
-- ==========================================
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS late_fee_applied NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_sent_count INTEGER DEFAULT 0;

-- ==========================================
-- 5. WhatsApp Communications Log (Optional helper table)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- e.g., 'rent_reminder', 'payment_ack'
  message_content TEXT,
  interakt_message_id TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can view whatsapp logs" ON public.whatsapp_logs
  FOR SELECT USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE property_id IN (
        SELECT id FROM public.properties WHERE broker_id = auth.uid()
      )
    )
  );
