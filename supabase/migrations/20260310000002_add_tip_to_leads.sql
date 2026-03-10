-- Add tip column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tip NUMERIC DEFAULT 0;
