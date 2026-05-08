-- ============================================
-- Phase 3: Business Intelligence & Automation
-- ============================================

-- 1. NOTIFICATIONS
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
  link TEXT,  -- in-app link to navigate to
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_role TEXT CHECK (target_role IN ('all','tenant','owner')),
  target_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their own announcements"
  ON public.announcements FOR ALL
  USING (auth.uid() = broker_id);

CREATE POLICY "Tenants and Owners can view announcements"
  ON public.announcements FOR SELECT
  USING (
    target_role = 'all' OR 
    (target_role = 'tenant' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'tenant')) OR
    (target_role = 'owner' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'owner'))
  );

-- 3. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Activity Log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Brokers can view activity logs for their properties"
  ON public.activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'broker'
    )
  );

-- 4. BROKER COMMISSIONS
CREATE TABLE IF NOT EXISTS public.broker_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage','fixed','one_month_rent')),
  commission_value NUMERIC NOT NULL,
  computed_amount NUMERIC NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','invoiced','received','partial')),
  received_amount NUMERIC DEFAULT 0,
  received_date DATE,
  
  deal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Broker Commissions
ALTER TABLE public.broker_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their own commissions"
  ON public.broker_commissions FOR ALL
  USING (auth.uid() = broker_id);

-- 5. BROKER EXPENSES
CREATE TABLE IF NOT EXISTS public.broker_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'marketing','advertising','travel','office','phone','internet',
    'software','printing','legal','staff_salary','other'
  )),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Broker Expenses
ALTER TABLE public.broker_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers can manage their own expenses"
  ON public.broker_expenses FOR ALL
  USING (auth.uid() = broker_id);
