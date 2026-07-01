-- ============================================
-- RentMyWay — Phase 10 Migration
-- Security Patch for RLS Spoofing
-- ============================================

-- Fix Notifications INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications for themselves" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- System-level triggers/functions operating under SECURITY DEFINER will naturally bypass this 
-- allowing the system to send notifications to users securely.


-- Fix Activity Log INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_log;

CREATE POLICY "Authenticated users can insert activity for themselves" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Done! Phase 10 migration complete.
-- ============================================
