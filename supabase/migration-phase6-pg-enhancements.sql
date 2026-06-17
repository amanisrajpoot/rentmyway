-- ==============================================================================
-- RENTMYWAY SUPABASE MIGRATION - PHASE 6 (PG ENHANCEMENTS)
-- Description: Adds PG branding and granular fields to properties
-- ==============================================================================

-- 1. Add fields to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS pg_brand_name TEXT,
ADD COLUMN IF NOT EXISTS pg_logo_url TEXT,
ADD COLUMN IF NOT EXISTS pg_tagline TEXT,
ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20) DEFAULT 'coed',
ADD COLUMN IF NOT EXISTS meal_plan_included BOOLEAN DEFAULT false;

-- Note: We assume that if property_type is 'pg', gender_preference is meaningful.
-- We default it to 'coed'.
