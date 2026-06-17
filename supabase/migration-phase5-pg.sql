-- ============================================
-- Phase 5: PG (Paying Guest) Management Mode
-- ============================================

-- 1. Alter profiles table for pg_owner role
-- Note: PostgreSQL doesn't allow dropping constraints easily without knowing the name,
-- so we'll just allow the new role if it's not already allowed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('broker', 'owner', 'tenant', 'pg_owner'));

-- 2. PG_ROOMS
CREATE TABLE IF NOT EXISTS public.pg_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('single', 'double', 'triple', 'dormitory')),
  floor_number INTEGER,
  total_beds INTEGER NOT NULL,
  occupied_beds INTEGER DEFAULT 0,
  rent_per_bed NUMERIC NOT NULL,
  deposit_per_bed NUMERIC NOT NULL,
  amenities JSONB DEFAULT '[]'::jsonb,
  images TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pg_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage their rooms" ON public.pg_rooms
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view rooms for their property" ON public.pg_rooms
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.property_id = pg_rooms.property_id AND tenants.profile_id = auth.uid())
  );

CREATE INDEX idx_pg_rooms_property ON public.pg_rooms(property_id);

-- 3. PG_BEDS
CREATE TABLE IF NOT EXISTS public.pg_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.pg_rooms(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'reserved', 'maintenance')),
  rent_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pg_beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage their beds" ON public.pg_beds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pg_rooms WHERE pg_rooms.id = pg_beds.room_id AND pg_rooms.broker_id = auth.uid())
  );

CREATE POLICY "Tenants can view beds for their room" ON public.pg_beds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pg_rooms 
      JOIN public.tenants ON tenants.property_id = pg_rooms.property_id 
      WHERE pg_rooms.id = pg_beds.room_id AND tenants.profile_id = auth.uid()
    )
  );

CREATE INDEX idx_pg_beds_room ON public.pg_beds(room_id);
CREATE INDEX idx_pg_beds_tenant ON public.pg_beds(tenant_id);

-- 4. PG_FOOD_MENU
CREATE TABLE IF NOT EXISTS public.pg_food_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner')),
  menu_items TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, day_of_week, meal_type)
);

ALTER TABLE public.pg_food_menu ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage food menus" ON public.pg_food_menu
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view food menus for their property" ON public.pg_food_menu
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.property_id = pg_food_menu.property_id AND tenants.profile_id = auth.uid())
  );

CREATE INDEX idx_pg_food_menu_property ON public.pg_food_menu(property_id);

-- 5. PG_RULES
CREATE TABLE IF NOT EXISTS public.pg_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('entry_time', 'exit_time', 'guest_policy', 'smoking', 'alcohol', 'noise', 'food', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pg_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage PG rules" ON public.pg_rules
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view PG rules for their property" ON public.pg_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.property_id = pg_rules.property_id AND tenants.profile_id = auth.uid())
  );

CREATE INDEX idx_pg_rules_property ON public.pg_rules(property_id);

-- 6. PG_MAINTENANCE_TEAMS
CREATE TABLE IF NOT EXISTS public.pg_maintenance_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  team_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'carpentry', 'painting', 'pest_control', 'appliance', 'structural', 'cleaning', 'security', 'other')),
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pg_maintenance_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage maintenance teams" ON public.pg_maintenance_teams
  FOR ALL USING (auth.uid() = broker_id);

CREATE INDEX idx_pg_maint_teams_property ON public.pg_maintenance_teams(property_id);

-- 7. PG_NOTICE_PERIODS
CREATE TABLE IF NOT EXISTS public.pg_notice_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id),
  notice_days INTEGER NOT NULL,
  refund_policy TEXT NOT NULL CHECK (refund_policy IN ('full', 'partial', 'none')),
  refund_percentage NUMERIC,
  early_exit_penalty NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pg_notice_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers and PG Owners can manage notice periods" ON public.pg_notice_periods
  FOR ALL USING (auth.uid() = broker_id);

CREATE POLICY "Tenants can view notice periods for their property" ON public.pg_notice_periods
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.tenants WHERE tenants.property_id = pg_notice_periods.property_id AND tenants.profile_id = auth.uid())
  );

CREATE INDEX idx_pg_notice_periods_property ON public.pg_notice_periods(property_id);

-- 8. ALTER TENANTS
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS pg_bed_id UUID REFERENCES public.pg_beds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'regular' CHECK (tenant_type IN ('regular', 'pg'));

-- 9. ALTER COMPLAINTS
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS auto_delegated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delegated_team_id UUID REFERENCES public.pg_maintenance_teams(id) ON DELETE SET NULL;
