-- ============================================================
-- Migration: Add owner_id to customers and sales_opportunities
-- Date: 2026-06-03
-- Purpose: Enable per-user data isolation for CRM module
-- ============================================================

-- Add owner_id to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add owner_id to sales_opportunities table  
ALTER TABLE public.sales_opportunities
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set owner_id for existing records (assign to first user, or null)
-- This is safe to run multiple times
UPDATE public.customers SET owner_id = (
  SELECT id FROM auth.users LIMIT 1
) WHERE owner_id IS NULL;

UPDATE public.sales_opportunities SET owner_id = (
  SELECT id FROM auth.users LIMIT 1
) WHERE owner_id IS NULL;

-- Make owner_id NOT NULL for new inserts (existing nulls remain until cleaned up)
ALTER TABLE public.customers ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.sales_opportunities ALTER COLUMN owner_id SET NOT NULL;
