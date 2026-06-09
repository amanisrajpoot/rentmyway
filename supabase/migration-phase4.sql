-- ============================================
-- Phase 4: Enquiries & Public Property Access
-- ============================================

-- 1. ENQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  message TEXT,
  source TEXT DEFAULT 'explore_page',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'spam')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Brokers can view/manage enquiries for their properties
CREATE POLICY "Brokers can manage their enquiries" ON public.enquiries
  FOR ALL USING (auth.uid() = broker_id);

-- Anyone can submit an enquiry (anonymous insert)
CREATE POLICY "Anyone can submit enquiry" ON public.enquiries
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_enquiries_broker ON public.enquiries(broker_id);
CREATE INDEX idx_enquiries_property ON public.enquiries(property_id);

-- 2. PUBLIC PROPERTY READ ACCESS
-- Allow anonymous users to read available properties
CREATE POLICY "Public can read available properties" ON public.properties
  FOR SELECT USING (status = 'available');
