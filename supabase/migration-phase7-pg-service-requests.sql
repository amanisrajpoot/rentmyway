CREATE TABLE pg_service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  broker_id UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL CHECK (category IN (
    'room_cleaning', 'laundry', 'guest_entry', 'wifi_issue',
    'food_complaint', 'water_issue', 'ac_repair', 'furniture_repair',
    'key_duplicate', 'other'
  )),
  description TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pg_service_requests ENABLE ROW LEVEL SECURITY;

-- Broker can see all requests for their properties
CREATE POLICY "Brokers see own requests" ON pg_service_requests
  FOR ALL USING (broker_id = auth.uid());

-- Tenants can see their own requests
CREATE POLICY "Tenants see own requests" ON pg_service_requests
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
  );

-- Tenants can create their own requests
CREATE POLICY "Tenants create requests" ON pg_service_requests
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE profile_id = auth.uid())
  );

-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_pg_service_requests_updated_at
  BEFORE UPDATE ON pg_service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
