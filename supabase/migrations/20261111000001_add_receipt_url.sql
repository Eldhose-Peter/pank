-- =============================================================================
-- Migration: 20261111000001_add_receipt_url.sql
-- Description: Adds receipt_url to expenses and expense_drafts tables,
--              and sets up storage bucket for bill receipt attachments.
-- =============================================================================

-- 1. Add receipt_url column to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL;

-- 2. Add receipt_url column to expense_drafts table
ALTER TABLE public.expense_drafts
ADD COLUMN IF NOT EXISTS receipt_url TEXT DEFAULT NULL;

-- 3. Create storage bucket for receipts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies for expense-receipts bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Authenticated users can upload receipts'
  ) THEN
    CREATE POLICY "Authenticated users can upload receipts"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'expense-receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Anyone can view receipts'
  ) THEN
    CREATE POLICY "Anyone can view receipts"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'expense-receipts');
  END IF;
END $$;
